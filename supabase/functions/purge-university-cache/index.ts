// purge-university-cache: deletes lead-push data for a given university (or all)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES_WITH_UNIVERSITY = [
  "api_logs",
  "lp_push_logs",
  "push_leads",
  "upload_batches",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const universityId: string = body?.university_id ?? body?.universityId ?? "__all__";
    const days: number = Number(body?.days ?? 0);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff =
      days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

    const results: Record<string, number | string> = {};

    for (const table of TABLES_WITH_UNIVERSITY) {
      let q = supabase.from(table).delete({ count: "exact" });
      if (universityId !== "__all__") q = q.eq("university_id", universityId);
      if (cutoff) q = q.lt("created_at", cutoff);
      // If purging ALL with no filters, supabase requires a filter — use a tautology
      if (universityId === "__all__" && !cutoff) q = q.not("id", "is", null);

      const { error, count } = await q;
      results[table] = error ? `error: ${error.message}` : (count ?? 0);
    }

    // lp_batches has no university_id — only purge when "ALL"
    if (universityId === "__all__") {
      let q = supabase.from("lp_batches").delete({ count: "exact" });
      if (cutoff) q = q.lt("created_at", cutoff);
      else q = q.not("id", "is", null);
      const { error, count } = await q;
      results["lp_batches"] = error ? `error: ${error.message}` : (count ?? 0);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
