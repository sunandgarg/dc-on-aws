// Inbound webhook for partner systems to submit leads via API key
// POST /lp-receive-lead   body: { name, email, phone, city, state, course, source, ... }
// Header: x-api-key: <key>   (or ?api_key= query)
// Inserts into leads table (which auto-triggers lp-dispatch-lead) and bumps key usage.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function normalizeIndianMobile(input: string) {
  let value = String(input || "").replace(/\D/g, "");
  while (value.startsWith("0")) value = value.slice(1);
  if (value.startsWith("91") && value.length > 10) value = value.slice(2);
  while (value.startsWith("0")) value = value.slice(1);
  return value.slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
    if (!apiKey) return new Response(JSON.stringify({ error: "missing api key" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: key } = await supabase.from("lp_api_keys").select("*").eq("api_key", apiKey).eq("is_active", true).maybeSingle();
    if (!key) return new Response(JSON.stringify({ error: "invalid api key" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
    if (key.allowed_ips?.length && ip && !key.allowed_ips.includes(ip)) {
      return new Response(JSON.stringify({ error: "ip not allowed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit: count key usage in last 60s via leads table? cheaper: just check call_count delta on key.last_used_at window
    // Simple sliding window using lp_push_logs is overkill; we just gate hard with last 1-min count via separate ping
    // For simplicity, soft-rate-limit by checking inserted leads in last 60s tagged with this key in source
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count: recent } = await supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("source", `webhook:${key.name}`).gte("created_at", since);
    if ((recent || 0) >= key.rate_limit_per_minute) {
      return new Response(JSON.stringify({ error: "rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const lead = {
      name: body.name || body.full_name || "",
      email: body.email || "",
      phone: normalizeIndianMobile(body.phone || body.mobile || ""),
      city: body.city || "",
      state: body.state || "",
      current_situation: body.current_situation || "",
      initial_query: body.initial_query || body.course || "",
      interested_course_slug: body.course || body.interested_course_slug || "",
      interested_college_slug: body.college || body.interested_college_slug || "",
      interested_exam_slug: body.exam || "",
      cta: body.cta || body.course || "",
      page_url: body.page_url || "",
      source: `webhook:${key.name}`,
      otp_verified: false,
    };
    if (!lead.email && !lead.phone) {
      return new Response(JSON.stringify({ error: "email or phone required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted, error } = await supabase.from("leads").insert(lead).select("id").single();
    if (error) throw error;

    await supabase.from("lp_api_keys").update({ last_used_at: new Date().toISOString(), call_count: (key.call_count || 0) + 1 }).eq("id", key.id);

    return new Response(JSON.stringify({ ok: true, lead_id: inserted.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("lp-receive-lead", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
