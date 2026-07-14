import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { blogTextProviderLabel, generateAndUploadBlogCover, generateBlogJson, loadBlogAiConfig } from "../_shared/blog-ai.ts";
import { applyBlogTextRuntimeControl, applyImageRuntimeControl } from "../_shared/ai-control.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const COMPETITORS = ["https://www.shiksha.com/news", "https://www.careers360.com/articles", "https://news.kollegeapply.com", "https://collegedunia.com/news", "https://www.collegedekho.com/news", "https://www.pagalguy.com/mba/articles"];
const stripHtml = (input: string) => input.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const slugify = (value: string) => value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

async function competitorSignals() {
  const results = await Promise.allSettled(COMPETITORS.map(async (url) => {
    const response = await fetch(url, { headers: { "User-Agent": "DekhoCampus editorial research bot/1.0" } });
    if (!response.ok) return { url, signal: "unavailable" };
    return { url, signal: stripHtml((await response.text()).slice(0, 120000)).slice(0, 3000) };
  }));
  return results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
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
    const { topic, word_limit = 1200, audience = "Indian students and parents" } = await req.json();
    if (!String(topic || "").trim()) throw new Error("A blog topic is required");
    const admin = await requireAdmin(req);
    const signals = await competitorSignals();
    const config = await loadBlogAiConfig(admin, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await applyBlogTextRuntimeControl(admin, "blog-studio", config);
    const prompt = `Today is ${new Date().toISOString().slice(0, 10)}. Create one original, fact-conscious education news article about: ${topic}\nAudience: ${audience}\nTarget length: ${word_limit} words.\nResearch signals - use only for trend awareness and never copy wording, structure, titles, claims or images:\n${JSON.stringify(signals)}\nReturn JSON only: {title,slug,description,content_html,meta_title,meta_description,meta_keywords,tags,entity_suggestions:[{entity_type,entity_slug,label}],research_notes,cover_kicker,hero_hook}.\nRules: natural plain language, short paragraphs, only the small hyphen '-', never an em dash, no unverifiable claims, current official sources in a final Sources section, no keyword stuffing, and current SEO, GEO and AEO guidance. This is AI-assisted and requires editor review. Never claim human authorship, undetectability or '0 AI'.`;
    const raw = await generateBlogJson(config, prompt, { admin, feature: "blog-studio", operation: "draft" });
    const draft = JSON.parse(raw.replace(/^```json|```$/g, "").trim());
    draft.slug = slugify(draft.slug || draft.title || topic);
    await applyImageRuntimeControl(admin, config);
    draft.featured_image = await generateAndUploadBlogCover(admin, config, draft.slug, draft.hero_hook || draft.title || topic);
    return new Response(JSON.stringify({ draft, model_used: `${blogTextProviderLabel(config.textModel)}:${config.textModel}`, image_model_used: `openai:${config.imageModel}`, competitor_sources: signals.map(s => s.url) }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
