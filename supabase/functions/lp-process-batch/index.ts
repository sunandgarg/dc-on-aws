// Bulk batch processor — admin uploads CSV, this pushes each row to one or more universities
// Body: { batch_id, university_ids: string[], rows: Array<Record<string,string>> }
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
    const { batch_id, university_ids, rows } = await req.json();
    if (!batch_id || !Array.isArray(university_ids) || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: "batch_id, university_ids[], rows[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: unis } = await supabase.from("lp_universities").select("*").in("id", university_ids).eq("is_active", true);
    if (!unis?.length) return new Response(JSON.stringify({ error: "no active universities" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabase.from("lp_batches").update({ status: "processing", total: rows.length * unis.length }).eq("id", batch_id);

    // Process in background; respond fast
    (async () => {
      for (const uni of unis) {
        const perMin = uni.leads_per_minute || 30;
        const delayMs = Math.max(50, Math.floor(60_000 / perMin));
        for (const row of rows) {
          const r = await buildAndSend(uni, row);
          await supabase.from("lp_push_logs").insert({
            university_id: uni.id, status: r.status, http_status: r.httpStatus,
            request_payload: r.payload as any, response_body: r.body, error: r.error || null,
          });
          const rpc = r.status === "Success" ? "lp_increment_batch_success" : r.status === "Duplicate" ? "lp_increment_batch_duplicate" : "lp_increment_batch_fail";
          await supabase.rpc(rpc, { batch_uuid: batch_id });
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
      await supabase.from("lp_batches").update({ status: "completed" }).eq("id", batch_id);
    })().catch(async (e) => {
      await supabase.from("lp_batches").update({ status: "failed" }).eq("id", batch_id);
      console.error("batch error", e);
    });

    return new Response(JSON.stringify({ ok: true, queued: rows.length * unis.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
