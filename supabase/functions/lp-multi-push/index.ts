// Multi-push: explicitly push one lead to a chosen list of universities right now
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAndSend } from "../_shared/leadpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { lead_id, lead: leadOverride, university_ids } = await req.json();
    if (!Array.isArray(university_ids) || !university_ids.length) {
      return new Response(JSON.stringify({ error: "university_ids[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let lead: any = leadOverride;
    if (!lead && lead_id) {
      const { data } = await supabase.from("leads").select("*").eq("id", lead_id).maybeSingle();
      lead = data;
    }
    if (!lead) return new Response(JSON.stringify({ error: "lead required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: unis } = await supabase.from("lp_universities").select("*").in("id", university_ids).eq("is_active", true);
    const results: any[] = [];
    for (const uni of unis || []) {
      const r = await buildAndSend(uni, lead);
      await supabase.from("lp_push_logs").insert({
        lead_id: lead.id ?? null, university_id: uni.id,
        status: r.status, http_status: r.httpStatus,
        request_payload: r.payload as any, response_body: r.body, error: r.error || null,
      });
      results.push({ university: uni.name, status: r.status, http: r.httpStatus });
    }
    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
