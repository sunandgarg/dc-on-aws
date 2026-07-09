import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { geminiGenerate, GEMINI_MODEL } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAi(prompt: string) {
  const systemMsg = "You are India's top admissions strategist for Class 11–12 students (2026 batch). You give specific, actionable, time-blocked roadmaps using REAL exam names, REAL official cut-offs and REAL syllabus. Never invent colleges or exams. Write like a senior mentor talking directly to a Gen-Z student — short sentences, no fluff, no hype. Return valid JSON only.";
  const content = await geminiGenerate({ system: systemMsg, prompt, json: true });
  return { content: content || "{}", source: `gemini:${GEMINI_MODEL}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { targetCollege, targetCourse, classLevel, currentPercent, stream, board, state, hoursPerDay, weaknesses } = await req.json();

    const prompt = `Student wants to LOCK this target:
- Target college: ${targetCollege}
- Target course/branch: ${targetCourse || "Not specified"}
- Currently in: Class ${classLevel}
- Stream/Board: ${stream || "Science"} / ${board || "CBSE"}
- Current marks/percentage: ${currentPercent || "Not shared"}
- Preferred state: ${state || "Pan India"}
- Study hours/day available: ${hoursPerDay || 6}
- Self-rated weak areas: ${weaknesses || "None mentioned"}

Build a HYPER-SPECIFIC roadmap to crack the entrance(s) needed for ${targetCollege}.

Return ONLY this JSON:
{
  "verdict": "3-4 sentence honest reality check — is this target realistic from where the student is today? What's the gap? Be kind but factual.",
  "entranceExams": [
    { "name": "Exact exam name (e.g. JEE Advanced 2027)", "why": "1 line", "targetScore": "Specific score/rank band needed for ${targetCollege}", "officialUrl": "Authentic conducting body URL" }
  ],
  "milestones": [
    { "phase": "Months 1–3 (foundation)", "focus": "1 line goal", "tasks": ["task 1","task 2","task 3","task 4"] },
    { "phase": "Months 4–6 (build)", "focus": "1 line", "tasks": ["..."] },
    { "phase": "Months 7–9 (mocks)", "focus": "1 line", "tasks": ["..."] },
    { "phase": "Final 90 days (peak)", "focus": "1 line", "tasks": ["..."] }
  ],
  "weeklyPlan": {
    "subjects": [
      { "subject": "e.g. Physics", "hoursPerWeek": 12, "approach": "1 line", "topPriorityChapters": ["chapter 1","chapter 2","chapter 3"] }
    ],
    "mockSchedule": "1 sentence cadence (e.g. 'Full-length mock every Sunday from month 6')"
  },
  "books": [
    { "subject": "Physics", "books": ["HC Verma Vol 1&2", "DC Pandey series"] }
  ],
  "freeResources": [
    { "name": "NTA Abhyas app / NPTEL / PW free", "url": "https://...", "use": "what to use it for" }
  ],
  "backupColleges": [
    { "name": "Real backup college 1", "exam": "Same/related exam", "why": "1 line" },
    { "name": "Real backup college 2", "exam": "...", "why": "..." },
    { "name": "Real backup college 3", "exam": "...", "why": "..." }
  ],
  "redFlags": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "mentorNote": "1 short paragraph — final mentor pep-talk, real, no toxic-positivity"
}`;

    const content = await geminiGenerate({ system: "You are India's top admissions strategist.", prompt, json: true });
    let parsed: any = {};
    try { parsed = JSON.parse(content || "{}"); } catch { parsed = { verdict: content }; }
    parsed._source = `gemini:${GEMINI_MODEL}`;

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
