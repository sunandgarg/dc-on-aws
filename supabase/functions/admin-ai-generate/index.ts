// Admin AI bulk content generator — full-column, official-source-first.
// Generates rich, SEO/GEO-2026 compliant records for any entity. The schema
// for each entity covers EVERY column of its table so the AI never leaves
// a field blank if data is actually verifiable from the official source.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { geminiGenerate, GEMINI_MODEL } from "../_shared/gemini.ts";
import { blogTextProviderLabel, generateAndUploadBlogCover, generateBlogJson, loadBlogAiConfig, resolveClaudeTextModel } from "../_shared/blog-ai.ts";
import { applyBlogTextRuntimeControl, applyImageRuntimeControl, getAiRuntimeControl } from "../_shared/ai-control.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EntityType =
  | "colleges" | "courses" | "exams" | "scholarships" | "careers" | "articles"
  | "promoted_programs" | "companies" | "approval_bodies" | "faqs" | "landing_pages"
  | "study_subjects" | "study_chapters" | "study_resources" | "study_boards";

type GenOptions = {
  author_id?: string | null;        // content writer (authors.id) to stamp on output
  author_name?: string | null;      // optional — used as byline text in `author` column
  tone?: string;
  audience?: string;
  depth?: "concise" | "standard" | "in-depth";
  language?: "English" | "Hindi" | "Bilingual";
  region?: string;
  vertical?: string;
  category_hint?: string;
  is_active?: boolean;
  status?: string;
  model?: string;                   // friendly key or full gateway model id
  automatic_research?: boolean;
  research_competitors?: boolean;
  research_trends?: boolean;
  research_viral?: boolean;
  check_own_news?: boolean;
  competitor_sources?: string[];
  word_limit?: number;
};

const DEFAULT_ARTICLE_RESEARCH_SOURCES = [
  "https://www.shiksha.com/news",
  "https://www.careers360.com/articles",
  "https://news.kollegeapply.com",
  "https://collegedunia.com/news",
  "https://www.collegedekho.com/news",
  "https://www.pagalguy.com/mba/articles",
  "https://www.dekhocampus.com/news",
  "https://www.dekhocampus.in/news",
];

const GOOGLE_TRENDS_EDUCATION_SOURCE = "https://trends.google.com/trending/rss?geo=IN";
const VIRAL_EDUCATION_SOURCES = [
  "https://news.google.com/rss/search?q=education+OR+college+OR+admission+OR+exam+India&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=JEE+OR+NEET+OR+CUET+OR+CAT+OR+board+exam+India&hl=en-IN&gl=IN&ceid=IN:en",
];

const SYSTEM_RULES = `You are DekhoCampus content engine for 2026.

SOURCE-OF-TRUTH RULES (NON-NEGOTIABLE):
0a. EVERY factual field (fees, eligibility, ranking, NAAC grade, established year, placement stats, exam dates, scholarship amount, deadline, syllabus, etc.) MUST be sourced from the OFFICIAL website of that entity (institute's own .ac.in / .edu / official domain, NIRF/UGC/AICTE/NAAC official portals, official exam authority site such as nta.ac.in / cbse.gov.in, official scholarship portal like scholarships.gov.in). Third-party aggregators (collegedunia, shiksha, careers360, getmyuni, etc.) are NEVER acceptable as primary source.
0b. After drafting, re-verify each fact against the official source. If you are not 100% certain a field matches the official site exactly, OMIT that field (set to "" or null) rather than guess.
0c. Cross-check with at least one other authoritative source (NIRF ranking PDF, UGC list, AICTE approval list, official press release/notification). If sources disagree, prefer the entity's own official site.
0d. Never invent statistics. Numbers must be exact as on the official site or be omitted.

STRICT CONTENT RULES:
1. SEO 2026: keyword-rich H2/H3, semantic HTML, FAQ schema-friendly, scannable lists.
2. GEO (Generative Engine Optimization): factual, citation-worthy, definitive phrasing.
3. UX/UI 2026: short opening hook (1-2 lines), bullet-heavy, comparison tables in HTML <table>, no fluff.
4. Human psychology hooks: open with curiosity gap / stat / pain point. Use "you" voice. End each long section with a soft CTA.
5. Internal linking (MANDATORY): when you mention any entity that exists in INTERNAL_DB, wrap it as <a href="/{type}/{slug}">Name</a>. Never use external links inside content. Aim for 4-8 internal links per long article.
6. HTML must be clean (h2, h3, p, ul/ol/li, table/thead/tbody/tr/th/td, strong, a). No <script>, no inline style, no class attributes.
7. FILL EVERY FIELD listed in the schema. Only leave a field empty ("" / [] / null) when the official source genuinely does not provide that fact.
8. slug must be lowercase-hyphen, URL-safe, unique.
9. Return ONLY valid JSON matching the requested schema. No prose, no markdown fences.`;

async function fetchInternalDb(sb: any) {
  const [colleges, courses, exams, scholarships, careers] = await Promise.all([
    sb.from("colleges").select("slug,name,city").eq("is_active", true).limit(400),
    sb.from("courses").select("slug,name").eq("is_active", true).limit(200),
    sb.from("exams").select("slug,name").eq("is_active", true).limit(200),
    sb.from("scholarships").select("slug,title").eq("is_active", true).limit(100),
    sb.from("career_profiles").select("slug,name").eq("is_active", true).limit(100),
  ]);
  return {
    colleges: colleges.data || [],
    courses: courses.data || [],
    exams: exams.data || [],
    scholarships: scholarships.data || [],
    careers: careers.data || [],
  };
}

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coverSvg(title: string, kicker: string) {
  const words = String(title || "DekhoCampus update").split(/\s+/).slice(0, 13).join(" ");
  const label = String(kicker || "Education update").toUpperCase().slice(0, 42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f172a"/><stop offset=".52" stop-color="#1d4ed8"/><stop offset="1" stop-color="#f5821f"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1310" cy="130" r="330" fill="#fff" opacity=".09"/><circle cx="170" cy="830" r="370" fill="#fef3c7" opacity=".11"/><text x="115" y="145" fill="#dbeafe" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="5">DEKHOCAMPUS - ${esc(label)}</text><foreignObject x="115" y="245" width="1280" height="430"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:white;font-size:78px;line-height:1.12;font-weight:850">${esc(words)}</div></foreignObject><text x="115" y="820" fill="#e0f2fe" font-family="Arial,sans-serif" font-size="30">Fresh guidance for students and parents</text></svg>`;
}

async function fetchArticleResearchSignals(sources: string[]) {
  const uniqueSources = [...new Set(sources.map((source) => String(source || "").trim()).filter((source) => /^https:\/\//i.test(source)))].slice(0, 10);
  const results = await Promise.allSettled(uniqueSources.map(async (source) => {
    const response = await fetch(source, {
      headers: {
        "User-Agent": "DekhoCampus editorial research bot/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return { url: source, ok: false, signal: `Unavailable ${response.status}` };
    const signal = stripHtml((await response.text()).slice(0, 160000)).slice(0, 4200);
    return { url: source, ok: true, signal };
  }));
  return results.map((result, index) => result.status === "fulfilled" ? result.value : { url: uniqueSources[index], ok: false, signal: "Fetch failed" });
}

function normalizedTitle(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(2024|2025|2026|the|a|an|and|or|for|in|of|to|on|with|latest|news|update)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(left: string, right: string) {
  const a = new Set(normalizedTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizedTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / Math.min(a.size, b.size);
}

// ============ FULL-COLUMN SCHEMAS ============
// Every key here maps 1:1 with a real DB column. Author-managed / system
// columns (id, created_at, updated_at, *_count, views, featured_rank,
// priority_updated_at, short_id, created_by) are intentionally omitted.
function schemaFor(type: EntityType): string {
  switch (type) {
    case "colleges":
      return `Array of objects, each (FILL EVERY FIELD when official source has the data):
{ "name": string, "short_name": string, "slug": string,
  "location": string, "city": string, "state": string, "secondary_state": string, "secondary_city": string,
  "type": "Private"|"Government"|"Deemed"|"Autonomous",
  "category": "Engineering"|"Medical"|"Management"|"Law"|"Design"|"Science"|"Commerce"|"Arts"|"Pharmacy"|"Agriculture",
  "categories": string[],
  "rating": number (0-5), "reviews": number,
  "fees": string, "established": number,
  "naac_grade": string, "ranking": string, "placement": string, "cutoff": string,
  "admission_deadline": string, "scholarship_available": boolean,
  "affiliation_kind": "standalone"|"affiliated"|"university",
  "parent_university_slug": string (slug from INTERNAL_DB.colleges if affiliated, else ""),
  "apply_cta_mode": "lead"|"external", "apply_url": string,
  "description": string (2-3 sentence hook),
  "highlights": string[], "facilities": string[], "approvals": string[], "approval_logo_names": string[],
  "top_recruiters": string[], "tags": string[],
  "related_courses": string[] (use course slugs from INTERNAL_DB),
  "related_exams": string[] (use exam slugs from INTERNAL_DB),
  "admission_criteria_points": string[],
  "page_summary": string (200-400 words HTML overview with internal links),
  "eligibility_criteria": string (HTML), "admission_process": string (HTML),
  "scholarship_details": string (HTML), "hostel_life": string (HTML),
  "course_fee_content": string (HTML with fee table), "placement_content": string (HTML with placement stats table),
  "rankings_content": string (HTML with ranking table), "facilities_content": string (HTML),
  "meta_title": string (<60 chars), "meta_description": string (<160 chars), "meta_keywords": string }`;
    case "courses":
      return `Array of objects, FILL EVERY FIELD:
{ "name": string, "full_name": string, "slug": string,
  "category": string, "categories": string[], "domain": string,
  "level": "Undergraduate"|"Postgraduate"|"Diploma"|"Doctorate",
  "duration": string, "duration_type": string, "mode": "Full-Time"|"Part-Time"|"Online"|"Hybrid", "study_type": string,
  "fee_type": string, "fee": string, "low_fee": number, "high_fee": number,
  "avg_fees": string, "avg_salary": string, "growth": string, "rating": number,
  "short_description": string, "description": string, "eligibility": string,
  "top_exams": string[], "careers": string[], "subjects": string[], "specializations": string[],
  "page_summary": string (HTML 200-400 words with internal links),
  "about_content": string (HTML), "scope_content": string (HTML), "subjects_content": string (HTML),
  "placements_content": string (HTML), "admission_process": string (HTML),
  "fees_content": string (HTML), "cutoff_content": string (HTML),
  "specialization_content": string (HTML), "recruiters_content": string (HTML), "syllabus_content": string (HTML),
  "syllabus_pdf_url": string,
  "meta_title": string, "meta_description": string, "meta_keywords": string }`;
    case "exams":
      return `Array of objects, FILL EVERY FIELD from the official exam authority site:
{ "name": string, "full_name": string, "short_name": string, "slug": string,
  "category": string, "categories": string[], "level": string,
  "exam_type": string, "mode": string, "application_mode": string, "language": string,
  "frequency": string, "duration": string,
  "exam_date": string, "application_start_date": string, "application_end_date": string, "result_date": string,
  "website": string, "registration_url": string,
  "negative_marking": string, "seats": string, "age_limit": string, "applicants": string,
  "eligibility": string, "description": string,
  "important_dates": string (HTML table), "syllabus": string (HTML), "top_colleges": string[],
  "page_summary": string (HTML 200-400 words),
  "summary_content": string (HTML), "application_process": string (HTML),
  "exam_pattern": string (HTML table), "cutoff_content": string (HTML),
  "preparation_tips": string (HTML), "counselling_content": string (HTML),
  "center_content": string (HTML), "question_paper": string (HTML),
  "gender_wise": string (HTML), "result_content": string (HTML),
  "cast_wise_fee": string (HTML), "dates_content": string (HTML),
  "is_top_exam": boolean,
  "meta_title": string, "meta_description": string, "meta_keywords": string }`;
    case "scholarships":
      return `Array of objects:
{ "title": string, "slug": string, "provider": string, "amount": string,
  "eligibility": string, "deadline": string, "category": string, "level": "UG"|"PG"|"PhD"|"All",
  "apply_url": string, "is_live": boolean,
  "description": string (HTML with internal links),
  "page_summary": string (HTML 200-400 word summary),
  "meta_title": string, "meta_description": string }`;
    case "careers":
      return `Array of objects, FILL EVERY FIELD:
{ "name": string, "slug": string, "domain": string,
  "short_description": string, "description": string (HTML),
  "avg_salary": string, "growth": string, "experience_required": string,
  "top_skills": string[], "top_companies": string[],
  "related_courses": string[] (slugs from INTERNAL_DB.courses),
  "related_exams": string[] (slugs from INTERNAL_DB.exams),
  "job_roles": string[], "icon_emoji": string,
  "page_summary": string (HTML 200-400 words),
  "is_featured": boolean,
  "meta_title": string, "meta_description": string, "meta_keywords": string }`;
    case "articles":
      return `Array of objects:
{ "title": string, "slug": string, "description": string (140 char hook),
  "content": string (long HTML with h2/h3, lists, table, FAQ block, 5-8 internal links),
  "vertical": string, "category": string, "author": string (byline text), "tags": string[],
  "featured_image": string ("" if unknown), "status": "draft"|"published",
  "meta_title": string, "meta_description": string, "meta_keywords": string,
  "cover_kicker": string, "cover_svg": string,
  "entity_suggestions": [{ "entity_type": "college"|"course"|"exam"|"career"|"scholarship"|"article", "entity_slug": string, "label": string }],
  "research_notes": string }`;
    case "promoted_programs":
      return `Array of objects, FILL EVERY FIELD:
{ "slug": string, "title": string, "college_name": string,
  "college_slug": string (use slug from INTERNAL_DB.colleges if matching),
  "program_type": string, "category_slug": string, "course_slug": string,
  "duration": string, "delivery_mode": "Online"|"Hybrid"|"Offline",
  "country": "India"|"Abroad", "tag": string, "badge": string,
  "badge_variant": "default"|"success"|"warning",
  "original_price": number, "discount_percent": number, "emi_starts_at": string,
  "rating": number, "learners_count": string, "ranking_text": string,
  "batch_start_date": string, "schedule": string,
  "apply_url": string, "brochure_url": string, "youtube_url": string,
  "summary": string, "about_program": string (HTML with internal links),
  "eligibility": string (HTML), "why_this_program": string (HTML), "who_should_apply": string (HTML),
  "highlights": string[], "learning_outcomes": string[], "tools_taught": string[],
  "curriculum": object (JSON modules), "faculty": object[] (name, role, image),
  "mentors": object[], "testimonials": object[],
  "faqs": object[] (question, answer), "fee_breakdown": object[],
  "placement_stats": object, "program_stats": object,
  "application_steps": object[], "top_companies": string[], "partner_logos": string[],
  "meta_title": string, "meta_description": string }`;
    case "companies":
      return `Array of objects:
{ "name": string, "sector": string, "website": string, "logo": string ("" if unknown) }`;
    case "approval_bodies":
      return `Array of objects:
{ "code": string (uppercase, e.g. "AICTE"), "name": string, "description": string, "logo_url": string ("" if unknown), "display_order": number }`;
    case "faqs":
      return `Array of objects:
{ "question": string, "answer": string (HTML with internal links),
  "page": "homepage"|"colleges"|"courses"|"exams"|"scholarships"|"careers",
  "item_slug": string ("" for page-level FAQ, else entity slug),
  "display_order": number }`;
    case "landing_pages":
      return `Array of objects, FILL EVERY FIELD:
{ "slug": string, "brand_name": string, "logo_url": string,
  "eyebrow": string, "hero_title": string, "hero_subtitle": string,
  "primary_cta_label": string, "primary_cta_href": string,
  "secondary_cta_label": string, "secondary_cta_href": string,
  "stats": object[] (label, value),
  "form_title": string, "form_subtitle": string, "form_submit_label": string, "form_consent_text": string,
  "form_courses": string[],
  "courses_title": string, "courses_subtitle": string, "courses": object[] (name, duration, fees),
  "why_title": string, "why_subtitle": string, "why_items": object[] (title, description, icon),
  "testimonials_title": string, "testimonials": object[] (name, role, quote, rating),
  "faqs": object[] (question, answer),
  "footer_text": string, "disclosure_text": string,
  "lp_type": "single"|"multiple", "multiple_layout": string, "exam_ad": string,
  "advertiser_name": string, "advertiser_address": string, "advertiser_contact": string,
  "meta_title": string, "meta_description": string, "meta_keywords": string,
  "theme": string }`;
    case "study_boards":
      return `Array of objects:
{ "slug": string, "name": string, "description": string, "icon_emoji": string, "display_order": number }`;
    case "study_subjects":
      return `Array of objects:
{ "slug": string, "name": string, "class_num": number, "board_slug": string,
  "description": string, "icon_emoji": string, "display_order": number }`;
    case "study_chapters":
      return `Array of objects:
{ "slug": string, "name": string, "chapter_number": number, "description": string, "display_order": number }`;
    case "study_resources":
      return `Array of objects:
{ "title": string, "description": string, "resource_type": "pyq"|"notes"|"ncert"|"sample",
  "year": number, "file_url": string ("" if unknown),
  "content_html": string (HTML long-form notes / solutions / answer key), "display_order": number }`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { entity_type, names, topic, count, options } = await req.json() as {
      entity_type: EntityType; names?: string[]; topic?: string; count?: number;
      options?: GenOptions;
    };
    if (!entity_type) throw new Error("entity_type required");

    const opts: GenOptions = options || {};
    const tone = opts.tone || "Authoritative-yet-friendly";
    const audience = opts.audience || "Indian students & parents (Class 11 – PG aspirants)";
    const depth = opts.depth || "in-depth";
    const language = opts.language || "English";
    const region = opts.region || "India";

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const runtimeControl = await getAiRuntimeControl(sb, "admin-ai-generate");
    if (!opts.model && runtimeControl.provider) opts.model = runtimeControl.provider;
    const internal = await fetchInternalDb(sb);

    const TABLE_META: Record<string, { table: string; keyField: string }> = {
      colleges:          { table: "colleges",          keyField: "slug" },
      courses:           { table: "courses",           keyField: "slug" },
      exams:             { table: "exams",             keyField: "slug" },
      scholarships:      { table: "scholarships",      keyField: "slug" },
      careers:           { table: "career_profiles",   keyField: "slug" },
      articles:          { table: "articles",          keyField: "slug" },
      promoted_programs: { table: "promoted_programs", keyField: "slug" },
      landing_pages:     { table: "landing_pages",     keyField: "slug" },
      companies:         { table: "companies",         keyField: "name" },
      approval_bodies:   { table: "approval_bodies",   keyField: "code" },
      faqs:              { table: "faqs",              keyField: "question" },
      study_boards:      { table: "study_boards",      keyField: "slug" },
      study_subjects:    { table: "study_subjects",    keyField: "slug" },
      study_chapters:    { table: "study_chapters",    keyField: "slug" },
      study_resources:   { table: "study_resources",   keyField: "title" },
    };
    const meta = TABLE_META[entity_type] || { table: entity_type, keyField: "slug" };
    const existingSelection = entity_type === "articles" ? `${meta.keyField},title` : meta.keyField;
    const { data: existingRows } = await sb.from(meta.table).select(existingSelection).limit(5000);
    const existingKeys = new Set((existingRows || []).map((r: any) => r[meta.keyField]));
    const existingArticleTitles = entity_type === "articles"
      ? (existingRows || []).map((row: any) => ({ slug: row.slug, title: row.title })).filter((row: any) => row.title)
      : [];

    const internalDbStr = JSON.stringify({
      colleges: internal.colleges.slice(0, 200).map((c: any) => ({ s: c.slug, n: c.name })),
      courses: internal.courses.map((c: any) => ({ s: c.slug, n: c.name })),
      exams: internal.exams.map((c: any) => ({ s: c.slug, n: c.name })),
      scholarships: internal.scholarships.map((c: any) => ({ s: c.slug, n: c.title })),
      careers: internal.careers.map((c: any) => ({ s: c.slug, n: c.name })),
    });
    const selectedResearchSources = [
      ...(opts.research_competitors !== false ? (opts.competitor_sources?.length ? opts.competitor_sources : DEFAULT_ARTICLE_RESEARCH_SOURCES) : []),
      ...(opts.research_trends !== false ? [GOOGLE_TRENDS_EDUCATION_SOURCE] : []),
      ...(opts.research_viral !== false ? VIRAL_EDUCATION_SOURCES : []),
      ...(opts.check_own_news !== false ? ["https://www.dekhocampus.com/news", "https://www.dekhocampus.in/news"] : []),
    ];
    const articleSignals = entity_type === "articles" && opts.automatic_research
      ? await fetchArticleResearchSignals(selectedResearchSources)
      : [];
    const wordLimit = Number(opts.word_limit || (depth === "concise" ? 900 : depth === "standard" ? 1300 : 1800));

    const userPrompt = `Generate ${entity_type} records.

CONTENT BRIEF (apply to every record):
- Tone / Voice: ${tone}
- Target audience: ${audience}
- Depth: ${depth} (concise = short hooks; standard = balanced; in-depth = exhaustive long-form HTML)
- Language: ${language}
- Region focus: ${region}
${opts.vertical ? `- Vertical: ${opts.vertical}` : ""}
${opts.category_hint ? `- Preferred category: ${opts.category_hint}` : ""}
${opts.author_name ? `- Byline / author display name: ${opts.author_name}` : ""}
${entity_type === "articles" ? `- Target article length: around ${wordLimit} words
- Editorial style: original, natural, plain Indian education guidance. Use normal small hyphen '-' only. Do not use em dash.
- Optimise for SEO, GEO and AEO with useful headings, concise definitions, FAQ-ready answers and internal links.
- Do not claim "0 AI" or "human-written". Make the article genuinely useful and editor-review ready.` : ""}

WORKFLOW (must follow in order for every record):
 1. Identify the OFFICIAL website of this entity (institute's own domain / NTA / UGC / AICTE / NAAC / scholarships.gov.in etc.).
 2. Source every factual field from that official site only. Third-party aggregators are NOT acceptable as primary source.
 3. Cross-validate with at least one other authoritative source (NIRF, UGC list, AICTE list, official notification).
 4. Re-verify once more. If still not 100% certain a field matches the official source, OMIT that field ("" or null).
 5. Numbers (fees, ranks, year, dates, amounts) must be exact as on the official site — never approximate.
 6. FILL EVERY field defined in the schema; do not leave any column behind unless data is genuinely unavailable on the official source.

${names?.length ? `EXPLICIT NAMES (one record per name): ${JSON.stringify(names)}` : ""}
${topic ? `TOPIC: "${topic}". Expand to ${count || 5} relevant ${entity_type}.` : entity_type === "articles" && opts.automatic_research ? `DISCOVERY MODE: Select the ${count || 5} strongest current education topics from the supplied research signals. Prefer topics with clear Indian student utility, demonstrated search/news momentum and a genuine gap in DekhoCampus coverage.` : ""}
Existing ${meta.keyField}s already in our DB (regenerate them anyway with the LATEST official data — they will be shown as UPSERT in the admin preflight): ${JSON.stringify([...existingKeys].slice(0, 300))}
${entity_type === "articles" && opts.check_own_news !== false ? `EXISTING DEKHOCAMPUS NEWS TITLES (hard exclusion list): ${JSON.stringify(existingArticleTitles.slice(0, 1200))}
Do not generate the same story, a title rewrite, or a substantially overlapping search intent. Choose a different current topic or a meaningfully distinct angle.` : ""}

INTERNAL_DB (use these for internal hyperlinks inside HTML content fields):
${internalDbStr}

${articleSignals.length ? `COMPETITOR AND OWN-SITE RESEARCH SIGNALS:
Use these only to understand current topics, angles and gaps. Never copy titles, wording, paragraph structure, claims, images or proprietary analysis.
${JSON.stringify(articleSignals)}

For each generated article, include the most relevant entity_suggestions using slugs from INTERNAL_DB when the topic clearly maps to a college, course, exam, career or scholarship.` : ""}

Output schema:
${schemaFor(entity_type)}

Return ONLY a JSON array. No markdown, no commentary.`;

    // ───────── Provider routing ─────────
    // Default: call Google Gemini 2.5 Flash Lite directly (GEMINI_API_KEY).
    // Override: if admin selected a specific provider in `ai_providers` with a
    // saved key, we use that one.
    const requested = (opts.model || "").trim().toLowerCase();
    const { data: provRows } = await sb.from("ai_providers").select("*");
    const providers: any[] = provRows || [];
    const direct = providers.find(p =>
      p.api_key_encrypted &&
      (p.provider_name?.toLowerCase() === requested ||
       (requested && p.display_name?.toLowerCase().includes(requested)))
    );

    let text = "[]";
    let modelUsed: string;

    let blogAi: Awaited<ReturnType<typeof loadBlogAiConfig>> | null = null;
    if (entity_type === "articles") {
      blogAi = await loadBlogAiConfig(sb, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      if (!runtimeControl.provider || runtimeControl.provider === "anthropic") {
        await applyBlogTextRuntimeControl(sb, "admin-ai-generate", blogAi);
      }
      modelUsed = `${blogTextProviderLabel(blogAi.textModel)}:${blogAi.textModel}`;
      try {
        text = await generateBlogJson(blogAi, `${SYSTEM_RULES}\n\n${userPrompt}\n\nUse current SEO, GEO and AEO guidance. Never use an em dash. This is AI-assisted editor-reviewed work - never claim human authorship, undetectability or 0 AI. Return only valid JSON.`, { admin: sb, feature: "admin-ai-generate", operation: entityType });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || String(e), model_used: modelUsed }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
    } else if (direct) {
      let selectedModel = runtimeControl.model || direct.default_model;
      const isAnthropic = direct.provider_name === "anthropic" || (direct.base_url || "").includes("anthropic.com");
      if (isAnthropic && selectedModel.startsWith("auto-")) {
        selectedModel = await resolveClaudeTextModel({ claudeKey: direct.api_key_encrypted, openaiKey: "", textModel: selectedModel, imageModel: "gpt-image-1", imageQuality: "medium" });
      }
      modelUsed = `${direct.provider_name}:${selectedModel}`;
      let resp: Response;
      if (isAnthropic) {
        resp = await fetch(direct.base_url, {
          method: "POST",
          headers: {
            "x-api-key": direct.api_key_encrypted,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 8192,
            system: SYSTEM_RULES,
            messages: [{ role: "user", content: userPrompt + "\n\nReturn ONLY valid JSON. No prose, no markdown fences." }],
          }),
        });
      } else {
        const body: any = {
          model: selectedModel,
          messages: [
            { role: "system", content: SYSTEM_RULES },
            { role: "user", content: userPrompt },
          ],
        };
        if (direct.provider_name === "openai" || direct.provider_name === "gemini") {
          body.response_format = { type: "json_object" };
        }
        resp = await fetch(direct.base_url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${direct.api_key_encrypted}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      }
      if (!resp.ok) {
        const t = await resp.text();
        return new Response(JSON.stringify({ error: `AI provider ${resp.status}: ${t}`, model_used: modelUsed }), {
          status: resp.status, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const data = await resp.json();
      text = data.choices?.[0]?.message?.content
        ?? (Array.isArray(data.content) ? data.content.map((b: any) => b.text || "").join("") : "")
        ?? "[]";
    } else {
      // Default → Google Gemini direct
      const selectedModel = runtimeControl.model || GEMINI_MODEL;
      modelUsed = `gemini:${selectedModel}`;
      try {
        text = await geminiGenerate({
          system: SYSTEM_RULES,
          prompt: userPrompt,
          json: true,
          model: selectedModel,
        }) || "[]";
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || String(e), model_used: modelUsed }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    if (!text.startsWith("[") && !text.startsWith("{")) {
      const m = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (m) text = m[1];
    }


    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = { items: [] }; }
    const arr: any[] = Array.isArray(parsed) ? parsed
      : Array.isArray(parsed.items) ? parsed.items
      : Array.isArray(parsed.data) ? parsed.data
      : Array.isArray(parsed[entity_type]) ? parsed[entity_type]
      : [];

    // Stamp author + status flags after generation. Only the tables that
    // actually have these columns get them — we let upsert ignore the rest.
    const HAS_AUTHOR = new Set(["colleges","courses","exams","scholarships","career_profiles","articles","study_subjects"]);
    const HAS_STATUS = new Set(["colleges","courses","exams","career_profiles","articles","promoted_programs"]);
    const stamped = await Promise.all(arr.map(async r => {
      const out: any = { ...r };
      if (meta.table === "articles") {
        const title = String(out.title || out.name || topic || "DekhoCampus update");
        const slug = String(out.slug || title).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
        if (blogAi) {
          await applyImageRuntimeControl(sb, blogAi);
          out.featured_image = await generateAndUploadBlogCover(sb, blogAi, slug, out.hero_hook || title);
        }
        if (!Array.isArray(out.entity_suggestions)) out.entity_suggestions = [];
      }
      if (opts.author_id && HAS_AUTHOR.has(meta.table)) out.author_id = opts.author_id;
      if (opts.author_name && meta.table === "articles" && !out.author) out.author = opts.author_name;
      if (HAS_STATUS.has(meta.table) && !out.status) out.status = opts.status || "draft";
      if ("is_active" in out === false) out.is_active = opts.is_active ?? true;
      return out;
    }));

    // Preflight classification: every item is returned with `_action`
    // ("insert" for new keys, "upsert" for keys already in DB). The admin UI
    // shows a preview before any write happens, and may filter as needed.
    const duplicateTitles: { generated_title: string; existing_title: string; existing_slug: string; similarity: number }[] = [];
    const uniqueStamped = entity_type === "articles" && opts.check_own_news !== false
      ? stamped.filter((row) => {
          const match = existingArticleTitles
            .map((existing: any) => ({ ...existing, similarity: titleSimilarity(row.title, existing.title) }))
            .sort((a: any, b: any) => b.similarity - a.similarity)[0];
          if (match && match.similarity >= 0.72) {
            duplicateTitles.push({ generated_title: row.title, existing_title: match.title, existing_slug: match.slug, similarity: match.similarity });
            return false;
          }
          return true;
        })
      : stamped;
    const items = uniqueStamped
      .filter(r => r && r[meta.keyField])
      .map(r => ({
        ...r,
        _action: existingKeys.has(r[meta.keyField]) ? "upsert" : "insert",
        _key: r[meta.keyField],
      }));

    const inserts = items.filter(i => i._action === "insert").length;
    const upserts = items.filter(i => i._action === "upsert").length;

    return new Response(JSON.stringify({
      items,
      counts: { inserts, upserts, total: items.length },
      model_used: modelUsed,
      key_field: meta.keyField,
      duplicate_titles_skipped: duplicateTitles,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
