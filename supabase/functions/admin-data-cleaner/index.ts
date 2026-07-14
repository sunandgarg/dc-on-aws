import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateBlogJson, loadBlogAiConfig, resolveClaudeTextModel, type BlogAiConfig } from "../_shared/blog-ai.ts";
import { logAiUsage } from "../_shared/ai-usage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-data-cleaner-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TABLES: Record<string, string> = {
  colleges: "colleges",
  courses: "courses",
  exams: "exams",
  careers: "career_profiles",
  scholarships: "scholarships",
  articles: "articles",
  study_material: "study_subjects",
  college_study: "college_universities",
  cat_universe: "cat_universe_modules",
};

const ALLOWED_FIELDS: Record<string, string[]> = {
  colleges: [
    "official_website", "name", "short_name", "description", "page_summary", "established", "type", "category",
    "categories", "city", "state", "location", "fees", "admission_process", "eligibility_criteria", "cutoff",
    "admission_deadline", "scholarship_available", "scholarship_details", "placement", "placement_content",
    "rankings_content", "facilities", "facilities_content", "highlights", "approvals", "affiliation_kind", "parent_university_slug",
    "naac_grade", "top_recruiters", "hostel_life", "course_fee_content", "meta_title", "meta_description", "meta_keywords",
    "image", "logo", "carousel_images", "gallery_images", "brochure_url", "approval_logos", "banner_ad_image", "square_ad_image",
  ],
  courses: [
    "official_website", "name", "full_name", "description", "short_description", "page_summary", "category", "categories",
    "domain", "level", "mode", "study_type", "duration", "duration_type", "eligibility", "fee", "fee_type",
    "low_fee", "high_fee", "avg_fees", "avg_salary", "growth", "specializations", "subjects", "top_exams", "careers",
    "about_content", "admission_process", "cutoff_content", "fees_content", "placements_content", "recruiters_content",
    "scope_content", "specialization_content", "subjects_content", "syllabus_content", "meta_title", "meta_description", "meta_keywords",
    "image", "syllabus_pdf_url",
  ],
  exams: [
    "official_website", "website", "name", "short_name", "full_name", "description", "page_summary", "category", "categories",
    "exam_type", "level", "mode", "frequency", "duration", "language", "eligibility", "age_limit", "application_mode",
    "application_start_date", "application_end_date", "exam_date", "result_date", "registration_url", "brochure_url",
    "application_process", "exam_pattern", "negative_marking", "cast_wise_fee", "gender_wise", "important_dates", "syllabus",
    "seats", "summary_content", "dates_content", "cutoff_content", "result_content", "counselling_content", "center_content",
    "preparation_tips", "meta_title", "meta_description", "meta_keywords", "image", "logo",
  ],
  careers: [
    "official_website", "name", "domain", "short_description", "description", "page_summary", "avg_salary", "growth",
    "experience_required", "top_skills", "top_companies", "job_roles", "related_courses", "related_exams",
    "meta_title", "meta_description", "meta_keywords", "image",
  ],
  scholarships: [
    "official_website", "title", "provider", "description", "page_summary", "category", "level", "amount", "deadline",
    "eligibility", "apply_url", "meta_title", "meta_description", "image",
  ],
  articles: [
    "official_website", "title", "description", "content", "category", "vertical", "tags", "meta_title", "meta_description", "meta_keywords", "featured_image",
  ],
  study_material: ["official_website", "name", "description", "cover_image"],
  college_study: ["official_website", "name", "short_name", "state", "city", "logo", "description", "total_semesters", "meta_title", "meta_description"],
  cat_universe: ["official_website", "title", "subtitle", "description", "detail_points", "audience_text", "meta_title", "meta_description"],
};

const MEDIA_ARRAY_FIELDS = new Set(["carousel_images", "gallery_images", "approval_logos"]);
const MEDIA_URL_FIELDS = new Set([
  "image", "logo", "cover_image", "featured_image", "brochure_url", "syllabus_pdf_url",
  "banner_ad_image", "square_ad_image",
]);

const BLOCKED_HOST_PARTS = [
  "shiksha", "careers360", "collegedunia", "collegedekho", "collegebatch", "getmyuni", "collegepravesh",
  "kollegeapply", "pagalguy", "wikipedia", "quora", "reddit", "facebook", "instagram", "youtube", "linkedin",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function normalizeUrl(value: unknown) {
  try {
    const url = new URL(String(value || "").trim());
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    return url.toString();
  } catch { return ""; }
}

function hostOf(value: string) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function isBlockedHost(host: string) {
  return !host || BLOCKED_HOST_PARTS.some((part) => host.includes(part));
}

function sameOfficialDomain(candidate: string, officialHost: string) {
  const host = hostOf(candidate);
  return !!host && !isBlockedHost(host) && (host === officialHost || host.endsWith(`.${officialHost}`) || officialHost.endsWith(`.${host}`));
}

function collectCitationUrls(value: unknown, output = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => collectCitationUrls(item, output));
  else if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.url === "string") {
      const url = normalizeUrl(object.url);
      if (url) output.add(url);
    }
    Object.entries(object).forEach(([key, item]) => { if (key !== "text") collectCitationUrls(item, output); });
  }
  return output;
}

function pageMatchesEntity(text: string, name: string) {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const tokens = [...new Set(name.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((token) => token.length >= 3))];
  return tokens.length > 0 && tokens.filter((token) => normalized.includes(token)).length >= Math.min(2, tokens.length);
}

function parseJson(raw: string) {
  const cleaned = String(raw || "{}").replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Claude did not return a JSON object");
  }
}

async function parseOrRepair(config: BlogAiConfig, raw: string) {
  try { return parseJson(raw); } catch (error) {
    const fixed = await generateBlogJson(config, `Repair this malformed JSON. Preserve facts and URLs. Return only one valid JSON object.\n\n${raw}`);
    try { return parseJson(fixed); } catch { throw error; }
  }
}

async function requireAdmin(req: Request, admin: any) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required");
  const { data } = await admin.auth.getUser(token);
  if (!data.user) throw new Error("Invalid session");
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Admin permission required");
  return data.user;
}

async function requireTickAccess(req: Request, admin: any) {
  const supplied = req.headers.get("x-data-cleaner-secret") || "";
  if (supplied) {
    const { data } = await admin.from("data_cleaning_settings").select("scheduler_token").eq("id", "default").maybeSingle();
    if (data?.scheduler_token && supplied === data.scheduler_token) return null;
  }
  return requireAdmin(req, admin);
}

function compactExisting(row: Record<string, unknown>, entityType: string) {
  const allowed = new Set(["id", "slug", ...(ALLOWED_FIELDS[entityType] || [])]);
  return Object.fromEntries(Object.entries(row).filter(([key]) => allowed.has(key)));
}

function seedOfficialUrl(row: Record<string, unknown>) {
  for (const key of ["official_website", "website", "registration_url", "apply_url", "brochure_url"]) {
    const value = normalizeUrl(row[key]);
    const host = hostOf(value);
    if (value && !isBlockedHost(host)) return value;
  }
  return "";
}

async function fetchOfficialPage(url: string) {
  if (!url) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "DekhoCampus official-data-verification/1.0", Accept: "text/html,application/xhtml+xml,text/plain" },
    });
    if (!response.ok) return "";
    return (await response.text()).slice(0, 180_000)
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").slice(0, 24_000);
  } catch { return ""; } finally { clearTimeout(timer); }
}

async function researchWithClaude(config: BlogAiConfig, entityType: string, row: Record<string, unknown>) {
  const model = await resolveClaudeTextModel(config);
  const name = String(row.name || row.title || row.slug || "");
  const seedUrl = seedOfficialUrl(row);
  const directText = await fetchOfficialPage(seedUrl);
  const allowedFields = ALLOWED_FIELDS[entityType] || [];
  const prompt = `Today is ${new Date().toISOString().slice(0, 10)}. Audit this DekhoCampus ${entityType} record using ONLY first-party official sources: the institution or exam authority website, a government portal, statutory regulator, official scholarship provider, or official issuer. Never use education directories, aggregators, Wikipedia, forums, social media, snippets copied from third parties, or inferred facts.

Entity: ${name}
Existing record: ${JSON.stringify(compactExisting(row, entityType))}
Known official URL candidate: ${seedUrl || "none"}
Official page text, if directly retrievable: ${directText || "not available"}
Fields you may propose: ${allowedFields.join(", ")}

Find and verify the official website. Use current official facts only. Do not overwrite a valid field merely to rephrase it. Never invent fees, dates, rankings, placements, salary, cutoffs, approvals, URLs, or statistics. For fee ranges, store plain numeric values only in numeric fields and concise human-readable values in text fields. Established must be a four-digit integer. Dates must be unambiguous. Write useful, original SEO/GEO/AEO copy grounded only in verified facts, with clear headings where HTML is appropriate. Do not use an em dash.

For media fields, return only direct HTTPS links found on the verified official website: the institution logo, primary campus or content image, official gallery images, and official brochure/PDF where available. Do not use Google Images, social media, stock photos, hotlinked education-directory images, screenshots, or generated images. Leave a media field unchanged when the official source does not expose a suitable asset.

Return JSON only with this shape:
{"official_url":"https://...","confidence":0.0,"updates":{},"field_evidence":{"field":["https://official-source..."]},"warnings":[],"source_urls":["https://official-source..."]}
Every updated factual field must have field_evidence. If no official source can verify the identity, return confidence below 0.8 and updates {}.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": config.claudeKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model, max_tokens: 8192,
      system: "You are a conservative education data auditor. Official sources only. Return valid JSON only.",
      messages: [{ role: "user", content: prompt }],
      tools: [{
        type: "web_search_20250305", name: "web_search", max_uses: 5,
        user_location: { type: "approximate", country: "IN", timezone: "Asia/Kolkata" },
      }],
    }),
  });
  if (!response.ok) {
    if (!seedUrl || !directText || !pageMatchesEntity(directText, name)) throw new Error(`Claude official-source research failed (${response.status}): ${(await response.text()).slice(0, 350)}`);
    const raw = await generateBlogJson(config, `${prompt}\nWeb search is unavailable. Use only the supplied official page text and known official URL.`);
    return { parsed: await parseOrRepair(config, raw), citationUrls: [seedUrl], model, usage: {} };
  }
  const payload = await response.json();
  const raw = (payload.content || []).filter((block: any) => block.type === "text").map((block: any) => block.text || "").join("");
  return { parsed: await parseOrRepair(config, raw), citationUrls: [...collectCitationUrls(payload)], model, usage: payload.usage || {} };
}

function cleanString(value: unknown, max = 100_000) {
  return String(value ?? "").replace(/[\u2013\u2014]/g, "-").replace(/\0/g, "").trim().slice(0, max);
}

function normalizeValue(field: string, value: unknown, current: unknown) {
  if (value === null || value === undefined) return undefined;
  if (field === "established") {
    const year = Number(String(value).match(/(?:18|19|20)\d{2}/)?.[0]);
    return year >= 1800 && year <= new Date().getFullYear() ? year : undefined;
  }
  if (typeof current === "number" || ["fee", "low_fee", "high_fee"].includes(field)) {
    const number = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  }
  if (typeof current === "boolean") return typeof value === "boolean" ? value : undefined;
  if (Array.isArray(current) || MEDIA_ARRAY_FIELDS.has(field)) return Array.isArray(value) ? [...new Set(value.map((item) => normalizeUrl(item)).filter(Boolean))].slice(0, 100) : undefined;
  if (typeof current === "object" && current !== null) return typeof value === "object" ? value : undefined;
  if (field === "meta_title") return cleanString(value, 65);
  if (field === "meta_description") return cleanString(value, 170);
  if (field === "page_summary") return cleanString(value, 600);
  if (field.includes("url") || field === "website" || field === "official_website" || MEDIA_URL_FIELDS.has(field)) return normalizeUrl(value) || undefined;
  return cleanString(value);
}

function buildVerifiedUpdate(entityType: string, row: Record<string, unknown>, research: any, citationUrls: string[]) {
  const officialUrl = normalizeUrl(research.official_url || seedOfficialUrl(row));
  const officialHost = hostOf(officialUrl);
  if (!officialUrl || isBlockedHost(officialHost)) return { update: {}, sources: [], warnings: ["No acceptable official website was verified"] };

  const cited = [...new Set(citationUrls.map(normalizeUrl).filter(Boolean))];
  const officialSources = cited.filter((url) => sameOfficialDomain(url, officialHost));
  const sources = [...new Set(officialSources)].slice(0, 30);
  if (!sources.length) return { update: {}, sources: [], warnings: ["The proposed source was not present in Claude citations"] };

  const allowed = new Set(ALLOWED_FIELDS[entityType] || []);
  const evidence = research.field_evidence && typeof research.field_evidence === "object" ? research.field_evidence : {};
  const update: Record<string, unknown> = { official_website: officialUrl };
  for (const [field, value] of Object.entries(research.updates || {})) {
    if (!allowed.has(field)) continue;
    const fieldSources = Array.isArray(evidence[field]) ? evidence[field].map(normalizeUrl) : [];
    const hasOfficialEvidence = fieldSources.some((url: string) => sameOfficialDomain(url, officialHost) && sources.includes(url));
    const isSeoField = ["meta_title", "meta_description", "meta_keywords", "page_summary"].includes(field);
    if (!hasOfficialEvidence && !isSeoField) continue;
    const normalized = normalizeValue(field, value, row[field]);
    if (normalized !== undefined && JSON.stringify(normalized) !== JSON.stringify(row[field])) update[field] = normalized;
  }
  return { update, sources, warnings: Array.isArray(research.warnings) ? research.warnings.map((w: unknown) => cleanString(w, 500)) : [] };
}

async function completeItem(admin: any, item: any, status: string, values: Record<string, unknown>) {
  await admin.from("data_cleaning_items").update({ status, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...values }).eq("id", item.id);
  await admin.rpc("refresh_data_cleaning_job", { _job_id: item.job_id });
}

async function processItem(admin: any, config: BlogAiConfig, item: any) {
  const table = TABLES[item.entity_type];
  if (!table) return completeItem(admin, item, "failed", { error_message: "Unsupported content type" });
  await admin.from("data_cleaning_jobs").update({ current_entity: item.entity_type, current_name: item.entity_name, message: `Verifying ${item.entity_name}`, updated_at: new Date().toISOString() }).eq("id", item.job_id);
  try {
    const { data: row, error } = await admin.from(table).select("*").eq("id", item.entity_id).maybeSingle();
    if (error) throw error;
    if (!row) return completeItem(admin, item, "skipped", { error_message: "Record no longer exists" });
    const result = await researchWithClaude(config, item.entity_type, row);
    await logAiUsage(admin, {
      provider: "anthropic", model: result.model, feature: "data-cleaner", operation: item.entity_type,
      inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens,
      requestId: item.id, metadata: { job_id: item.job_id, entity_id: item.entity_id },
    });
    const confidence = Math.max(0, Math.min(1, Number(result.parsed.confidence || 0)));
    const verified = buildVerifiedUpdate(item.entity_type, row, result.parsed, result.citationUrls);
    const changedFields = Object.keys(verified.update).filter((field) => JSON.stringify(row[field]) !== JSON.stringify(verified.update[field]));
    if (confidence < 0.95 || !verified.sources.length || !changedFields.length) {
      return completeItem(admin, item, "skipped", {
        official_url: normalizeUrl(result.parsed.official_url), source_urls: verified.sources, confidence,
        before_data: compactExisting(row, item.entity_type), proposed_data: verified.update, changed_fields: changedFields,
        warnings: verified.warnings, error_message: confidence < 0.95 ? "Not enough official evidence - left unchanged" : "No verified changes found",
      });
    }

    const { data: job } = await admin.from("data_cleaning_jobs").select("apply_mode,status").eq("id", item.job_id).single();
    if (job?.status === "cancelled") return completeItem(admin, item, "cancelled", { error_message: "Cancelled before changes were applied" });
    const audit = {
      official_url: verified.update.official_website, source_urls: verified.sources, confidence,
      before_data: compactExisting(row, item.entity_type), proposed_data: verified.update,
      changed_fields: changedFields, warnings: verified.warnings,
    };
    if (job?.apply_mode !== "auto_apply") return completeItem(admin, item, "review", audit);

    const update = {
      ...verified.update,
      data_verified_at: new Date().toISOString(), data_source_urls: verified.sources,
      data_quality_score: Math.round(confidence * 100), updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await admin.from(table).update(update).eq("id", item.entity_id);
    if (updateError) throw updateError;
    return completeItem(admin, item, "updated", audit);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return completeItem(admin, item, item.attempt >= 3 ? "failed" : "failed", { error_message: message.slice(0, 1200) });
  }
}

async function processTick(admin: any, serviceRole: string, functionUrl: string) {
  console.log("[data-cleaner] tick started");
  const { data: settings } = await admin.from("data_cleaning_settings").select("worker_concurrency,scheduler_token").eq("id", "default").single();
  const config = await loadBlogAiConfig(admin, serviceRole);
  console.log("[data-cleaner] AI configuration loaded");
  const { data: items, error } = await admin.rpc("claim_data_cleaning_items", { _limit: settings?.worker_concurrency || 2 });
  if (error) throw error;
  if (!items?.length) { console.log("[data-cleaner] no queued items"); return; }
  console.log(`[data-cleaner] claimed ${items.length} item(s)`);
  await Promise.all(items.map((item: any) => processItem(admin, config, item)));
  const { data: remaining } = await admin.from("data_cleaning_items").select("id", { count: "exact", head: false }).eq("job_id", items[0].job_id).eq("status", "queued").limit(1);
  if (remaining?.length) {
    await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY") || "", "x-data-cleaner-secret": settings.scheduler_token },
      body: JSON.stringify({ action: "tick" }),
    }).catch(() => undefined);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRole);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "tick");
    if (action === "tick") {
      await requireTickAccess(req, admin);
      EdgeRuntime.waitUntil(processTick(admin, serviceRole, `${supabaseUrl}/functions/v1/admin-data-cleaner`).catch((error) => console.error("[data-cleaner] background tick failed", error)));
      return json({ success: true, accepted: true });
    }

    const user = await requireAdmin(req, admin);
    if (action === "start") {
      const entityTypes = [...new Set((Array.isArray(body.entity_types) ? body.entity_types : []).filter((type: string) => TABLES[type]))];
      const { data: jobId, error } = await admin.rpc("create_data_cleaning_job", {
        _entity_types: entityTypes, _batch_size: Number(body.batch_size || 100),
        _max_records: body.max_records ? Number(body.max_records) : null,
        _apply_mode: body.apply_mode === "auto_apply" ? "auto_apply" : "review", _created_by: user.id,
      });
      if (error) throw error;
      EdgeRuntime.waitUntil(processTick(admin, serviceRole, `${supabaseUrl}/functions/v1/admin-data-cleaner`).catch((error) => console.error("[data-cleaner] start tick failed", error)));
      return json({ success: true, job_id: jobId });
    }
    if (["pause", "resume", "cancel"].includes(action)) {
      const status = action === "pause" ? "paused" : action === "resume" ? "running" : "cancelled";
      const { error } = await admin.from("data_cleaning_jobs").update({ status, message: action === "resume" ? "Resumed" : `${action[0].toUpperCase()}${action.slice(1)}`, updated_at: new Date().toISOString() }).eq("id", body.job_id);
      if (error) throw error;
      if (action === "cancel") await admin.from("data_cleaning_items").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("job_id", body.job_id).eq("status", "queued");
      if (action === "resume") EdgeRuntime.waitUntil(processTick(admin, serviceRole, `${supabaseUrl}/functions/v1/admin-data-cleaner`).catch((error) => console.error("[data-cleaner] resume tick failed", error)));
      return json({ success: true });
    }
    if (["approve", "reject"].includes(action)) {
      const { data: item, error } = await admin.from("data_cleaning_items").select("*").eq("id", body.item_id).single();
      if (error) throw error;
      if (action === "reject") {
        await completeItem(admin, item, "skipped", { error_message: "Rejected by administrator" });
        return json({ success: true });
      }
      const table = TABLES[item.entity_type];
      const update = {
        ...(item.proposed_data || {}), data_verified_at: new Date().toISOString(), data_source_urls: item.source_urls,
        data_quality_score: Math.round(Number(item.confidence || 0) * 100), updated_at: new Date().toISOString(),
      };
      const { error: applyError } = await admin.from(table).update(update).eq("id", item.entity_id);
      if (applyError) throw applyError;
      await completeItem(admin, item, "updated", { error_message: null });
      return json({ success: true });
    }
    if (action === "approve_all") {
      const { data: reviewItems, error } = await admin.from("data_cleaning_items").select("*").eq("job_id", body.job_id).eq("status", "review").gte("confidence", 0.95).limit(5000);
      if (error) throw error;
      let approved = 0;
      const failures: string[] = [];
      for (const item of reviewItems || []) {
        try {
          const table = TABLES[item.entity_type];
          if (!table || !item.source_urls?.length) continue;
          const update = { ...(item.proposed_data || {}), data_verified_at: new Date().toISOString(), data_source_urls: item.source_urls, data_quality_score: Math.round(Number(item.confidence || 0) * 100), updated_at: new Date().toISOString() };
          const { error: applyError } = await admin.from(table).update(update).eq("id", item.entity_id);
          if (applyError) throw applyError;
          await completeItem(admin, item, "updated", { error_message: null }); approved += 1;
        } catch (applyError) { failures.push(`${item.entity_name}: ${applyError instanceof Error ? applyError.message : String(applyError)}`); }
      }
      return json({ success: failures.length === 0, approved, failures: failures.slice(0, 20) });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-data-cleaner", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
