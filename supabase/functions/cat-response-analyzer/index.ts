import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { geminiGenerate, GEMINI_MODEL } from "../_shared/gemini.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_HOSTS = ["digialm.com", "iimcat.ac.in"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function allowedResponseUrl(raw: unknown) {
  try {
    const url = new URL(String(raw || "").trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return null;
    url.hash = "";
    return url;
  } catch { return null; }
}

function parseJson(raw: string) {
  const clean = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini did not return a scorecard");
  return JSON.parse(clean.slice(start, end + 1));
}

function safeCount(value: unknown) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const url = allowedResponseUrl(body.response_url);
    if (!url) return json({ error: "Paste an official CAT response-sheet URL from Digialm or iimcat.ac.in" }, 400);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18_000);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "DekhoCampus CAT score calculator/1.0", Accept: "text/html,application/xhtml+xml" },
      });
    } finally { clearTimeout(timer); }
    if (!response.ok) return json({ error: `The official response sheet could not be opened (${response.status}). Use the manual calculator below.` }, 422);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("text")) return json({ error: "The URL did not return an HTML response sheet" }, 422);

    const html = (await response.text()).slice(0, 900_000);
    if (html.length < 500) return json({ error: "The response sheet was empty or requires a private browser session. Use the manual calculator below." }, 422);

    const prompt = `Audit the following official CAT candidate response-sheet HTML. Extract counts only when the HTML explicitly shows both the candidate response and the official/correct answer or an explicit correct/incorrect status. Never guess an answer key. Classify questions into VARC, DILR and QA. Count incorrect only when negative marking applies. Return JSON only:
{"success":true,"confidence":0.0,"slot":"Slot 1|Slot 2|Slot 3|Unknown","sections":{"varc":{"correct":0,"incorrect":0,"unattempted":0},"dilr":{"correct":0,"incorrect":0,"unattempted":0},"qa":{"correct":0,"incorrect":0,"unattempted":0}},"warnings":[]}
If the page does not contain enough explicit information, return success false, confidence below 0.7, zero counts, and explain why in warnings. Do not include personal details from the sheet.

HTML:
${html}`;
    const parsed = parseJson(await geminiGenerate({
      system: "You are a conservative CAT response-sheet parser. Extract explicit evidence only and return valid JSON.",
      prompt,
      json: true,
      model: GEMINI_MODEL,
    }));

    const sections = ["varc", "dilr", "qa"].reduce((output, key) => {
      const section = parsed?.sections?.[key] || {};
      output[key] = {
        correct: safeCount(section.correct),
        incorrect: safeCount(section.incorrect),
        unattempted: safeCount(section.unattempted),
      };
      return output;
    }, {} as Record<string, { correct: number; incorrect: number; unattempted: number }>);
    const rawScore = Object.values(sections).reduce((sum, section) => sum + section.correct * 3 - section.incorrect, 0);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence || 0)));
    const success = parsed.success === true && confidence >= 0.7 && Object.values(sections).some((section) => section.correct + section.incorrect + section.unattempted > 0);

    return json({
      success,
      confidence,
      slot: ["Slot 1", "Slot 2", "Slot 3"].includes(parsed.slot) ? parsed.slot : "Unknown",
      sections,
      raw_score: rawScore,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 8) : [],
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error("cat-response-analyzer", error);
    return json({ error: error instanceof Error ? error.message : "Response-sheet analysis failed" }, 500);
  }
});
