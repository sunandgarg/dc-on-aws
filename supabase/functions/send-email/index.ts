import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sesSendEmail, AwsCreds } from "../_shared/awsSig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { to, subject, text, html, from, reply_to, provider_name } = await req.json();
    if (!to || !subject) return json({ error: "to and subject are required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let { data: providers } = await supabase
      .from("email_providers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (provider_name) providers = (providers || []).filter((p: any) => p.provider_name?.toLowerCase() === String(provider_name).toLowerCase());
    const provider = providers?.[0];

    // Fallback: env-based AWS creds if no row configured
    const accessKeyId = provider?.api_key || Deno.env.get("AWS_ACCESS_KEY_ID") || "";
    const secretAccessKey = provider?.api_secret || Deno.env.get("AWS_SECRET_ACCESS_KEY") || "";
    const region = provider?.region || Deno.env.get("AWS_REGION") || "us-east-1";
    const fromAddr = from || provider?.from_email || Deno.env.get("AWS_SES_FROM_EMAIL") || "";

    if (!accessKeyId || !secretAccessKey) return json({ error: "AWS credentials not configured. Add them in Admin → Email Providers." }, 503);
    if (!fromAddr) return json({ error: "from_email not configured. Set it in Admin → Email Providers." }, 400);

    const fromHeader = provider?.from_name ? `${provider.from_name} <${fromAddr}>` : fromAddr;
    const creds: AwsCreds = { accessKeyId, secretAccessKey, region };
    const result = await sesSendEmail(creds, {
      from: fromHeader,
      to,
      subject,
      text,
      html,
      replyTo: reply_to || provider?.reply_to,
    });

    // Best-effort log
    try {
      await supabase.from("email_log").insert({
        provider_name: provider?.provider_name || "aws_ses",
        to_email: Array.isArray(to) ? to.join(",") : String(to),
        subject,
        status: result.ok ? "sent" : "failed",
        message_id: result.messageId || null,
        error: result.ok ? null : result.detail,
        meta: { region },
      });
    } catch { /* ignore log failures */ }

    if (!result.ok) return json({ error: result.detail || "SES send failed" }, 502);
    return json({ success: true, message_id: result.messageId });
  } catch (e: any) {
    console.error("send-email error:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
