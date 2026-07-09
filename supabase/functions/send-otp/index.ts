import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { newLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Universal test OTP — accepted everywhere. Real SMS is still attempted, but verify with 123456 always succeeds.
const MASTER_TEST_OTP = "123456";


interface OtpProvider {
  id: string;
  channel: string;
  provider_name: string;
  api_key: string;
  api_secret: string;
  sender_id: string;
  base_url: string;
  template_id: string;
  config_json: Record<string, any>;
}

// DLT-approved template:
// "DEKHOCAMPUS: Your OTP for verification is {#var#}. Valid for {#var#} minutes. Do not share this OTP with anyone."
const OTP_EXPIRY_MIN = 10;
function approvedOtpText(otp: string, expiry = OTP_EXPIRY_MIN) {
  return `DEKHOCAMPUS: Your OTP for verification is ${otp}. Valid for ${expiry} minutes. Do not share this OTP with anyone.`;
}

function normalizeIndianMobile(input: string) {
  let mobile = String(input || "").replace(/\D/g, "");
  while (mobile.startsWith("0")) mobile = mobile.slice(1);
  if (mobile.startsWith("91") && mobile.length > 10) mobile = mobile.slice(2);
  while (mobile.startsWith("0")) mobile = mobile.slice(1);
  return mobile.slice(0, 10);
}

async function hashOtp(phone: string, otp: string) {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "dekho-otp";
  const bytes = new TextEncoder().encode(`${phone}:${String(otp).trim()}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function otpExpiryMinutes(provider?: OtpProvider) {
  return clampNumber(provider?.config_json?.otp_expiry_minutes, 1, 10080, OTP_EXPIRY_MIN);
}

function clampNumber(value: any, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function fast2SmsMessage(parsed: any, fallback: string) {
  if (!parsed?.message) return fallback;
  return Array.isArray(parsed.message) ? parsed.message.join("; ") : String(parsed.message);
}

async function sendViaTwilio(provider: OtpProvider, phone: string, otp: string): Promise<boolean> {
  const accountSid = provider.api_key;
  const authToken = provider.api_secret;
  const from = provider.sender_id;
  const body = approvedOtpText(otp);

  const url = `${provider.base_url || "https://api.twilio.com"}/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, From: from, Body: body }),
  });
  return res.ok;
}

function msg91Config(provider: OtpProvider) {
  return {
    authKey: provider.api_key,
    templateId: provider.template_id || provider.config_json?.template_id || "",
    sender: provider.sender_id || provider.config_json?.sender || "",
    baseUrl: (provider.base_url || "https://control.msg91.com").replace(/\/+$/, ""),
  };
}

function msg91Mobile(phone: string) {
  // MSG91 expects digits with country code, e.g. 91XXXXXXXXXX
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

function msg91Message(parsed: any, fallback: string) {
  if (!parsed) return fallback;
  if (parsed.message && typeof parsed.message === "string") return parsed.message;
  if (parsed.message?.description) return parsed.message.description;
  return fallback;
}

async function callMSG91(authKey: string, url: string, method: string, body?: Record<string, any>) {
  const res = await fetch(url, {
    method,
    headers: {
      authkey: authKey,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* not JSON */ }
  return { res, text, parsed };
}

async function sendViaMSG91(provider: OtpProvider, phone: string, otp?: string): Promise<SendResult> {
  const { authKey, templateId, sender, baseUrl } = msg91Config(provider);
  if (!authKey) return { ok: false, detail: "MSG91 authkey (API Key) is not configured." };
  if (!templateId) return { ok: false, detail: "MSG91 template_id is not configured. Create a DLT-approved OTP template in MSG91 and paste its Template ID." };

  const mobile = msg91Mobile(phone);
  if (!/^91[6-9]\d{9}$/.test(mobile)) return { ok: false, detail: "MSG91 requires a valid 10-digit Indian mobile number." };

  const otpExpiry = clampNumber(provider.config_json?.otp_expiry_minutes, 1, 1440, 10);
  const otpLength = clampNumber(provider.config_json?.otp_length ?? otp?.length, 4, 9, 6);

  const params = new URLSearchParams({
    template_id: templateId,
    mobile,
    otp_length: String(otpLength),
    otp_expiry: String(otpExpiry),
  });
  if (sender) params.set("sender", sender);
  if (otp) params.set("otp", otp);
  // Custom variables (e.g. var1=Brand) from config_json.msg91_vars: { var1: "...", var2: "..." }
  const vars = provider.config_json?.msg91_vars || {};
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "string" || typeof v === "number") params.set(k, String(v));
  }

  try {
    const { res, text, parsed } = await callMSG91(authKey, `${baseUrl}/api/v5/otp?${params.toString()}`, "POST", {});
    console.log("MSG91 send response:", res.status, text.slice(0, 400));
    const ok = res.ok && String(parsed?.type || "").toLowerCase() === "success";
    if (ok) return { ok: true, transactionId: parsed.request_id, detail: msg91Message(parsed, "OTP sent successfully"), raw: parsed };
    return { ok: false, detail: msg91Message(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("MSG91 send error:", e);
    return { ok: false, detail: `Network error reaching MSG91: ${e?.message || e}` };
  }
}

async function verifyViaMSG91(provider: OtpProvider, phone: string, otp: string): Promise<SendResult> {
  const { authKey, baseUrl } = msg91Config(provider);
  if (!authKey) return { ok: false, detail: "MSG91 authkey (API Key) is not configured." };
  const mobile = msg91Mobile(phone);
  if (!/^91[6-9]\d{9}$/.test(mobile) || !otp) return { ok: false, detail: "mobile and otp are required for MSG91 verification." };

  const params = new URLSearchParams({ mobile, otp });
  try {
    const { res, text, parsed } = await callMSG91(authKey, `${baseUrl}/api/v5/otp/verify?${params.toString()}`, "GET");
    console.log("MSG91 verify response:", res.status, text.slice(0, 400));
    const ok = res.ok && String(parsed?.type || "").toLowerCase() === "success";
    return { ok, verified: ok, detail: msg91Message(parsed, ok ? "OTP verified successfully" : `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("MSG91 verify error:", e);
    return { ok: false, verified: false, detail: `Network error reaching MSG91: ${e?.message || e}` };
  }
}

async function resendViaMSG91(provider: OtpProvider, phone: string): Promise<SendResult> {
  const { authKey, baseUrl } = msg91Config(provider);
  if (!authKey) return { ok: false, detail: "MSG91 authkey (API Key) is not configured." };
  const mobile = msg91Mobile(phone);
  if (!/^91[6-9]\d{9}$/.test(mobile)) return { ok: false, detail: "MSG91 requires a valid 10-digit Indian mobile number." };
  // retrytype: text | voice
  const retrytype = String(provider.config_json?.msg91_retrytype || "text").toLowerCase();

  const params = new URLSearchParams({ mobile, retrytype });
  try {
    const { res, text, parsed } = await callMSG91(authKey, `${baseUrl}/api/v5/otp/retry?${params.toString()}`, "GET");
    console.log("MSG91 resend response:", res.status, text.slice(0, 400));
    const ok = res.ok && String(parsed?.type || "").toLowerCase() === "success";
    if (ok) return { ok: true, transactionId: parsed.request_id, detail: msg91Message(parsed, "OTP resent successfully"), raw: parsed };
    return { ok: false, detail: msg91Message(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("MSG91 resend error:", e);
    return { ok: false, detail: `Network error reaching MSG91: ${e?.message || e}` };
  }
}

async function sendViaGupshup(provider: OtpProvider, phone: string, otp: string, channel: string): Promise<boolean> {
  const message = approvedOtpText(otp);

  if (channel === "whatsapp") {
    const url = `${provider.base_url || "https://api.gupshup.io"}/wa/api/v1/msg`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        channel: "whatsapp",
        source: provider.sender_id,
        destination: phone.replace("+", ""),
        "src.name": provider.config_json?.app_name || "DekhoCampus",
        message: JSON.stringify({
          type: "text",
          text: message,
        }),
        apikey: provider.api_key,
      }),
    });
    return res.ok;
  }

  // SMS via Gupshup
  const url = `${provider.base_url || "https://enterprise.smsgupshup.com"}/GatewayAPI/rest`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      method: "SendMessage",
      send_to: phone.replace("+", ""),
      msg: message,
      msg_type: "TEXT",
      userid: provider.api_key,
      auth_scheme: "plain",
      password: provider.api_secret,
      v: "1.1",
      format: "text",
    }),
  });
  return res.ok;
}

interface SendResult { ok: boolean; detail?: string; transactionId?: string | number; verified?: boolean; raw?: any }

async function storeOtpSession(supabase: any, phone: string, otp: string, provider: OtpProvider, result: any) {
  const mobile = normalizeIndianMobile(phone);
  const expiry = otpExpiryMinutes(provider);
  const maxAttempts = clampNumber(provider.config_json?.max_verify_attempts, 1, 100, 5);
  await supabase
    .from("otp_sessions")
    .update({ delivery_status: "superseded", updated_at: new Date().toISOString() })
    .eq("phone", mobile)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString());

  const { error } = await supabase.from("otp_sessions").insert({
    phone: mobile,
    otp_hash: await hashOtp(mobile, otp),
    channel: "sms",
    provider_name: provider.provider_name,
    expires_at: new Date(Date.now() + expiry * 60 * 1000).toISOString(),
    max_attempts: maxAttempts,
    delivery_status: result?.success ? "sent" : "failed",
    transaction_id: result?.transactionId ? String(result.transactionId) : null,
  });
  if (error) console.error("OTP session insert failed:", error.message);
}

async function verifyStoredOtp(supabase: any, phone: string, otp: string): Promise<SendResult> {
  const mobile = normalizeIndianMobile(phone);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("otp_sessions")
    .select("id, otp_hash, attempts, max_attempts, expires_at")
    .eq("phone", mobile)
    .eq("delivery_status", "sent")
    .is("consumed_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false, verified: false, detail: error.message };
  if (!data) return { ok: false, verified: false, detail: "OTP expired or not found. Please request a new OTP." };
  if (Number(data.attempts || 0) >= Number(data.max_attempts || 5)) return { ok: false, verified: false, detail: "Too many incorrect attempts. Please request a new OTP." };

  const expected = await hashOtp(mobile, otp);
  if (expected !== data.otp_hash) {
    await supabase.from("otp_sessions").update({ attempts: Number(data.attempts || 0) + 1 }).eq("id", data.id);
    return { ok: false, verified: false, detail: "Incorrect OTP" };
  }

  await supabase.from("otp_sessions").update({ consumed_at: now, attempts: Number(data.attempts || 0) + 1 }).eq("id", data.id);
  return { ok: true, verified: true, detail: "OTP verified successfully" };
}

async function sendViaAquarite(provider: OtpProvider, phone: string, otp: string): Promise<SendResult> {
  // Spec: {base_url}/fe/api/v1/send?username=&password=&unicode=false&from=&to=&text=&templateId=&dltContentId=
  const baseUrl = (provider.base_url || "").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, detail: "Aquarite base_url not configured. Set it to the API host from your panel's HTTP API page." };

  const senderId = provider.sender_id || "";
  const templateId = provider.template_id || provider.config_json?.template_id || "";
  const dltContentId = provider.config_json?.dlt_content_id || "";
  const expiryMin = String(provider.config_json?.otp_expiry_minutes ?? 10);
  const textTemplate: string =
    provider.config_json?.text_template ||
    `DEKHOCAMPUS: Your OTP for verification is {{otp}}. Valid for {{expiry}} minutes. Do not share this OTP with anyone.`;
  const text = textTemplate.replace(/\{\{?otp\}?\}/gi, otp).replace(/\{\{?expiry\}?\}/gi, expiryMin);

  const to = phone.replace(/^\+?/, "").replace(/^0+/, "");
  const toWithCc = to.length === 10 ? `91${to}` : to;

  const params = new URLSearchParams({
    username: provider.api_key,
    password: provider.api_secret,
    unicode: "false",
    from: senderId,
    to: toWithCc,
    text,
  });
  if (templateId) params.set("templateId", templateId);
  if (dltContentId) params.set("dltContentId", dltContentId);

  const url = `${baseUrl}/fe/api/v1/send?${params.toString()}`;
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const body = await res.text();
    console.log("Aquarite response:", res.status, body.slice(0, 400));

    // Parse JSON success response per spec: {"transactionId":..., "state":"SUBMIT_ACCEPTED", ...}
    let parsed: any = null;
    try { parsed = JSON.parse(body); } catch { /* not JSON */ }

    if (parsed && /SUBMIT_ACCEPTED/i.test(parsed.state || "")) {
      return { ok: true, transactionId: parsed.transactionId, detail: parsed.description };
    }
    if (parsed?.description || parsed?.state) {
      return { ok: false, detail: `${parsed.state || "ERROR"}: ${parsed.description || JSON.stringify(parsed)}` };
    }
    if (res.status === 404) {
      return { ok: false, detail: `Aquarite endpoint not found at ${baseUrl}/fe/api/v1/send. Check Base URL in admin — it must be the host from your Aquarite panel's HTTP API page (not nimbusit.biz).` };
    }
    // Known plain-text errors from spec
    if (/Authentication\s*failure/i.test(body)) return { ok: false, detail: "Authentication failure — invalid username/password or expired account." };
    if (/INVALID_SOURCE_ADDRESS/i.test(body)) return { ok: false, detail: "Invalid Sender ID — must be 6 alpha chars, no special characters." };
    if (/5001/.test(body)) return { ok: false, detail: "5001: Template ID missing or not approved." };
    if (/6001/.test(body)) return { ok: false, detail: "6001: Insufficient balance in SMS account." };
    return { ok: false, detail: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  } catch (e: any) {
    console.error("Aquarite request error:", e);
    return { ok: false, detail: `Network error reaching ${baseUrl}: ${e?.message || e}` };
  }
}


function fast2SmsConfig(provider: OtpProvider) {
  return {
    apiKey: provider.api_key,
    otpId: provider.template_id || provider.config_json?.otp_id || "",
    baseUrl: (provider.base_url || "https://www.fast2sms.com").replace(/\/+$/, ""),
  };
}

function normalizeDltTemplateText(text: string) {
  return String(text || "")
    .replace(/\{\{\s*otp\s*\}\}/gi, "{#VAR#}")
    .replace(/\{\{\s*(expiry|time|minutes|time_to_exhaust)\s*\}\}/gi, "{#VAR#}")
    .replace(/\{#\s*var\s*#\}/gi, "{#VAR#}")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function resolveFast2SMSDltMessageId(provider: OtpProvider, expectedVarCount: number): Promise<SendResult> {
  const { apiKey, baseUrl } = fast2SmsConfig(provider);
  const explicit = String(provider.config_json?.message_id || provider.config_json?.fast2sms_message_id || "").trim();
  if (explicit) return { ok: true, transactionId: explicit };

  const templateId = String(provider.template_id || "").trim();
  if (/^\d{1,10}$/.test(templateId)) return { ok: true, transactionId: templateId };

  const senderId = String(provider.sender_id || provider.config_json?.sender_id || "DKCMPS").trim().toUpperCase();
  const expectedText = normalizeDltTemplateText(
    provider.config_json?.text_template ||
    "DEKHOCAMPUS: Your OTP for verification is {{otp}}. Valid for {{expiry}} minutes. Do not share this OTP with anyone.",
  );

  try {
    const params = new URLSearchParams({ authorization: apiKey, type: "template" });
    const res = await fetch(`${baseUrl}/dev/dlt_manager?${params.toString()}`, {
      headers: { accept: "application/json", "user-agent": "DekhoCampus/1.0" },
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok || parsed?.success !== true) {
      return { ok: false, detail: fast2SmsMessage(parsed, `Could not fetch Fast2SMS DLT templates: HTTP ${res.status}`), raw: parsed };
    }

    const senderRows = Array.isArray(parsed?.data) ? parsed.data : [];
    const matchingSender = senderRows.find((row: any) => String(row?.sender_id || "").toUpperCase() === senderId) || senderRows[0];
    const templates = Array.isArray(matchingSender?.templates) ? matchingSender.templates : [];
    const approved = templates.filter((tpl: any) => /approved/i.test(String(tpl?.status || "")));
    const exact = approved.find((tpl: any) => Number(tpl?.var_count || 0) === expectedVarCount && normalizeDltTemplateText(tpl?.message || "") === expectedText);
    const byVarCount = approved.find((tpl: any) => Number(tpl?.var_count || 0) === expectedVarCount);
    const chosen = exact || byVarCount || approved[0];
    if (chosen?.message_id) return { ok: true, transactionId: String(chosen.message_id), raw: chosen };
    return { ok: false, detail: `No approved Fast2SMS DLT template found for sender ${senderId} with ${expectedVarCount} variables.`, raw: parsed };
  } catch (e: any) {
    return { ok: false, detail: `Could not resolve Fast2SMS DLT Message ID: ${e?.message || e}` };
  }
}

async function callFast2SMS(provider: OtpProvider, path: string, body?: Record<string, any>, method = "POST"): Promise<{ res: Response; text: string; parsed: any }> {
  const { apiKey, baseUrl } = fast2SmsConfig(provider);
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "authorization": apiKey,
      "accept": "application/json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* not JSON */ }
  return { res, text, parsed };
}

async function sendViaFast2SMS(provider: OtpProvider, phone: string, otp?: string): Promise<SendResult> {
  const { apiKey, otpId } = fast2SmsConfig(provider);
  if (!apiKey) return { ok: false, detail: "Fast2SMS api_key (authorization) is not configured." };

  const mobile = normalizeIndianMobile(phone);
  if (!/^[0-9]{10}$/.test(mobile)) return { ok: false, detail: "Fast2SMS requires a valid 10-digit Indian mobile number." };

  // Default to Fast2SMS OTP route — works 24×7, no DLT/template, no 6pm cutoff.
  // Docs: https://docs.fast2sms.com/reference/send-otp
  const route = String(provider.config_json?.fast2sms_route || provider.config_json?.route || "otp").toLowerCase();

  if (route === "otp") {
    const r = await sendViaFast2SMSOtpRoute(provider, mobile, otp || MASTER_TEST_OTP);
    if (r.ok) return r;
    // Optional fallback to DLT only when admin enables it
    if (provider.config_json?.otp_fallback_to_dlt === true) {
      return sendViaFast2SMSDLT(provider, mobile, otp || MASTER_TEST_OTP);
    }
    return r;
  }

  if (route === "q" || route === "quick") {
    if (provider.config_json?.quick_enabled === true) {
      const quick = await sendViaFast2SMSQuick(provider, mobile, otp || MASTER_TEST_OTP);
      if (quick.ok || provider.config_json?.quick_fallback_to_dlt === false) return quick;
    }
    return sendViaFast2SMSDLT(provider, mobile, otp || MASTER_TEST_OTP);
  }

  if (!otpId || route === "dlt" || route === "dlt_manual") {
    return sendViaFast2SMSDLT(provider, mobile, otp || MASTER_TEST_OTP);
  }

  const otpExpiry = clampNumber(provider.config_json?.otp_expiry_minutes, 1, 10080, 15);
  const otpLength = clampNumber(provider.config_json?.otp_length ?? otp?.length, 4, 10, 6);
  const variablesValues = provider.config_json?.variables_values || (otp ? `${otp}|${otpExpiry}` : undefined);
  const body: Record<string, any> = { mobile, otp_id: otpId, otp_expiry: otpExpiry, otp_length: otpLength };
  if (otp) body.otp = otp;
  if (variablesValues) body.variables_values = variablesValues;

  try {
    const { res, text, parsed } = await callFast2SMS(provider, "/dev/otp/send", body);
    console.log("Fast2SMS send response:", res.status, text.slice(0, 400));
    if (res.ok && parsed?.return === true) {
      return { ok: true, transactionId: parsed.request_id, detail: fast2SmsMessage(parsed, "OTP sent successfully"), raw: parsed };
    }
    if (/Invalid OTP ID/i.test(fast2SmsMessage(parsed, text))) {
      return sendViaFast2SMSDLT(provider, mobile, otp || MASTER_TEST_OTP);
    }
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("Fast2SMS send error:", e);
    return { ok: false, detail: `Network error reaching Fast2SMS: ${e?.message || e}` };
  }
}
// Fast2SMS dedicated OTP route — works 24×7, no DLT, no time restrictions.
// POST https://www.fast2sms.com/dev/bulkV2 { authorization, route: "otp", variables_values: OTP, numbers }
// Sends: "Your OTP: <otp>"
async function sendViaFast2SMSOtpRoute(provider: OtpProvider, mobile: string, otp: string): Promise<SendResult> {
  const { apiKey } = fast2SmsConfig(provider);
  if (!apiKey) return { ok: false, detail: "Fast2SMS api_key (authorization) is not configured." };
  try {
    const { res, text, parsed } = await callFast2SMS(provider, "/dev/bulkV2", {
      route: "otp",
      variables_values: String(otp),
      numbers: mobile,
    });
    console.log("Fast2SMS OTP-route response:", res.status, text.slice(0, 400));
    if (res.ok && parsed?.return === true) {
      return { ok: true, transactionId: parsed.request_id, detail: fast2SmsMessage(parsed, "OTP sent via Fast2SMS OTP route"), raw: parsed };
    }
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("Fast2SMS OTP-route error:", e);
    return { ok: false, detail: `Network error reaching Fast2SMS OTP route: ${e?.message || e}` };
  }
}


async function sendViaFast2SMSQuick(provider: OtpProvider, mobile: string, otp: string): Promise<SendResult> {
  const { apiKey, baseUrl } = fast2SmsConfig(provider);
  const expiryMin = String(provider.config_json?.otp_expiry_minutes || OTP_EXPIRY_MIN);
  const textTemplate: string =
    provider.config_json?.quick_text_template ||
    provider.config_json?.text_template ||
    "DEKHOCAMPUS: Your OTP for verification is {{otp}}. Valid for {{expiry}} minutes. Do not share this OTP with anyone.";
  const message = textTemplate
    .replace(/\{\{\s*(otp|code)\s*\}\}/gi, otp)
    .replace(/\{\{\s*(expiry|time|minutes|time_to_exhaust)\s*\}\}/gi, expiryMin);

  try {
    const { res, text, parsed } = await callFast2SMS(provider, "/dev/bulkV2", {
      route: "q",
      numbers: mobile,
      message,
      flash: String(provider.config_json?.flash || "0"),
      sms_details: "1",
    });
    console.log("Fast2SMS Quick response:", res.status, text.slice(0, 400));
    if (res.ok && parsed?.return === true) return { ok: true, transactionId: parsed.request_id, detail: fast2SmsMessage(parsed, "OTP sent by Fast2SMS Quick"), raw: parsed };
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("Fast2SMS Quick send error:", e);
    return { ok: false, detail: `Network error reaching Fast2SMS Quick: ${e?.message || e}` };
  }
}

async function sendViaFast2SMSDLT(provider: OtpProvider, mobile: string, otp: string): Promise<SendResult> {
  const { apiKey, baseUrl } = fast2SmsConfig(provider);
  const hasManualDltIds = Boolean(provider.config_json?.dlt_content_id && provider.config_json?.dlt_entity_id);
  const route = String(provider.config_json?.route || (hasManualDltIds ? "dlt_manual" : provider.config_json?.fast2sms_route) || "dlt");
  const expiryMin = String(provider.config_json?.otp_expiry_minutes || OTP_EXPIRY_MIN);
  const textTemplate: string =
    provider.config_json?.text_template ||
    "DEKHOCAMPUS: Your OTP for verification is {{otp}}. Valid for {{expiry}} minutes. Do not share this OTP with anyone.";
  const approvedMessage = textTemplate
    .replace(/\{\{\s*(otp|code)\s*\}\}/gi, otp)
    .replace(/\{\{\s*(expiry|time|minutes|time_to_exhaust)\s*\}\}/gi, expiryMin);
  // Variable mapping — admin defines the order of {#var#} placeholders in their DLT template.
  // Supported tokens: "otp", "expiry". Default = otp|expiry (matches DEKHOCAMPUS template).
  const tokenMap: Record<string, string> = { otp, expiry: expiryMin, time: expiryMin, minutes: expiryMin };
  const order: string[] = Array.isArray(provider.config_json?.variables_order) && provider.config_json.variables_order.length
    ? provider.config_json.variables_order
    : ["otp", "expiry"];
  const built = order.map((t) => tokenMap[String(t).toLowerCase()] ?? "").join("|");
  const variablesValues = String(provider.config_json?.variables_values || built);
  const useManualDlt = route === "dlt_manual";
  const resolvedMessage = useManualDlt ? null : await resolveFast2SMSDltMessageId(provider, order.length || 2);
  if (!useManualDlt && (!resolvedMessage?.ok || !resolvedMessage.transactionId)) return resolvedMessage || { ok: false, detail: "Fast2SMS DLT message/template ID is not configured." };
  const messageId = String(resolvedMessage?.transactionId || "");
  const body: Record<string, string> = {
    route,
    numbers: mobile,
    message: useManualDlt ? approvedMessage : messageId,
    sender_id: provider.sender_id || provider.config_json?.sender_id || "DKCMPS",
    sms_details: String(provider.config_json?.sms_details || "1"),
  };
  if (useManualDlt) {
    body.template_id = String(provider.config_json?.dlt_content_id || provider.template_id || "");
    body.entity_id = String(provider.config_json?.dlt_entity_id || "");
  } else {
    body.variables_values = variablesValues;
    body.flash = String(provider.config_json?.flash || "0");
  }
  if (!body.message) return { ok: false, detail: "Fast2SMS DLT message/template ID is not configured." };
  if (!body.sender_id) return { ok: false, detail: "Fast2SMS sender_id is not configured." };


  try {
    const res = await fetch(`${baseUrl}/dev/bulkV2`, {
      method: "POST",
      headers: { authorization: apiKey, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    console.log("Fast2SMS DLT request:", { route: body.route, sender_id: body.sender_id, message: useManualDlt ? "manual_dlt_text" : body.message, variables_count: useManualDlt ? undefined : variablesValues.split("|").length, mobile: mobile.replace(/^(\d{2})\d+(\d{2})$/, "$1******$2") });
    console.log("Fast2SMS DLT response:", res.status, text.slice(0, 400));
    if (res.ok && parsed?.return === true) return { ok: true, transactionId: parsed.request_id, detail: fast2SmsMessage(parsed, "OTP sent successfully"), raw: parsed };
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("Fast2SMS DLT send error:", e);
    return { ok: false, detail: `Network error reaching Fast2SMS DLT: ${e?.message || e}` };
  }
}

async function verifyViaFast2SMS(provider: OtpProvider, phone: string, otp: string): Promise<SendResult> {
  const { apiKey } = fast2SmsConfig(provider);
  if (!apiKey) return { ok: false, detail: "Fast2SMS api_key (authorization) is not configured." };
  const mobile = normalizeIndianMobile(phone);
  if (!/^[0-9]{10}$/.test(mobile) || !otp) return { ok: false, detail: "mobile and otp are required for Fast2SMS verification." };

  try {
    const { res, text, parsed } = await callFast2SMS(provider, "/dev/otp/verify", { mobile, otp });
    console.log("Fast2SMS verify response:", res.status, text.slice(0, 400));
    const ok = res.ok && parsed?.return === true;
    return { ok, verified: ok, detail: fast2SmsMessage(parsed, ok ? "OTP verified successfully" : `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("Fast2SMS verify error:", e);
    return { ok: false, verified: false, detail: `Network error reaching Fast2SMS: ${e?.message || e}` };
  }
}

async function resendViaFast2SMS(provider: OtpProvider, phone: string): Promise<SendResult> {
  const { apiKey } = fast2SmsConfig(provider);
  if (!apiKey) return { ok: false, detail: "Fast2SMS api_key (authorization) is not configured." };
  const mobile = normalizeIndianMobile(phone);
  if (!/^[0-9]{10}$/.test(mobile)) return { ok: false, detail: "Fast2SMS requires a valid 10-digit Indian mobile number." };

  try {
    const { res, text, parsed } = await callFast2SMS(provider, "/dev/otp/resend", { mobile });
    console.log("Fast2SMS resend response:", res.status, text.slice(0, 400));
    if (res.ok && parsed?.return === true) {
      return { ok: true, transactionId: parsed.request_id, detail: fast2SmsMessage(parsed, "OTP resent successfully"), raw: parsed };
    }
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("Fast2SMS resend error:", e);
    return { ok: false, detail: `Network error reaching Fast2SMS: ${e?.message || e}` };
  }
}

async function sendViaFast2SMSWhatsApp(provider: OtpProvider, phone: string, otp: string): Promise<SendResult> {
  const { apiKey, baseUrl } = fast2SmsConfig(provider);
  if (!apiKey) return { ok: false, detail: "Fast2SMS api_key (authorization) is not configured." };
  const version = String(provider.config_json?.version || "v24.0");
  const phoneNumberId = String(provider.config_json?.phone_number_id || "").trim();
  const templateName = String(provider.config_json?.template_name || provider.config_json?.whatsapp_template_name || "").trim();
  const langCode = String(provider.config_json?.language_code || "en");
  if (!phoneNumberId) return { ok: false, detail: "Fast2SMS WhatsApp phone_number_id is not configured (config_json.phone_number_id)." };
  if (!templateName) return { ok: false, detail: "Fast2SMS WhatsApp template_name is not configured (config_json.template_name)." };

  const mobile = normalizeIndianMobile(phone);
  if (!/^[0-9]{10}$/.test(mobile)) return { ok: false, detail: "Fast2SMS WhatsApp requires a valid 10-digit Indian mobile number." };
  const to = `91${mobile}`;

  // Template body has 5 placeholders in order: {{code}} {{text}} {{text}} {{phone}} {{phone}}
  //   1. OTP code
  //   2. Purpose / context (e.g. "DekhoCampus verification")
  //   3. Validity window (e.g. "10 minutes")
  //   4. Support phone number
  //   5. Support contact phone number
  // Admin can override any of these via config_json.template_params (array of 5 strings)
  // or individually via config_json.purpose / validity / support_phone.
  const cfg = provider.config_json || {};
  const purpose = String(cfg.purpose || "DekhoCampus verification");
  const validity = String(cfg.validity || "10 minutes");
  const supportPhone = String(cfg.support_phone || "+91 8010321712");
  const defaultParams = [otp, purpose, validity, supportPhone, supportPhone];
  const params: string[] = Array.isArray(cfg.template_params) && cfg.template_params.length === 5
    ? cfg.template_params.map((v: any, i: number) => String(v ?? "").replace(/\{\{code\}\}/gi, otp) || defaultParams[i])
    : defaultParams;

  const body: Record<string, any> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: langCode },
      components: [
        { type: "body", parameters: params.map((text) => ({ type: "text", text })) },
      ],
    },
  };
  // Optional Copy-Code button (only for AUTHENTICATION templates). Enable via config_json.has_copy_code_button = true.
  if (cfg.has_copy_code_button) {
    body.template.components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] });
  }

  const url = `${baseUrl}/dev/whatsapp/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: apiKey, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    console.log("Fast2SMS WhatsApp response:", res.status, text.slice(0, 400));
    const okMsg = parsed && (Array.isArray(parsed?.messages) || parsed?.success === true || parsed?.return === true);
    if (res.ok && okMsg) {
      const id = parsed?.messages?.[0]?.id || parsed?.request_id;
      return { ok: true, transactionId: id, detail: "WhatsApp template sent", raw: parsed };
    }
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    console.error("Fast2SMS WhatsApp error:", e);
    return { ok: false, detail: `Network error reaching Fast2SMS WhatsApp: ${e?.message || e}` };
  }
}

async function getFast2SMSWhatsAppDetails(provider: OtpProvider, type = "number", phoneNumberId = ""): Promise<SendResult> {
  const { apiKey, baseUrl } = fast2SmsConfig(provider);
  if (!apiKey) return { ok: false, detail: "Fast2SMS api_key (authorization) is not configured." };
  const params = new URLSearchParams({ authorization: apiKey, type });
  if (phoneNumberId) params.set("phone_number_id", phoneNumberId);
  try {
    const res = await fetch(`${baseUrl}/dev/dlt_manager/whatsapp?${params.toString()}`, { headers: { accept: "application/json" } });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    if (res.ok && (parsed?.success === true || parsed?.success === "true")) return { ok: true, detail: "WhatsApp details loaded", raw: parsed };
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    return { ok: false, detail: `Network error reaching Fast2SMS: ${e?.message || e}` };
  }
}

async function getFast2SMSPhoneNumbers(provider: OtpProvider, version = "v24.0", wabaId = ""): Promise<SendResult> {
  const { apiKey, baseUrl } = fast2SmsConfig(provider);
  if (!apiKey) return { ok: false, detail: "Fast2SMS api_key (authorization) is not configured." };
  if (!wabaId) return { ok: false, detail: "WABA ID is required." };
  const params = new URLSearchParams({ authorization: apiKey });
  try {
    const res = await fetch(`${baseUrl}/dev/whatsapp/${encodeURIComponent(version)}/${encodeURIComponent(wabaId)}/phone_numbers?${params.toString()}`, { headers: { accept: "application/json" } });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }
    if (res.ok) return { ok: true, detail: "Phone numbers loaded", raw: parsed };
    return { ok: false, detail: fast2SmsMessage(parsed, `HTTP ${res.status}: ${text.slice(0, 200)}`), raw: parsed };
  } catch (e: any) {
    return { ok: false, detail: `Network error reaching Fast2SMS: ${e?.message || e}` };
  }
}

async function sendViaCustom(provider: OtpProvider, phone: string, otp: string): Promise<boolean> {
  const url = provider.base_url;
  if (!url) return false;

  const body = {
    phone: phone.replace("+", ""),
    otp,
    sender_id: provider.sender_id,
    template_id: provider.template_id,
    ...provider.config_json,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (provider.api_key) headers["Authorization"] = `Bearer ${provider.api_key}`;
  if (provider.api_key) headers["apikey"] = provider.api_key;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, otp, action = "send", provider_name, type, phone_number_id, version, waba_id } = body;
    let { channel = "sms" } = body;

    const log = newLogger("send-otp");
    await log.info("serve", "Request received", { action, channel_requested: channel, has_phone: !!phone });

    // 🚫 WHATSAPP TEMPORARILY DISABLED — force every request to SMS regardless of caller input.
    if (channel !== "sms") {
      await log.warn("serve", `Channel '${channel}' is disabled; forcing SMS`, { original_channel: channel });
      channel = "sms";
    }

    if (["send", "verify", "resend"].includes(action) && !phone) {
      await log.warn("serve", "Missing phone", { action });
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "verify" && !otp) {
      return new Response(JSON.stringify({ error: "otp is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔑 Universal master test OTP — 123456 always verifies, no provider call required.
    if (action === "verify" && String(otp).trim() === MASTER_TEST_OTP) {
      await log.info("verify", "Master test OTP accepted", { phone_masked: String(phone).slice(-4) });
      return new Response(JSON.stringify({ success: true, verified: true, master_test: true, results: [{ provider: "master_test", success: true, verified: true }] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "verify") {
      const stored = await verifyStoredOtp(supabase, phone, otp);
      if (stored.verified) {
        await log.info("verify", "Stored OTP accepted", { phone_masked: String(phone).slice(-4) });
        return new Response(JSON.stringify({ success: true, verified: true, results: [{ provider: "stored_otp", success: true, verified: true }] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await log.warn("verify", "Stored OTP not verified; falling back to provider check", { detail: stored.detail });
    }

    // 🛑 Global kill switch: lead_form_settings.otp_mode = 'off' silently skips real SMS sends.
    // Verification still works via the universal 123456 master test code.
    if (action === "send" || action === "resend") {
      try {
        const { data: lfs } = await supabase
          .from("lead_form_settings")
          .select("otp_mode")
          .eq("singleton", true)
          .maybeSingle();
        if (lfs?.otp_mode === "off") {
          await log.warn("serve", "OTP delivery disabled by admin (otp_mode=off)");
          return new Response(JSON.stringify({
            success: true,
            skipped: true,
            reason: "sms_otp_disabled_by_admin",
            results: [{ provider: "disabled", success: true, skipped: true }],
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (_) { /* fall through and attempt send */ }
    }


    // WhatsApp is disabled — only ever query SMS providers.
    let channels = ["sms"];
    await log.info("serve", "Loading SMS providers", { channels });


    let { data: providers, error } = await supabase
      .from("otp_providers")
      .select("*")
      .in("channel", channels)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if ((!providers?.length || error) && !channels.includes("sms")) {
      const fallback = await supabase
        .from("otp_providers")
        .select("*")
        .eq("channel", "sms")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (!fallback.error && fallback.data?.length) {
        channels = ["sms"];
        providers = fallback.data;
        error = null;
      }
    }

    if (provider_name) {
      providers = providers?.filter((p: OtpProvider) => p.provider_name?.toLowerCase() === String(provider_name).toLowerCase()) as any;
    }

    if (error || !providers?.length) {
      console.error("No active OTP provider found for channels:", channels);
      return new Response(JSON.stringify({
        error: `No active OTP provider configured for ${channels.join(" / ").toUpperCase()}. Please configure one in Admin → Overview.`,
        fallback: true,
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateProviders: OtpProvider[] = [...(providers as OtpProvider[])];

    const byChannel = new Map<string, OtpProvider[]>();
    for (const p of candidateProviders) {
      const list = byChannel.get(p.channel) || [];
      list.push(p);
      byChannel.set(p.channel, list);
    }

    const runProvider = async (provider: OtpProvider) => {
        const plog = log.child(`provider:${provider.provider_name}`);
        await plog.info("runProvider", "Start", { channel: provider.channel, action });
        let res: SendResult = { ok: false, detail: "Unknown error" };
        try {
          const name = provider.provider_name.toLowerCase();
          if (action === "verify") {
            if (name === "fast2sms") res = await verifyViaFast2SMS(provider, phone, otp);
            else if (name === "msg91") res = await verifyViaMSG91(provider, phone, otp);
            else res = { ok: false, detail: `${provider.provider_name} verification endpoint is not implemented.` };
          } else if (action === "resend") {
            if (name === "fast2sms") res = await resendViaFast2SMS(provider, phone);
            else if (name === "msg91") res = await resendViaMSG91(provider, phone);
            else res = { ok: false, detail: `${provider.provider_name} resend endpoint is not implemented.` };
          } else if (action === "whatsapp-details" || action === "phone-numbers") {
            await plog.warn("runProvider", "WhatsApp-related action blocked (whatsapp disabled)");
            res = { ok: false, detail: "WhatsApp is temporarily disabled." };
          } else {
            switch (name) {
              case "twilio":   res = { ok: await sendViaTwilio(provider, phone, otp) }; break;
              case "msg91":    res = await sendViaMSG91(provider, phone, otp); break;
              case "gupshup":  res = { ok: await sendViaGupshup(provider, phone, otp, "sms") }; break;
              case "aquarite":
              case "nimbusit": res = await sendViaAquarite(provider, phone, otp); break;
              case "fast2sms":
                // WhatsApp disabled — always use SMS path even if provider row says whatsapp.
                res = await sendViaFast2SMS(provider, phone, otp);
                break;
              default:         res = { ok: await sendViaCustom(provider, phone, otp) };
            }
          }
        } catch (e: any) {
          await plog.error("runProvider", "Provider threw", { error: e?.message || String(e) });
          res = { ok: false, detail: e?.message || String(e) };
        }
        await plog[res.ok ? "info" : "warn"]("runProvider", res.ok ? "Success" : "Failed", { detail: res.detail, transactionId: res.transactionId });
        return { channel: provider.channel, provider: provider.provider_name, success: res.ok, detail: res.detail, transactionId: res.transactionId, verified: res.verified, data: res.raw?.data, raw: res.raw };
    };

    const results = (
      await Promise.all(
        Array.from(byChannel.values()).map(async (channelProviders) => {
          const channelResults = [];
          for (const provider of channelProviders) {
            const result = await runProvider(provider);
            channelResults.push(result);
            if (result.success) break;
          }
          return channelResults;
        })
      )
    ).flat();

    const anyOk = results.some((r) => r.success);
    if (!anyOk) {
      const detail = results.map((r) => `${r.provider}: ${r.detail || "failed"}`).join(" | ");
      await log.error("serve", "All providers failed", { detail });
      return new Response(JSON.stringify({ error: detail || "OTP delivery failed", fallback: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((action === "send" || action === "resend") && otp) {
      const successfulSms = results.find((r) => r.success && r.channel === "sms");
      const provider = candidateProviders.find((p) => p.provider_name === successfulSms?.provider && p.channel === "sms") || candidateProviders[0];
      if (successfulSms && provider) await storeOtpSession(supabase, phone, otp, provider, successfulSms);
    }

    await log.info("serve", "Completed", { action, success: true });
    return new Response(JSON.stringify({ success: true, verified: action === "verify" ? results.some((r) => r.verified) : undefined, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-otp error:", error);
    try { await newLogger("send-otp").error("serve", "Unhandled error", { error: error?.message || String(error) }); } catch (_) {}
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

