import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { geminiGenerate, GEMINI_MODEL } from "./gemini.ts";
import { blogTextProviderLabel, generateAndUploadBlogCover, generateBlogJson, loadBlogAiConfig } from "../_shared/blog-ai.ts";
import { applyBlogTextRuntimeControl, applyImageRuntimeControl, getAiRuntimeControl } from "../_shared/ai-control.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-blog-agent-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SOURCES = [
  { name: "Shiksha", url: "https://www.shiksha.com/news", source_type: "competitor" },
  { name: "Careers360", url: "https://www.careers360.com/articles", source_type: "competitor" },
  { name: "KollegeApply", url: "https://news.kollegeapply.com", source_type: "competitor" },
  { name: "CollegeDunia", url: "https://collegedunia.com/news", source_type: "competitor" },
  { name: "CollegeDekho", url: "https://www.collegedekho.com/news", source_type: "competitor" },
  { name: "PaGaLGuY", url: "https://www.pagalguy.com/mba/articles", source_type: "competitor" },
  { name: "DekhoCampus", url: "https://www.dekhocampus.in/news", source_type: "own" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(value: string) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function coverSvg(title: string, kicker: string) {
  const words = title.split(/\s+/).slice(0, 13).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f172a"/><stop offset=".55" stop-color="#1d4ed8"/><stop offset="1" stop-color="#f5821f"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1300" cy="130" r="330" fill="#fff" opacity=".09"/><circle cx="170" cy="840" r="370" fill="#fff" opacity=".08"/><text x="115" y="145" fill="#dbeafe" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="5">DEKHOCAMPUS · ${esc(kicker.toUpperCase().slice(0, 42))}</text><foreignObject x="115" y="245" width="1280" height="430"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:white;font-size:78px;line-height:1.12;font-weight:850">${esc(words)}</div></foreignObject><text x="115" y="820" fill="#e0f2fe" font-family="Arial,sans-serif" font-size="30">Fresh guidance for students and parents</text></svg>`;
}

async function requireAccess(req: Request, admin: any) {
  const configuredSecret = Deno.env.get("BLOG_AGENT_SECRET") || "";
  const incomingSecret = req.headers.get("x-blog-agent-secret") || "";
  if (configuredSecret && incomingSecret && incomingSecret === configuredSecret) return;

  // Supabase cron uses a per-project token stored in the admin-only settings
  // row. This keeps scheduled AI generation independent of a browser session.
  if (incomingSecret) {
    const { data: scheduler } = await admin.from("blog_auto_agent_settings")
      .select("scheduler_token")
      .eq("id", "default")
      .maybeSingle();
    if (scheduler?.scheduler_token && incomingSecret === scheduler.scheduler_token) return;
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required");
  const { data: userData } = await admin.auth.getUser(token);
  if (!userData.user) throw new Error("Invalid session");
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").limit(1).maybeSingle();
  if (!role) throw new Error("Admin permission required");
}

async function fetchSignals(sources: any[]) {
  const results = await Promise.allSettled(sources.map(async (source) => {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "DekhoCampus editorial research bot/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return { ...source, ok: false, signal: `Unavailable ${response.status}` };
    const signal = stripHtml((await response.text()).slice(0, 160000)).slice(0, 4500);
    return { ...source, ok: true, signal };
  }));
  return results.map((result, index) => result.status === "fulfilled" ? result.value : { ...sources[index], ok: false, signal: "Fetch failed" });
}

async function chooseProvider(admin: any, providerName: string) {
  const { data } = await admin.from("ai_providers").select("provider_name,base_url,api_key_encrypted,default_model");
  return (data || []).find((p: any) => p.provider_name?.toLowerCase() === String(providerName).toLowerCase() && p.api_key_encrypted);
}

async function callModel(admin: any, providerName: string, prompt: string) {
  const chosen = await chooseProvider(admin, providerName);
  if (!chosen || chosen.provider_name === "gemini") {
    return { raw: await geminiGenerate({ system: "Return valid JSON only.", prompt, json: true }) || "{}", modelUsed: `gemini:${GEMINI_MODEL}` };
  }

  const anthropic = chosen.provider_name === "anthropic" || String(chosen.base_url || "").includes("anthropic.com");
  const response = await fetch(chosen.base_url, anthropic
    ? { method: "POST", headers: { "x-api-key": chosen.api_key_encrypted, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: chosen.default_model, max_tokens: 8192, system: "Return valid JSON only.", messages: [{ role: "user", content: prompt }] }) }
    : { method: "POST", headers: { Authorization: `Bearer ${chosen.api_key_encrypted}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: chosen.default_model, messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: prompt }], response_format: { type: "json_object" } }) });

  if (!response.ok) throw new Error(`Selected AI provider failed with ${response.status}`);
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || (Array.isArray(data.content) ? data.content.map((b: any) => b.text || "").join("") : "{}");
  return { raw, modelUsed: `${chosen.provider_name}:${chosen.default_model}` };
}

function parseJson(raw: string) {
  const cleaned = String(raw || "{}").replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI response did not contain a JSON object");
  }
}

async function parseOrRepairJson(blogAi: any, raw: string, admin?: any) {
  try {
    return parseJson(raw);
  } catch (firstError) {
    const repaired = await generateBlogJson(blogAi, `Repair the following malformed JSON into one valid JSON object. Preserve every factual value and all HTML content. Escape quotes, backslashes and newlines correctly. Remove markdown fences. Return only the repaired JSON object.\n\n${raw}`, admin ? { admin, feature: "blog-agent", operation: "json-repair" } : undefined);
    try {
      return parseJson(repaired);
    } catch {
      throw new Error(`AI returned malformed JSON and automatic repair failed: ${firstError instanceof Error ? firstError.message : String(firstError)}`);
    }
  }
}

async function uploadCover(admin: any, slug: string, svg: string) {
  const path = `blog-covers/${slug}-${Date.now()}.svg`;
  const { error } = await admin.storage.from("admin-uploads").upload(path, new Blob([svg], { type: "image/svg+xml" }), { contentType: "image/svg+xml", upsert: false });
  if (error) return "";
  return admin.storage.from("admin-uploads").getPublicUrl(path).data.publicUrl;
}

async function updateRun(admin: any, runId: string, values: Record<string, unknown>) {
  if (runId) await admin.from("blog_auto_agent_runs").update(values).eq("id", runId);
}

async function loadExistingArticles(admin: any) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from("articles")
      .select("id,title,slug,description,created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function normalizedTitle(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isSimilarTitle(candidate: string, existingTitles: string[]) {
  const words = new Set(normalizedTitle(candidate).split(" ").filter((word) => word.length > 2));
  if (!words.size) return true;
  return existingTitles.some((title) => {
    const other = new Set(title.split(" ").filter((word) => word.length > 2));
    const intersection = [...words].filter((word) => other.has(word)).length;
    const union = new Set([...words, ...other]).size;
    return union > 0 && intersection / union >= 0.72;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, service);

  let runId = "";
  try {
    await requireAccess(req, admin);
    const body = await req.json().catch(() => ({}));
    const triggerType = body.trigger_type === "schedule" ? "schedule" : "manual";

    const { data: settingsRow } = await admin.from("blog_auto_agent_settings").select("*").eq("id", "default").maybeSingle();
    const settings = {
      enabled: false,
      interval_minutes: 60,
      posts_per_run: 2,
      daily_post_cap: 12,
      publish_status: "Published",
      model_provider: "gemini",
      word_limit: 1200,
      author_mode: "none",
      author_ids: [],
      last_author_index: -1,
      ...(settingsRow || {}),
      ...(body.override || {}),
    };
    const blogAi = await loadBlogAiConfig(admin, service);
    await applyBlogTextRuntimeControl(admin, "blog-agent", blogAi);
    const selectedAuthorIds = Array.isArray(settings.author_ids) ? settings.author_ids.filter(Boolean) : [];
    const { data: selectedAuthorRows } = selectedAuthorIds.length
      ? await admin.from("authors").select("id,name").eq("is_active", true).in("id", selectedAuthorIds)
      : { data: [] };
    const authorsById = new Map((selectedAuthorRows || []).map((author: any) => [author.id, author]));
    const selectedAuthors = selectedAuthorIds.map((id: string) => authorsById.get(id)).filter(Boolean) as Array<{ id: string; name: string }>;

    if (triggerType === "schedule" && !settings.enabled) return json({ skipped: true, message: "Blog auto agent is disabled" });
    if (triggerType === "schedule" && settings.next_run_at && new Date(settings.next_run_at).getTime() > Date.now()) {
      return json({ skipped: true, message: "Next run time has not arrived yet", next_run_at: settings.next_run_at });
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const { data: todayArticles } = await admin.from("articles").select("id").gte("created_at", dayStart.toISOString()).contains("tags", ["auto-blog-agent"]);
    if ((todayArticles || []).length >= settings.daily_post_cap) {
      return json({ skipped: true, message: "Daily post cap reached", count: (todayArticles || []).length });
    }

    const { data: run } = await admin.from("blog_auto_agent_runs").insert({
      status: "running",
      trigger_type: triggerType,
      interval_minutes: settings.interval_minutes,
      model_provider: settings.model_provider,
      word_limit: settings.word_limit,
      progress: 3,
      current_step: "Preparing research sources",
      estimated_seconds: Math.max(90, Number(settings.posts_per_run || 1) * 105),
      total_steps: 2 + Number(settings.posts_per_run || 1) * 3,
    }).select("id").single();
    runId = run?.id || "";

    const { data: sourceRows } = await admin.from("blog_research_sources").select("*").eq("is_active", true).order("display_order");
    const sources = (sourceRows?.length ? sourceRows : DEFAULT_SOURCES);
    await updateRun(admin, runId, { progress: 8, current_step: `Researching ${sources.length} sources`, completed_steps: 0 });
    const signals = await fetchSignals(sources);
    await updateRun(admin, runId, { progress: 20, current_step: "Checking every existing DekhoCampus article", completed_steps: 1 });
    const existingArticles = await loadExistingArticles(admin);
    const existingSlugs = new Set(existingArticles.map((article: any) => article.slug));
    const existingTitleList = existingArticles.map((article: any) => normalizedTitle(article.title));
    const existingTitles = new Set(existingTitleList);

    const topicPrompt = `You are the DekhoCampus education-news editor. Today is ${new Date().toISOString().slice(0, 10)} in India.\n\nResearch signals from competitor and own website pages:\n${JSON.stringify(signals)}\n\nRecent DekhoCampus article titles and slugs to avoid duplicates:\n${JSON.stringify(existingArticles.slice(0, 1500).map((a: any) => ({ title: a.title, slug: a.slug })))}\n\nPick the best ${Math.max(settings.posts_per_run * 2, 4)} article opportunities for Indian students and parents. Prioritise timely admissions, exams, counselling, scholarships, careers and college decisions. Reject anything already covered by DekhoCampus. Do not copy competitors. Return JSON only: {topics:[{title,angle,primary_keyword,geo_focus,reason,category,tags:[...]}]}.`;
    const topicRaw = await generateBlogJson(blogAi, topicPrompt + "\nUse natural plain language, never use an em dash, and return JSON only.", { admin, feature: "blog-agent", operation: "topic-research" });
    const topics = ((await parseOrRepairJson(blogAi, topicRaw, admin)).topics || []).filter((topic: any) => {
      const candidateSlug = slugify(topic.title || "");
      return candidateSlug && !existingSlugs.has(candidateSlug) && !existingTitles.has(normalizedTitle(topic.title)) && !isSimilarTitle(topic.title, existingTitleList);
    }).slice(0, settings.posts_per_run);
    await updateRun(admin, runId, {
      progress: 30,
      current_step: topics.length ? `Selected ${topics.length} original topic(s)` : "No new non-duplicate topics found",
      selected_topics: topics,
      sources: signals.map(({ signal, ...rest }: any) => rest),
      completed_steps: 2,
    });

    const createdIds: string[] = [];
    for (const [topicIndex, topic] of topics.entries()) {
      await getAiRuntimeControl(admin, "blog-agent");
      const baseProgress = 30 + Math.round((topicIndex / Math.max(topics.length, 1)) * 65);
      await updateRun(admin, runId, { progress: baseProgress, current_step: `Writing article ${topicIndex + 1} of ${topics.length}`, completed_steps: 2 + topicIndex * 3 });
      const articlePrompt = `Create a complete original DekhoCampus article from this approved topic:\n${JSON.stringify(topic)}\n\nResearch context:\n${JSON.stringify(signals)}\n\nTarget length: ${settings.word_limit} words.\n\nReturn JSON only: {title,slug,description,content_html,meta_title,meta_description,meta_keywords,tags,entity_suggestions:[{entity_type,entity_slug,label}],research_notes,cover_kicker}.\n\nRules: optimise for SEO, GEO, AEO and student usefulness. Use plain human wording, short paragraphs, useful headings, FAQs, and small hyphen '-' only. Never copy competitor wording. Avoid fake certainty on dates, fees, cutoffs or rules. Mention official-source verification where needed. Add a final Sources section with source names or official-source guidance.`;
      const articleRaw = await generateBlogJson(blogAi, articlePrompt + "\nFollow current SEO, GEO and AEO guidance. This is AI-assisted editor-reviewed content. Never claim human authorship, undetectability or 0 AI.", { admin, feature: "blog-agent", operation: "article-generation" });
      const draft = await parseOrRepairJson(blogAi, articleRaw, admin);
      const slug = slugify(draft.slug || draft.title || topic.title);
      if (!slug || existingSlugs.has(slug) || existingTitles.has(normalizedTitle(draft.title || topic.title)) || isSimilarTitle(draft.title || topic.title, existingTitleList)) continue;
      await updateRun(admin, runId, { progress: Math.min(90, baseProgress + 12), current_step: `Generating cover ${topicIndex + 1} of ${topics.length}`, completed_steps: 3 + topicIndex * 3 });
      await applyImageRuntimeControl(admin, blogAi);
      const featured_image = await generateAndUploadBlogCover(admin, blogAi, slug, draft.hero_hook || draft.title || topic.title);
      const tags = Array.from(new Set([...(draft.tags || []), "auto-blog-agent"]));
      const authorIndex = settings.author_mode === "round_robin" && selectedAuthors.length
        ? (Number(settings.last_author_index ?? -1) + createdIds.length + 1) % selectedAuthors.length
        : 0;
      const assignedAuthor = settings.author_mode !== "none" ? selectedAuthors[authorIndex] : undefined;

      await updateRun(admin, runId, { progress: Math.min(96, baseProgress + 23), current_step: `Publishing article ${topicIndex + 1} of ${topics.length}`, completed_steps: 4 + topicIndex * 3 });
      const { data: article, error } = await admin.from("articles").insert({
        title: draft.title || topic.title,
        slug,
        description: draft.description || topic.angle || "",
        content: draft.content_html || "",
        meta_title: draft.meta_title || draft.title || topic.title,
        meta_description: draft.meta_description || draft.description || topic.angle || "",
        meta_keywords: draft.meta_keywords || topic.primary_keyword || "",
        tags,
        category: topic.category || "",
        author: assignedAuthor?.name || "DekhoCampus Editorial",
        author_id: assignedAuthor?.id || null,
        featured_image,
        status: settings.publish_status,
        is_active: true,
      }).select("id").single();
      if (error) throw error;
      createdIds.push(article.id);
      existingSlugs.add(slug);
      const savedTitle = normalizedTitle(draft.title || topic.title);
      existingTitles.add(savedTitle);
      existingTitleList.push(savedTitle);

      for (const suggestion of draft.entity_suggestions || []) {
        await admin.from("article_links").upsert({ article_id: article.id, entity_type: suggestion.entity_type, entity_slug: suggestion.entity_slug }, { onConflict: "article_id,entity_type,entity_slug" });
      }
    }

    const nextRun = new Date(Date.now() + Number(settings.interval_minutes || 60) * 60 * 1000).toISOString();
    const nextAuthorIndex = settings.author_mode === "round_robin" && selectedAuthors.length && createdIds.length
      ? (Number(settings.last_author_index ?? -1) + createdIds.length) % selectedAuthors.length
      : Number(settings.last_author_index ?? -1);
    await admin.from("blog_auto_agent_settings").upsert({ id: "default", last_run_at: new Date().toISOString(), next_run_at: nextRun, last_author_index: nextAuthorIndex });
    if (runId) await admin.from("blog_auto_agent_runs").update({
      status: "completed",
      progress: 100,
      current_step: "Completed",
      completed_steps: 2 + topics.length * 3,
      finished_at: new Date().toISOString(),
      sources: signals.map(({ signal, ...rest }) => rest),
      selected_topics: topics,
      created_article_ids: createdIds,
      message: `Created ${createdIds.length} article(s) using ${blogTextProviderLabel(blogAi.textModel)}:${blogAi.textModel} and openai:${blogAi.imageModel}`,
    }).eq("id", runId);

    return json({ success: true, created_article_ids: createdIds, topics, next_run_at: nextRun });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runId) await admin.from("blog_auto_agent_runs").update({ status: "failed", progress: 100, current_step: "Failed", finished_at: new Date().toISOString(), message }).eq("id", runId);
    return json({ error: message }, 400);
  }
});
