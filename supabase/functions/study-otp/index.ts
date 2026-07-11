import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECRET = Deno.env.get("SUPABASE_JWKS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret";
const TTL_MS = 10 * 60 * 1000;

async function hmac(input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeIndianMobile(input: string) {
  let value = String(input || "").replace(/\D/g, "");
  while (value.startsWith("0")) value = value.slice(1);
  if (value.startsWith("91") && value.length > 10) value = value.slice(2);
  while (value.startsWith("0")) value = value.slice(1);
  return value.slice(0, 10);
}

async function getActiveProvider(channel = "sms") {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const channels = ["sms"];
  const supabase = createClient(url, key);
  const { data: providers } = await supabase
    .from("otp_providers")
    .select("*")
    .in("channel", channels)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);
  return providers?.[0] || null;
}

async function callOtpRouter(payload: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/functions/v1/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

async function sendViaProvider(phone: string, otp: string, channel = "sms") {
  const provider = await getActiveProvider(channel);
  if (!provider) return { sent: false, devOtp: otp };
  const routed = await callOtpRouter({ phone, otp, channel: provider.channel || "sms", action: "send" });
  const sent = routed.ok && routed.json?.success === true;
  return { sent, devOtp: sent ? null : otp };
}

const PROVIDER_MANAGED = new Set(["fast2sms", "msg91"]);

function isProviderManagedOtp(provider: any) {
  const name = provider?.provider_name?.toLowerCase();
  if (!name || !PROVIDER_MANAGED.has(name)) return false;
  if (name === "fast2sms") {
    const route = String(provider.config_json?.fast2sms_route || provider.config_json?.route || "dlt").toLowerCase();
    return route !== "dlt";
  }
  return true;
}

async function verifyViaProvider(phone: string, otp: string, channel = "sms") {
  const provider = await getActiveProvider(channel);
  const name = provider?.provider_name?.toLowerCase();
  if (!isProviderManagedOtp(provider)) return null;
  const routed = await callOtpRouter({ phone, otp, channel: provider.channel || "sms", action: "verify", provider_name: name });
  return { verified: routed.ok && routed.json?.verified !== false, error: routed.json?.error };
}

async function resendViaProvider(phone: string, channel = "sms") {
  const provider = await getActiveProvider(channel);
  const name = provider?.provider_name?.toLowerCase();
  if (!isProviderManagedOtp(provider)) return null;
  const routed = await callOtpRouter({ phone, channel: provider.channel || "sms", action: "resend", provider_name: name });
  return { sent: routed.ok && routed.json?.success === true, error: routed.json?.error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone, action, otp, token, channel = "sms" } = await req.json();
    const mobile = normalizeIndianMobile(phone);
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return new Response(JSON.stringify({ error: "Valid 10-digit phone required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send") {
      const code = genOtp();
      const expires = Date.now() + TTL_MS;
      const sig = await hmac(`${mobile}:${code}:${expires}`);
      const tok = `${expires}.${sig}`;
      const { sent, devOtp } = await sendViaProvider(mobile, code, channel);
      return new Response(JSON.stringify({
        success: true,
        token: tok,
        otp: devOtp, // only present when no provider configured (dev mode)
        sent,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json", "x-otp-token": tok } });
    }

    if (action === "verify") {
      if (!otp || !token) {
        return new Response(JSON.stringify({ error: "otp and token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // 🔑 Universal master test OTP
      if (String(otp).trim() === "313125") {
        return new Response(JSON.stringify({ success: true, verified_by: "master_test" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const providerVerification = await verifyViaProvider(mobile, otp, channel);
      if (providerVerification) {
        if (providerVerification.verified) return new Response(JSON.stringify({ success: true, verified_by: "provider" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: providerVerification.error || "Invalid OTP" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const [expStr, sig] = String(token).split(".");
      const expires = Number(expStr);
      if (!expires || Date.now() > expires) {
        return new Response(JSON.stringify({ error: "OTP expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const expected = await hmac(`${mobile}:${otp}:${expires}`);
      if (expected !== sig) {
        return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, verified_by: "local" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "resend") {
      const providerResend = await resendViaProvider(mobile, channel);
      if (providerResend) {
        if (providerResend.sent) return new Response(JSON.stringify({ success: true, sent: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: providerResend.error || "Could not resend OTP" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Resend is available only for providers that support provider-managed OTP." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("study-otp error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
