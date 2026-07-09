// Receives `{ alert_id }` from the DB trigger via pg_net and pushes the
// alert payload to any matching `intent_university_webhooks` row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { alert_id } = await req.json();
    if (!alert_id) return new Response(JSON.stringify({ error: "alert_id required" }), { status: 400, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: alert, error } = await supabase
      .from("intent_alerts").select("*").eq("id", alert_id).maybeSingle();
    if (error || !alert) {
      return new Response(JSON.stringify({ error: "alert not found" }), { status: 404, headers: cors });
    }

    // Find webhooks targeting this college (or global hooks with no college)
    const { data: hooks } = await supabase
      .from("intent_university_webhooks")
      .select("*")
      .eq("is_active", true);

    const matches = (hooks || []).filter((h: any) => {
      if (!h.alert_types?.includes(alert.alert_type)) return false;
      if (h.threshold_score && alert.score != null && alert.score < h.threshold_score && alert.alert_type === "threshold_crossed") return false;
      if (h.college_slug && alert.college_slug && h.college_slug !== alert.college_slug) return false;
      return true;
    });

    // Enrich with lead identity if score row is linked to a lead
    const { data: score } = await supabase
      .from("intent_lead_scores").select("*")
      .eq("subject_type", alert.subject_type)
      .eq("subject_id",   alert.subject_id)
      .maybeSingle();

    let lead: any = null;
    if (score?.lead_id) {
      const { data } = await supabase.from("leads").select("name,email,phone,city,state").eq("id", score.lead_id).maybeSingle();
      lead = data;
    }

    const payload = {
      alert_id:     alert.id,
      alert_type:   alert.alert_type,
      score:        alert.score,
      category:     score?.category ?? null,
      college_slug: alert.college_slug,
      course_slug:  alert.course_slug,
      occurred_at:  alert.created_at,
      lead,
      signals:      alert.payload,
    };

    let delivered = 0;
    let lastError: string | null = null;
    for (const h of matches) {
      try {
        const res = await fetch(h.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(h.secret ? { "X-DC-Signature": h.secret } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          delivered++;
          await supabase.from("intent_university_webhooks").update({ last_delivery_at: new Date().toISOString(), failures: 0 }).eq("id", h.id);
        } else {
          lastError = `HTTP ${res.status}`;
          await supabase.from("intent_university_webhooks").update({ failures: (h.failures ?? 0) + 1 }).eq("id", h.id);
        }
      } catch (e: any) {
        lastError = e?.message || "fetch failed";
      }
    }

    await supabase.from("intent_alerts").update({
      delivered: delivered > 0,
      delivery_attempts: (alert.delivery_attempts ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      delivered_at: delivered > 0 ? new Date().toISOString() : null,
      last_error: lastError,
    }).eq("id", alert.id);

    return new Response(JSON.stringify({ ok: true, matched: matches.length, delivered }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "error" }), { status: 500, headers: cors });
  }
});
