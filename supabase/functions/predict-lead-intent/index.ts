// Predicts a lead's most-likely course/college, admission probability,
// scholarship sensitivity and location preference.
//
// Modes:
//   { lead_score_id }                  -> heuristic (free, instant)
//   { lead_score_id, mode: "ai" }      -> Google Gemini 2.5 Flash Lite (direct API)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiGenerate } from "../_shared/gemini.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { lead_score_id, mode = "heuristic" } = await req.json();
    if (!lead_score_id) return new Response(JSON.stringify({ error: "lead_score_id required" }), { status: 400, headers: cors });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: score } = await supabase.from("intent_lead_scores").select("*").eq("id", lead_score_id).maybeSingle();
    if (!score) return new Response(JSON.stringify({ error: "score not found" }), { status: 404, headers: cors });

    const filter = score.subject_type === "user"
      ? supabase.from("intent_events").select("*").eq("user_id", score.subject_id)
      : supabase.from("intent_events").select("*").eq("visitor_id", score.subject_id);
    const { data: events } = await filter.order("occurred_at", { ascending: false }).limit(500);

    // ---- Heuristic ----
    const colCount: Record<string, number> = {};
    const crsCount: Record<string, number> = {};
    const cityCount: Record<string, number> = {};
    let scholarshipHits = 0, feeHits = 0, total = 0;
    for (const e of events || []) {
      total++;
      if (e.college_slug) colCount[e.college_slug] = (colCount[e.college_slug] || 0) + 1;
      if (e.course_slug)  crsCount[e.course_slug]  = (crsCount[e.course_slug]  || 0) + 1;
      if (e.city)         cityCount[e.city]        = (cityCount[e.city] || 0) + 1;
      if (e.event_type === "scholarship_viewed") scholarshipHits++;
      if (e.event_type === "fee_viewed")         feeHits++;
    }
    const top = (m: Record<string, number>) => {
      const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]);
      const sum = sorted.reduce((s, [, v]) => s + v, 0) || 1;
      return sorted.slice(0, 3).map(([k, v]) => ({ value: k, confidence: Math.round((v / sum) * 100) }));
    };
    const admissionProb = Math.min(95, Math.round((score.score / 150) * 100));
    const heuristic = {
      top_colleges:           top(colCount),
      top_courses:            top(crsCount),
      location_preference:    top(cityCount),
      admission_probability:  admissionProb,
      scholarship_sensitivity: total ? Math.round((scholarshipHits / total) * 100) : 0,
      fee_sensitivity:        total ? Math.round((feeHits / total) * 100) : 0,
      sample_size:            total,
    };

    if (mode !== "ai") {
      return new Response(JSON.stringify({ mode: "heuristic", ...heuristic }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ---- AI deep analysis (Google Gemini direct) ----
    if (!Deno.env.get("GEMINI_API_KEY")) {
      return new Response(JSON.stringify({ mode: "heuristic", ...heuristic, ai_error: "GEMINI_API_KEY missing" }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const timeline = (events || []).slice(0, 60).map(e => ({
      t: e.occurred_at, type: e.event_type, college: e.college_slug, course: e.course_slug, page: e.page_url,
    }));

    let ai: any = null;
    try {
      const raw = await geminiGenerate({
        system: "You analyze student behavioral timelines on an Indian higher-education portal. Return STRICT JSON with keys: most_interested_course, most_interested_college, admission_probability_percent, scholarship_sensitivity, location_preference, reasoning (1-2 sentences). No prose outside JSON.",
        prompt: `Score: ${score.score} (${score.category}). Heuristic snapshot: ${JSON.stringify(heuristic)}. Last 60 events: ${JSON.stringify(timeline)}`,
        json: true,
      });
      const match = raw.match(/\{[\s\S]*\}/);
      ai = match ? JSON.parse(match[0]) : null;
    } catch (err) {
      console.error("gemini predict-lead-intent failed", err);
      ai = null;
    }

    return new Response(JSON.stringify({ mode: "ai", heuristic, ai }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "error" }), { status: 500, headers: cors });
  }
});
