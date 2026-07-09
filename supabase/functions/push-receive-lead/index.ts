// push-receive-lead: inbound webhook for V2 Push Landing Pages
// POST body: { name, email, mobile, city, state, course, ... }
// Header: x-api-key: <push_landing_pages.api_key>  (or ?api_key=)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pushLead, apiConfigFromUniversity } from "../_shared/pushlead.ts";

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

    const { data: lp } = await supabase.from("push_landing_pages").select("*").eq("api_key", apiKey).eq("is_active", true).maybeSingle();
    if (!lp) return new Response(JSON.stringify({ error: "invalid api key" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const lead = {
      name: body.name || body.full_name || "",
      email: body.email || "",
      mobile: normalizeIndianMobile(body.mobile || body.phone || ""),
      city: body.city || "",
      state: body.state || "",
      course: body.course || "",
      specialization: body.specialization || "",
      address: body.address || "",
      leadSource: body.source || body.leadSource || lp.name,
      leadMedium: body.medium || body.leadMedium || "landing_page",
      leadCampaign: body.campaign || body.leadCampaign || lp.name,
      extra_data: body.extra_data || {},
      ...(lp.default_values || {}),
    };
    if (!lead.email && !lead.mobile) {
      return new Response(JSON.stringify({ error: "email or mobile required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve target universities
    let universityIds: string[] = lp.university_ids || [];
    if (lp.routing_mode === "preset" && lp.preset_id) {
      const { data: preset } = await supabase.from("multi_push_presets").select("university_ids").eq("id", lp.preset_id).maybeSingle();
      if (preset?.university_ids) universityIds = preset.university_ids;
    }
    if (!universityIds.length) return new Response(JSON.stringify({ error: "no target universities" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: unis } = await supabase.from("universities").select("*").in("id", universityIds);
    const results: any[] = [];
    for (const uni of unis || []) {
      const cfg = apiConfigFromUniversity(uni);
      const r = await pushLead(cfg, lead);
      await supabase.from("api_logs").insert({
        university_id: uni.id,
        email: lead.email, mobile: lead.mobile,
        status: r.status, response: r.body || r.error || "",
        lead_data: lead, source: cfg.source, medium: cfg.medium, campaign: cfg.campaign,
        trigger_point: "Landing Page",
      });
      results.push({ university: uni.name, status: r.status });
    }

    await supabase.rpc("increment_push_landing_submission", { lp_id: lp.id });

    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("push-receive-lead", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
