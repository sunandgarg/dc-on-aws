import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { geminiGenerate, GEMINI_MODEL } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAi(prompt: string) {
  const systemMsg = "You are a senior Indian admissions counsellor with 15+ years of experience. ACCURACY IS NON-NEGOTIABLE. Only recommend real, currently-operating Indian colleges/universities/institutes that you are confident exist (NIRF-ranked, UGC/AICTE/MCI/BCI-approved, or other clearly official bodies). NEVER invent names, slugs, cut-offs, or fees. Cite eligibility logic from official admission norms (AICTE Class-12 minima with 5% relaxation for OBC/EWS and 10% for SC/ST). Write the summary in a warm, confident tone — like a counsellor talking to a parent and student together. If uncertain, say so or omit the item rather than guess. Return valid JSON only.";
  const content = await geminiGenerate({ system: systemMsg, prompt, json: true });
  return { content: content || "{}", source: `gemini:${GEMINI_MODEL}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stream, percent, state, exams, colleges, category } = await req.json();
    const shortList = (colleges || []).slice(0, 25).map((c: any) => ({
      slug: c.slug, name: c.short_name || c.name, rating: c.rating,
      location: c.location || c.state, fees: c.fees,
    }));
    const cat = category || "General";

    const prompt = `Student profile: ${stream} aspirant, ${percent}% in Class 12, ${cat} category${state ? `, prefers ${state}` : ""}. Recommended exams: ${(exams || []).join(", ")}.

Apply standard Indian reservation relaxations (5% for OBC/EWS, 10% for SC/ST). Tailor every recommendation to the ${cat} category — mention reserved-seat opportunities, category-specific cut-offs, and scholarships where relevant.

TASK A — Write a detailed 4-6 sentence "summary" that:
  (1) States clearly whether ${percent}% under ${cat} clears the typical 2026 cut-off for ${stream},
  (2) Names the SPECIFIC entrance exams the student must crack and the realistic score/rank band needed in each (e.g. "JEE Main 85+ percentile gets you NITs in spot rounds for SC"),
  (3) Mentions 2-3 specific real colleges by name that this student can realistically target with this profile,
  (4) Flags any risk (e.g. domicile quota, board moderation, counselling rounds).
  Tone: confident, factual, written like a counsellor briefing — NOT generic.

TASK B — "advice": 1-2 sentences with a concrete next step (which exam to focus on, cut-off to clear, application deadline to watch).

TASK C — "webColleges": List 12 real, well-known, currently-operating Indian colleges (NIRF-ranked or UGC/AICTE approved) where this student is genuinely eligible at ${percent}% under ${cat}${state ? ` (prioritise ${state} when sensible)` : ""}. Order strictly best-to-worst by suitability. For each:
  - "name" (full official name),
  - "location" (City, State),
  - "exam" (the SPECIFIC entrance exam that gets them in, e.g. "JEE Main", "MHT-CET", "CUET-UG", "Direct admission on 12th marks"),
  - "reason" (1 line counsellor advice — why THIS college fits THIS student),
  - "pros" (exactly 3 short phrases, 2-4 words each).

TASK D — Partner picks: From this partner list (DekhoCampus), group up to 8 into "high" / "medium" / "reach" buckets. If list is empty, return empty buckets.

Partner candidate colleges (JSON, may be empty):
${JSON.stringify(shortList)}

Return ONLY valid JSON in this exact shape:
{
  "summary": "4-6 sentence detailed counsellor verdict",
  "advice": "1-2 sentence next step",
  "webColleges": [
    { "name": "Full college name", "location": "City, State", "exam": "Entrance exam name", "reason": "1-line why this fits", "pros": ["2-4 words", "2-4 words", "2-4 words"] }
  ],
  "buckets": {
    "high":   [{ "slug": "...", "reason": "1-line why" }],
    "medium": [{ "slug": "...", "reason": "1-line why" }],
    "reach":  [{ "slug": "...", "reason": "1-line why" }]
  }
}`;

    const { content, source } = await callAi(prompt);
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }
    parsed._source = source;

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
