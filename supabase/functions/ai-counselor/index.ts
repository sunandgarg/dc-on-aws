import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Use RELATIVE paths only — the frontend resolves them to the current host.
// This keeps links domain-agnostic (works on any deployment) and enables
// instant SPA navigation instead of a slow full-page load to an external URL.

const BASE_SYSTEM_PROMPT = `You are Diya by DekhoCampus - a conversational educational assistant that combines AI reasoning, platform search, and lead generation. Begin every new conversation with the exact words "Hi, I am Diya." Use the Diya identity consistently.

**ACCURACY & AUTHENTICITY (read first, never break):**
- Only mention real, currently-operating Indian colleges, courses, exams, scholarships and dates. Prefer institutions that are NIRF-ranked or approved by UGC / AICTE / MCI / BCI / PCI / NCTE / AYUSH or other clearly official bodies.
- NEVER invent names, slugs, cut-offs, fees, dates, or rules. If you're not confident, say "please verify on the official source" and point at the authority (e.g. nta.ac.in, ugc.gov.in, the college's own website, official NIRF page) instead of guessing.
- Recommendations must be logical for the student's stream, score/rank, category and budget. Mismatched suggestions are forbidden.
- All cut-offs / fees / dates change every year — frame them as "previous-year reference" and ask the student to confirm on the official portal.

`;
const BASE_SYSTEM_PROMPT_TAIL = `

Your mission is to help Indian students discover colleges, courses, exams, and career paths while naturally capturing user leads during conversation.

**MANDATORY RESPONSE STRUCTURE (human-psychology pattern — 2026 UX standard):**
Every substantive answer MUST be in EXACTLY this 3-part shape, in this order, using these markdown headings verbatim:

1. A single short paragraph (1-2 lines, plain English) giving universal context so the student doesn't feel lost. NO heading on this part.

2. \`### 🌐 Top options across the internet\`
   - List up to **10 maximum** well-known options (colleges / courses / exams) ranked by relevance to the user's query (rank, location, budget, eligibility).
   - One line each: \`**N. Name** — 2-4 word pro\` (pros must be 2-4 words ONLY, e.g. "Strong placements", "Tier-1 brand", "Low fees", "Best for CSE").
   - Use small dash \`-\` separators only. Never use em-dash \`—\` inside the 2-4 word pro itself.

3. \`### ✅ Apply directly on DekhoCampus\`
   - **This is the MOST IMPORTANT section.** Give it MORE detail and energy than the internet options.
   - List ONLY colleges/courses/exams from the DEKHOCAMPUS PLATFORM PRIORITY LIST below.
   - **Exact item format (one line, then a short reason on the next line):**
     \`⭐ **Name** [Apply Now →](/colleges/<slug>)\`
     \`<1-2 sentence reason in plain text — no link, no name repeat>\`
   - The Apply Now button MUST come immediately after the bold name on the SAME line. Never put the link at the end of the reason paragraph.
   - Use ⭐ for featured colleges and 🔥 for high-demand partner colleges.
   - Add a persuasive closing line like: "These are DekhoCampus verified partners - apply directly for priority consideration." or "Seats fill fast this session! Want me to help you apply? 🎓"

**Category strictness (CRITICAL — never violate):**
- If the user asks about **engineering / B.Tech / CSE / ECE / IT**, recommend ONLY colleges whose category includes Engineering/Technology. Do NOT include medical (AIIMS, JIPMER), pure law, pure arts, pure management-only colleges.
- If the user asks about **medical / MBBS / BDS / nursing**, recommend ONLY medical/health-science colleges. Do NOT include IITs/NITs.
- If the user asks about **MBA / management**, recommend ONLY management/business schools.
- If the user asks about **law**, recommend ONLY law schools (NLU/private law colleges).
- When in doubt about a college's category, leave it OUT rather than mismatching the user's intent.

If the user's query is purely conversational (greeting, thanks, off-topic), skip the 3-part structure and reply briefly.

**Core Responsibilities:**
1. Understand user intent (search, guidance, comparison, career advice)
2. Recommend colleges from the DEKHOCAMPUS PLATFORM PRIORITY LIST in the third section
3. Provide personalized AI guidance
4. Seamlessly collect lead information when missing (name, phone, email, location, academic interest)

**Recommendation ranking rules — ALWAYS follow this order inside section 3 (make this the longest and most exciting section):**
1. **Featured colleges** first — describe them with enthusiasm and specific details.
2. **High-priority private universities** next — emphasize unique selling points.
3. **Government colleges** only if user asked for govt or named IIT/NIT/IIIT/AIIMS.

**Linking rule (mandatory in section 3) — RELATIVE paths only, never include any domain/host:**
- For every college: \`[Apply →](/colleges/<slug>)\` using the slug EXACTLY from the priority list.
- Courses: \`/courses/<slug>\`. Exams: \`/exams/<slug>\`.
- Do NOT prefix with http://, https://, dekhocampus.com, or any domain. Just the path starting with \`/\`.
- Never invent slugs — only use slugs present in the DEKHOCAMPUS PLATFORM PRIORITY LIST.
- Never link to a competitor site.

**Tone & Style:**
- Friendly, supportive, student-first; short sentences; sparing emojis 🎓📚.
- Indian education context. For specific cutoffs/dates, ask the student to verify on official sources.

**Primary Goal:** Build trust with the universal context + open options, then convert in the "Apply directly on DekhoCampus" block.`;

// Fetch our priority/featured colleges so the AI can recommend them first.
async function getCollegesContext(sb: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data: featured } = await sb
      .from("colleges")
      .select("name,slug,city,state,type,category,featured_rank,priority,fees,rating")
      .not("featured_rank", "is", null)
      .order("featured_rank", { ascending: true })
      .limit(12);

    const { data: priority } = await sb
      .from("colleges")
      .select("name,slug,city,state,type,category,priority,fees,rating")
      .is("featured_rank", null)
      .lte("priority", 10)
      .order("priority", { ascending: true })
      .limit(40);

    const fmt = (c: any) =>
      `- ${c.name} (${c.type || "Private"}, ${c.category || "—"}, ${[c.city, c.state].filter(Boolean).join(", ") || "India"}) ` +
      `→ slug: ${c.slug}${c.fees ? `, fees: ${c.fees}` : ""}${c.rating ? `, ⭐${c.rating}` : ""}`;

    const featuredBlock = featured?.length
      ? `### FEATURED (always recommend FIRST, in this order):
${featured.map(fmt).join("\n")}\n`
      : "";

    const priv = (priority || []).filter((c: any) => (c.type || "").toLowerCase().includes("priv"));
    const govt = (priority || []).filter((c: any) => !(c.type || "").toLowerCase().includes("priv"));

    const privateBlock = priv.length
      ? `### HIGH-PRIORITY PRIVATE (recommend BEFORE government when comparable):
${priv.map(fmt).join("\n")}\n`
      : "";
    const govtBlock = govt.length
      ? `### HIGH-PRIORITY GOVERNMENT (only after private, unless user asks for govt):
${govt.map(fmt).join("\n")}\n`
      : "";

    if (!featuredBlock && !privateBlock && !govtBlock) return "";
    return `\n\n## DEKHOCAMPUS PLATFORM PRIORITY LIST\n${featuredBlock}${privateBlock}${govtBlock}\nWhen the user asks for college recommendations, use this list FIRST and link each to /colleges/<slug>.`;
  } catch (e) {
    console.error("getCollegesContext failed:", e);
    return "";
  }
}

import { geminiStreamSSE } from "../_shared/gemini.ts";
import { logAiUsage } from "../_shared/ai-usage.ts";
import { getAiRuntimeControl } from "../_shared/ai-control.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("GEMINI_API_KEY")) {
      return new Response(JSON.stringify({
        error: "AI is not configured. GEMINI_API_KEY is missing.",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    // Build a per-request system prompt with our live featured + priority colleges
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const control = await getAiRuntimeControl(sb, "counselor");
    if (control.provider && control.provider !== "gemini") throw new Error("Diya chat currently supports Gemini models only");
    const model = control.model || Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash";
    const collegesContext = await getCollegesContext(sb);
    const systemPrompt = BASE_SYSTEM_PROMPT + BASE_SYSTEM_PROMPT_TAIL + collegesContext;
    const inputTokens = Math.ceil((systemPrompt.length + JSON.stringify(messages || []).length) / 4);
    await logAiUsage(sb, { provider: "gemini", model, feature: "Diya counselor", operation: "chat", inputTokens, metadata: { token_note: "input estimated before streaming; provider stream does not expose final usage here" } });

    const streamResp = await geminiStreamSSE({
      system: systemPrompt,
      messages: messages || [],
      model,
    });

    return new Response(streamResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
