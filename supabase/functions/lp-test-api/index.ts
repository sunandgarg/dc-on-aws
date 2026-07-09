// Send a single sample lead to a single university — admin diagnostics
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
    const { university_id, lead } = await req.json();
    const { data: uni } = await supabase.from("lp_universities").select("*").eq("id", university_id).maybeSingle();
    if (!uni) return new Response(JSON.stringify({ error: "university not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const r = await buildAndSend(uni, lead || {
      name: "Test Lead", email: "test@example.com", phone: "9999999999",
      city: "Delhi", state: "Delhi", interested_course_slug: "mba", source: "admin_test",
    });
    await supabase.from("lp_push_logs").insert({
      university_id: uni.id, status: r.status, http_status: r.httpStatus,
      request_payload: r.payload as any, response_body: r.body, error: r.error || null,
    });
    return new Response(JSON.stringify(r), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
