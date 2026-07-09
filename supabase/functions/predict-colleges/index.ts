import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { geminiGenerate, GEMINI_MODEL } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAi(prompt: string) {
  const systemMsg = "You are a precise Indian college admissions counsellor with deep knowledge of JoSAA, CSAB, MCC, KCET, MHT-CET, COMEDK, IPU, WBJEE and state counselling cut-offs from 2023-2025. ACCURACY IS NON-NEGOTIABLE. Only recommend real, currently-operating Indian institutions (IITs, NITs, IIITs, GFTIs, IIMs, AIIMS, top state/deemed/private universities) that are NIRF-ranked or approved by UGC/AICTE/MCI/BCI. NEVER fabricate college names, slugs, cut-offs, or rank-to-college mappings. Write the summary in a confident, counsellor-grade tone with specific numbers. If unsure, omit the item. Return valid JSON only.";
  const content = await geminiGenerate({ system: systemMsg, prompt, json: true });
  return { content: content || "{}", source: `gemini:${GEMINI_MODEL}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { exam, rank, category, state, colleges } = await req.json();
    const shortList = (colleges || []).slice(0, 25).map((c: any) => ({
      slug: c.slug, name: c.short_name || c.name, rating: c.rating,
      location: c.location || c.state, fees: c.fees,
    }));

    const prompt = `Student appeared in ${exam} with All India Rank ${rank} (${category} category)${state ? `, preferring colleges in ${state}` : ""}.

TASK A — Write a detailed 4-6 sentence "summary" that:
  (1) States clearly what tier of colleges open up at AIR ${rank} in ${exam} for ${category} based on 2023-2025 closing ranks,
  (2) Names 3-4 SPECIFIC real colleges + branches the student can realistically lock at this rank (e.g. "NIT Patna ECE, IIIT Lucknow IT, BIT Mesra CSE typically close in this range"),
  (3) Mentions which counselling round to target (JoSAA round 1-6, CSAB special, state counselling),
  (4) Flags any home-state quota / domicile / category-specific edge.
  Tone: confident, counsellor-grade, with real numbers — NOT generic.

TASK B — "advice": 1-2 sentences with the most important next step (choice-filling strategy, mock allotment, branch vs college tradeoff).

TASK C — "webColleges": List 12 real, well-known Indian colleges that typically admit at this rank/category${state ? ` (prioritise ${state} when sensible)` : ""}. Order strictly best-to-worst by suitability for this rank. For each:
  - "name" (full official name),
  - "location" (City, State),
  - "exam" (the counselling/exam route, e.g. "JoSAA via JEE Main", "CSAB", "${state || "State"} counselling"),
  - "branch" (typical branches that close in this rank range, e.g. "CSE, ECE, EE"),
  - "reason" (1 line counsellor advice — why THIS college fits THIS rank),
  - "pros" (exactly 3 short phrases, 2-4 words each).

TASK D — Partner picks: From this partner list, group up to 8 into "safe" / "target" / "reach" by 2025-26 cut-offs. If list is empty, return empty buckets.

Partner candidate colleges (JSON, may be empty):
${JSON.stringify(shortList)}

Return ONLY valid JSON in this exact shape:
{
  "summary": "4-6 sentence detailed counsellor verdict with specific colleges and rank bands",
  "advice": "1-2 sentence concrete next step",
  "webColleges": [
    { "name": "Full college name", "location": "City, State", "exam": "Counselling route", "branch": "Typical branches", "reason": "1-line why", "pros": ["2-4 words","2-4 words","2-4 words"] }
  ],
  "buckets": {
    "safe":   [{ "slug": "...", "reason": "short why" }],
    "target": [{ "slug": "...", "reason": "short why" }],
    "reach":  [{ "slug": "...", "reason": "short why" }]
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
