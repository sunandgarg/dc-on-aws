import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { geminiGenerate, GEMINI_MODEL } from "../_shared/gemini.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const COMPETITORS = ["https://www.shiksha.com/news", "https://www.careers360.com/articles", "https://news.kollegeapply.com", "https://collegedunia.com/news", "https://www.collegedekho.com/news", "https://www.pagalguy.com/mba/articles"];
const yes = (v: unknown) => String(v ?? "").toLowerCase() === "yes";

function stripHtml(input: string) { return input.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function esc(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function coverSvg(title: string, kicker: string) {
  const words = title.split(/\s+/).slice(0, 12).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172554"/><stop offset=".52" stop-color="#4f46e5"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1360" cy="120" r="300" fill="#fff" opacity=".08"/><circle cx="180" cy="820" r="360" fill="#fbbf24" opacity=".13"/><text x="120" y="150" fill="#dbeafe" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="5">DEKHOCAMPUS · ${esc(kicker.toUpperCase().slice(0,42))}</text><foreignObject x="120" y="245" width="1250" height="420"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:white;font-size:80px;line-height:1.12;font-weight:800">${esc(words)}</div></foreignObject><text x="120" y="820" fill="#e0e7ff" font-family="Arial,sans-serif" font-size="30">Expert guidance for students and parents</text></svg>`;
}

async function competitorSignals() {
  const results = await Promise.allSettled(COMPETITORS.map(async (url) => {
    const response = await fetch(url, { headers: { "User-Agent": "DekhoCampus editorial research bot/1.0" } });
    if (!response.ok) return { url, signal: "unavailable" };
    const text = stripHtml((await response.text()).slice(0, 120000)).slice(0, 3000);
    return { url, signal: text };
  }));
  return results.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
}

async function requireAdmin(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required");
  const admin = createClient(url, service);
  const { data: userData } = await admin.auth.getUser(token);
  if (!userData.user) throw new Error("Invalid session");
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Admin permission required");
  return admin;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { topic, model = "gemini", word_limit = 1200, audience = "Indian students and parents" } = await req.json();
    if (!String(topic || "").trim()) throw new Error("A blog topic is required");
    const admin = await requireAdmin(req);
    const signals = await competitorSignals();
    const { data: providers } = await admin.from("ai_providers").select("provider_name,base_url,api_key_encrypted,default_model");
    const chosen = (providers || []).find((p: any) => p.provider_name?.toLowerCase() === String(model).toLowerCase() && p.api_key_encrypted);
    const prompt = `Create one original, fact-conscious education news/article draft about: ${topic}\n\nAudience: ${audience}\nTarget length: ${word_limit} words.\n\nCompetitor editorial signals, for trend awareness only - never copy wording, structure, titles, claims, or images:\n${JSON.stringify(signals)}\n\nReturn JSON only: {title,slug,description,content_html,meta_title,meta_description,meta_keywords,tags,entity_suggestions:[{entity_type,entity_slug,label}],research_notes,cover_kicker}.\n\nRules: write naturally and plainly, use short paragraphs and small hyphens only, do not make unverifiable claims, do not claim guaranteed rankings/dates/fees, cite official sources in a final Sources section when factual claims are made, avoid keyword stuffing, make the work useful for search, generative search, and human readers. This is AI-assisted content that requires editor review; never claim it is human-written or undetectable.`;
    let raw = "";
    let modelUsed = `gemini:${GEMINI_MODEL}`;
    if (chosen && chosen.provider_name !== "gemini") {
      modelUsed = `${chosen.provider_name}:${chosen.default_model}`;
      const anthropic = chosen.provider_name === "anthropic" || String(chosen.base_url || "").includes("anthropic.com");
      const response = await fetch(chosen.base_url, anthropic
        ? { method: "POST", headers: { "x-api-key": chosen.api_key_encrypted, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: chosen.default_model, max_tokens: 8192, system: "Return valid JSON only.", messages: [{ role: "user", content: prompt }] }) }
        : { method: "POST", headers: { Authorization: `Bearer ${chosen.api_key_encrypted}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: chosen.default_model, messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: prompt }], response_format: { type: "json_object" } }) });
      if (!response.ok) throw new Error(`Selected AI provider failed with ${response.status}`);
      const data = await response.json(); raw = data.choices?.[0]?.message?.content || (Array.isArray(data.content) ? data.content.map((b: any) => b.text || "").join("") : "{}");
    } else raw = await geminiGenerate({ system: "Return valid JSON only.", prompt, json: true }) || "{}";
    const draft = JSON.parse(raw.replace(/^```json|```$/g, "").trim());
    draft.cover_svg = coverSvg(draft.title || topic, draft.cover_kicker || "Education update");
    return new Response(JSON.stringify({ draft, model_used: modelUsed, competitor_sources: signals.map(s => s.url) }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }
});
