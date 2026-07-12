/**
 * Safe importer for the pre-rendered DekhoCampus archive.
 *
 * The archive contains page data that was already sent to visitors, including
 * legacy CloudFront URLs.  This tool intentionally does NOT import leads,
 * users, credentials, or private source data. It never overwrites a matching
 * slug in Supabase. By default, imported records are drafts so time-sensitive
 * admission/exam information is reviewed before public release.
 *
 * Examples:
 *   npm run import:static -- --content-root /absolute/path/to/.next/server/pages
 *   npm run import:static -- --content-root /absolute/path/to/.next/server/pages --apply
 *   npm run import:static -- --content-root /absolute/path/to/.next/server/pages --apply --publish --mirror-assets
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Entity = "colleges" | "courses" | "exams" | "articles";
type Json = Record<string, unknown>;
type Candidate = { entity: Entity; slug: string; payload: Json; source: string; richness: number };
type EntityReport = { discovered: number; invalid: number; duplicate_in_source: string[]; existing_in_supabase: string[]; eligible: number; inserted: number; failed: Array<{ slug: string; message: string }> };
type Report = { generated_at: string; mode: "dry-run" | "apply"; publish: boolean; sources: string[]; entities: Record<Entity, EntityReport>; asset_mirror: { requested: boolean; discovered: number; mirrored: number; failed: Array<{ url: string; message: string }> } };

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const option = (name: string) => args[args.indexOf(name) + 1];
const contentRoot = option("--content-root");
const reportPath = resolve(option("--report") ?? "reports/legacy-static-import-report.json");
const apply = has("--apply");
const publish = has("--publish");
const mirrorAssets = has("--mirror-assets");
const offline = has("--offline");

if (!contentRoot) throw new Error("Pass --content-root /absolute/path/to/.next/server/pages");

/** Load only local, non-versioned configuration; command-line environment wins. */
try {
  for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
} catch { /* .env is optional in CI */ }
if (apply && !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("--apply requires SUPABASE_SERVICE_ROLE_KEY. A publishable key cannot import content.");

const projectUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!offline && (!projectUrl || !(serviceKey ?? publicKey))) throw new Error("Set SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY (--apply) or VITE_SUPABASE_PUBLISHABLE_KEY (dry run).");
if (offline && apply) throw new Error("--offline is only valid for a dry run.");

const clean = (value: unknown) => typeof value === "string" ? value.replace(/\u0000/g, "").trim() || null : value == null ? null : String(value).trim() || null;
const slugify = (value: unknown) => (clean(value) ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
const titleCase = (value: unknown) => {
  const input = clean(value);
  if (!input) return null;
  return input
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
};
const objectText = (value: unknown): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const row = value as Record<string, unknown>;
  const preferred = [
    row.slug,
    row.name,
    row.title,
    row.label,
    row.course_name,
    row.exam_name,
    row.clg_name,
    row.full_name,
    row.short_name,
  ]
    .map((item) => clean(item))
    .filter((item): item is string => Boolean(item));
  if (preferred.length) return preferred;
  return Object.values(row)
    .map((item) => clean(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);
};
const stringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) return objectText(item);
    return stringList(item);
  });
  if (value && typeof value === "object") return objectText(value);
  const text = clean(value);
  if (!text) return [];
  if (text.startsWith("[") || text.startsWith("{")) { try { return stringList(JSON.parse(text)); } catch { /* use text */ } }
  return text.split(/\s*,\s*|\s*\|\s*/).map((item) => item.trim()).filter(Boolean).slice(0, 100);
};
const url = (value: unknown): string | null => {
  const text = clean(value);
  if (!text || !/^https:\/\//i.test(text)) return null;
  try { const parsed = new URL(text); return parsed.protocol === "https:" ? parsed.toString() : null; } catch { return null; }
};
const text = (value: unknown, max = 1_000_000) => (clean(value) ?? "").slice(0, max) || null;
const date = (value: unknown) => {
  const raw = clean(value); if (!raw) return null;
  const parsed = new Date(raw); return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const integer = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const raw = clean(value);
  if (!raw) return fallback;
  const match = raw.replace(/,/g, "").match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : fallback;
};
const numeric = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = clean(value);
  if (!raw) return fallback;
  const normalized = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return normalized ? Number.parseFloat(normalized[0]) : fallback;
};
const firstYear = (value: unknown, fallback = 2000) => {
  const raw = clean(value);
  if (!raw) return fallback;
  const match = raw.match(/\b(18|19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : fallback;
};
const inferBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  const raw = clean(value)?.toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "y", "available", "enabled"].includes(raw)) return true;
  if (["0", "false", "no", "n", "unavailable", "disabled"].includes(raw)) return false;
  return fallback;
};
const feeNumber = (value: unknown) => {
  const raw = clean(value);
  if (!raw) return 0;
  const compact = raw.toLowerCase().replace(/₹|rs\.?|inr|\/year|per year|annum|pa|p\.a\./g, "").trim();
  const match = compact.match(/(\d+(?:\.\d+)?)\s*(cr|crore|l|lac|lakh|k|thousand)?/i);
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  if (!Number.isFinite(amount)) return 0;
  if (unit === "cr" || unit === "crore") return Math.round(amount * 10_000_000);
  if (unit === "l" || unit === "lac" || unit === "lakh") return Math.round(amount * 100_000);
  if (unit === "k" || unit === "thousand") return Math.round(amount * 1_000);
  return Math.round(amount);
};
const splitFeeRange = (low: unknown, high: unknown, display?: unknown) => {
  let lowValue = feeNumber(low);
  let highValue = feeNumber(high);
  if (!lowValue && !highValue) {
    const raw = clean(display);
    if (raw) {
      const matches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(cr|crore|l|lac|lakh|k|thousand)?/gi)].map((match) => feeNumber(`${match[1]} ${match[2] ?? ""}`));
      if (matches.length === 1) lowValue = highValue = matches[0];
      if (matches.length >= 2) {
        lowValue = matches[0];
        highValue = matches[1];
      }
    }
  }
  if (!highValue) highValue = lowValue;
  if (!lowValue) lowValue = highValue;
  if (lowValue > highValue) return { low_fee: highValue, high_fee: lowValue };
  return { low_fee: lowValue, high_fee: highValue };
};
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const nested = (row: Json, key: string) => record(row[key]);
const allowedAssetHost = new Set(["d3pbz6yh6cuepy.cloudfront.net", "devdc.s3.eu-north-1.amazonaws.com", "dekhocampus.s3.ap-south-1.amazonaws.com"]);

function reportEntity(): EntityReport { return { discovered: 0, invalid: 0, duplicate_in_source: [], existing_in_supabase: [], eligible: 0, inserted: 0, failed: [] }; }
const report: Report = { generated_at: new Date().toISOString(), mode: apply ? "apply" : "dry-run", publish, sources: [], entities: { colleges: reportEntity(), courses: reportEntity(), exams: reportEntity(), articles: reportEntity() }, asset_mirror: { requested: mirrorAssets, discovered: 0, mirrored: 0, failed: [] } };

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
}

function publication() { return publish ? { status: "published", is_active: true } : { status: "draft", is_active: false }; }
function sanitizePayload(entity: Entity, payload: Json): Json {
  const base = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value ?? null])) as Json;
  if (entity === "colleges") {
    return {
      ...base,
      name: text(base.name, 500) ?? "",
      short_name: text(base.short_name, 255) ?? "",
      state: titleCase(base.state) ?? "",
      city: titleCase(base.city) ?? "",
      location: text(base.location, 500) ?? "",
      type: titleCase(base.type) ?? "Private",
      category: titleCase(base.category) ?? "General",
      established: firstYear(base.established, 2000),
      rating: numeric(base.rating, 0),
      reviews: integer(base.reviews, 0),
      courses_count: integer(base.courses_count, 0),
      fees: text(base.fees, 10_000) ?? "",
      description: text(base.description) ?? "",
      image: url(base.image) ?? "",
      logo: url(base.logo) ?? "",
      brochure_url: url(base.brochure_url) ?? "",
      carousel_images: stringList(base.carousel_images).map(url).filter((item): item is string => Boolean(item)),
      gallery_images: stringList(base.gallery_images).map(url).filter((item): item is string => Boolean(item)),
      categories: stringList(base.categories).map((item) => titleCase(item) ?? item),
      related_exams: stringList(base.related_exams),
      related_courses: stringList(base.related_courses),
      tags: stringList(base.tags),
      is_active: inferBoolean(base.is_active, false),
      status: publish ? "Published" : "Draft",
      meta_title: text(base.meta_title, 500) ?? "",
      meta_description: text(base.meta_description, 5_000) ?? "",
      meta_keywords: text(base.meta_keywords, 5_000) ?? "",
    };
  }
  if (entity === "courses") {
    const fees = splitFeeRange(base.low_fee, base.high_fee, base.avg_fees ?? base.fee ?? base.fees_content);
    return {
      ...base,
      name: text(base.name, 500) ?? "",
      full_name: text(base.full_name, 500) ?? text(base.name, 500) ?? "",
      category: titleCase(base.category) ?? "General",
      level: titleCase(base.level) ?? "General",
      duration: text(base.duration, 255) ?? "",
      duration_type: titleCase(base.duration_type) ?? "",
      study_type: titleCase(base.study_type) ?? "",
      colleges_count: integer(base.colleges_count, 0),
      rating: numeric(base.rating, 0),
      fee: numeric(base.fee, fees.low_fee || fees.high_fee),
      low_fee: fees.low_fee,
      high_fee: fees.high_fee,
      avg_fees: text(base.avg_fees, 255) ?? "",
      avg_salary: text(base.avg_salary, 255) ?? "",
      growth: text(base.growth, 255) ?? "",
      image: url(base.image) ?? "",
      top_exams: stringList(base.top_exams),
      careers: stringList(base.careers),
      subjects: stringList(base.subjects),
      specializations: stringList(base.specializations),
      categories: stringList(base.categories).map((item) => titleCase(item) ?? item),
      is_active: inferBoolean(base.is_active, false),
      status: publish ? "Published" : "Draft",
      meta_title: text(base.meta_title, 500) ?? "",
      meta_description: text(base.meta_description, 5_000) ?? "",
      meta_keywords: text(base.meta_keywords, 5_000) ?? "",
    };
  }
  if (entity === "exams") {
    return {
      ...base,
      name: text(base.name, 500) ?? "",
      full_name: text(base.full_name, 500) ?? text(base.name, 500) ?? "",
      short_name: text(base.short_name, 255) ?? "",
      category: titleCase(base.category) ?? "General",
      categories: stringList(base.categories).map((item) => titleCase(item) ?? item),
      exam_type: text(base.exam_type, 255) ?? "",
      mode: text(base.mode, 255) ?? "",
      duration: text(base.duration, 255) ?? "",
      frequency: text(base.frequency, 255) ?? "",
      application_start_date: text(base.application_start_date, 255) ?? "",
      application_end_date: text(base.application_end_date, 255) ?? "",
      exam_date: text(base.exam_date, 255) ?? "",
      result_date: text(base.result_date, 255) ?? "",
      image: url(base.image) ?? "",
      logo: url(base.logo) ?? "",
      website: url(base.website) ?? "",
      registration_url: url(base.registration_url) ?? "#",
      top_colleges: stringList(base.top_colleges),
      syllabus: Array.isArray(base.syllabus) ? stringList(base.syllabus) : stringList(text(base.syllabus)),
      negative_marking: inferBoolean(base.negative_marking, false),
      is_active: inferBoolean(base.is_active, false),
      status: publish ? "Published" : "Draft",
      meta_title: text(base.meta_title, 500) ?? "",
      meta_description: text(base.meta_description, 5_000) ?? "",
      meta_keywords: text(base.meta_keywords, 5_000) ?? "",
    };
  }
  return {
    ...base,
    title: text(base.title, 500) ?? "",
    description: text(base.description) ?? "",
    content: text(base.content) ?? "",
    featured_image: url(base.featured_image) ?? "",
    author: text(base.author, 255) ?? "",
    category: titleCase(base.category) ?? "",
    tags: stringList(base.tags),
    is_active: inferBoolean(base.is_active, false),
    status: publish ? "Published" : "Draft",
    meta_title: text(base.meta_title, 500) ?? "",
    meta_description: text(base.meta_description, 5_000) ?? "",
    meta_keywords: text(base.meta_keywords, 5_000) ?? "",
  };
}
function candidateFromPage(file: string, root: string, document: Json): Candidate | null {
  const props = nested(document, "pageProps");
  const route = relative(root, file).replaceAll("\\", "/");
  const source = route;
  if (route.startsWith("college/")) {
    const r = nested(props, "college"); const slug = slugify(r.clg_slug ?? props.college_slug);
    const name = text(r.clg_name, 500); if (!slug || !name) return null;
    const images = [url(r.banner_url), url(r.second_banner_url), ...stringList(r.college_gallery).map(url)].filter((item): item is string => Boolean(item));
    return { entity: "colleges", slug, source, richness: JSON.stringify(r).length, payload: sanitizePayload("colleges", {
      slug, name, short_name: text(r.clg_short, 255), state: text(r.clg_state, 255), city: text(r.clg_city, 255), location: text(r.clg_location, 500), type: text(r.clg_institute_type, 255), category: text(r.college_category, 255), established: text(r.clg_estd, 64), description: text(r.clg_about_us) ?? text(r.clg_about), image: images[0] ?? url(r.logo_url), logo: url(r.logo_url), carousel_images: images, gallery_images: images.slice(2), fees: text(r.fees, 10_000), placement_content: text(r.clg_placement_summary) ?? text(r.placement), eligibility_criteria: text(r.eligibility_criteria), admission_process: text(r.admission_process), scholarship_details: text(r.scholarship_offered), hostel_life: text(r.hostel_life), course_fee_content: text(r.undergraduate_fee_structure) ?? text(r.postgraduate_fee_structure), facilities_content: text(r.facillities), brochure_url: url(r.broucher), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), categories: stringList(r.college_category), related_exams: stringList(r.accepted_exams), related_courses: stringList(r.popular_courses), tags: ["legacy-archive"], ...publication()
    }) };
  }
  if (route.startsWith("courses/")) {
    const r = nested(props, "course"); const slug = slugify(r.course_slug ?? props.course_slug);
    const name = text(r.course_name, 500); if (!slug || !name) return null;
    return { entity: "courses", slug, source, richness: JSON.stringify(r).length, payload: sanitizePayload("courses", {
      slug, name, full_name: name, category: text(r.category, 255), level: text(r.course_level, 255), duration: text(r.duration, 255), duration_type: text(r.duration_type, 255), study_type: text(r.study_type, 255), low_fee: r.low_fee, high_fee: r.high_fee, fee: r.fee, avg_fees: text(r.fees, 255), image: url(r.logo_url), description: text(r.course_about), about_content: text(r.course_about), scope_content: text(r.course_scope), subjects_content: text(r.course_subjects), eligibility: text(r.course_eligiblity), specialization_content: text(r.branch), categories: stringList(r.category), specializations: stringList(r.branch), top_exams: stringList(r.popular_exams), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), ...publication()
    }) };
  }
  if (route.startsWith("exams/")) {
    const r = nested(props, "exam"); const slug = slugify(r.slug ?? props.exam_slug);
    const name = text(r.name, 500); if (!slug || !name) return null;
    return { entity: "exams", slug, source, richness: JSON.stringify(r).length, payload: sanitizePayload("exams", {
      slug, name, full_name: name, short_name: text(r.short_name, 255), logo: url(r.logo), image: url(r.logo), category: text(r.category, 255), categories: stringList(r.category), exam_type: text(r.exam_type, 255), mode: text(r.exam_mode, 255), duration: text(r.duration, 255), frequency: text(r.frequency, 255), application_start_date: date(r.application_form_start_date), application_end_date: date(r.application_form_end_date), exam_date: date(r.examination_date), result_date: date(r.result_anounce_date), summary_content: text(r.summary), description: text(r.summary), application_process: text(r.application_process), eligibility: text(r.elegiblity_criteria), syllabus: text(r.syllabus), exam_pattern: text(r.exam_pattern), cutoff_content: text(r.exam_cut_off), preparation_tips: text(r.preparation_tips), counselling_content: text(r.counselling), center_content: text(r.center), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), ...publication()
    }) };
  }
  if (route.startsWith("news/")) {
    const r = nested(props, "post"); const slug = slugify(r.slug ?? props.slug); const title = text(r.title, 500);
    if (!slug || !title) return null;
    return { entity: "articles", slug, source, richness: JSON.stringify(r).length, payload: sanitizePayload("articles", { slug, title, content: text(r.content), description: text(r.description), featured_image: url(r.featured_image) ?? url(nested(r, "featured_image").id), category: text(r.category, 255), author: text(nested(r, "author").name, 255), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), tags: ["legacy-archive"], ...publication() }) };
  }
  return null;
}

async function discover(root: string) {
  const candidates = new Map<Entity, Map<string, Candidate>>(["colleges", "courses", "exams", "articles"].map((entity) => [entity as Entity, new Map()]));
  const allFiles = (await files(root)).filter((item) => item.endsWith(".json") && !item.endsWith(".nft.json"));
  console.log(`[import:static] scanning ${allFiles.length} JSON files`);
  let scanned = 0;
  for (const file of allFiles) {
    scanned += 1;
    if (scanned % 500 === 0 || scanned === allFiles.length) console.log(`[import:static] scanned ${scanned}/${allFiles.length}`);
    let document: Json; try { document = JSON.parse(await readFile(file, "utf8")); } catch { continue; }
    const found = candidateFromPage(file, root, document); if (!found) continue;
    const stats = report.entities[found.entity]; stats.discovered += 1;
    const previous = candidates.get(found.entity)!.get(found.slug);
    if (previous) { stats.duplicate_in_source.push(found.slug); if (previous.richness >= found.richness) continue; }
    candidates.get(found.entity)!.set(found.slug, found);
  }
  return candidates;
}

async function existingSlugs(client: SupabaseClient, entity: Entity) {
  const values = new Set<string>(); let from = 0;
  while (true) { const { data, error } = await client.from(entity).select("slug").range(from, from + 999); if (error) throw error; for (const row of data ?? []) if (typeof row.slug === "string") values.add(row.slug); if (!data || data.length < 1000) return values; from += 1000; }
}

function collectAssetUrls(payload: Json) {
  const assets: string[] = [];
  for (const field of ["image", "logo", "brochure_url", "featured_image"]) { const value = url(payload[field]); if (value) assets.push(value); }
  for (const field of ["carousel_images", "gallery_images"]) for (const value of stringList(payload[field]).map(url)) if (value) assets.push(value);
  return assets;
}
async function mirror(client: SupabaseClient, candidates: Candidate[]) {
  const sourceUrls = [...new Set(candidates.flatMap((candidate) => collectAssetUrls(candidate.payload)))].filter((item) => allowedAssetHost.has(new URL(item).hostname));
  report.asset_mirror.discovered = sourceUrls.length;
  console.log(`[import:static] mirroring ${sourceUrls.length} assets`);
  const replacements = new Map<string, string>();
  let mirrored = 0;
  for (const source of sourceUrls) {
    try {
      const response = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(20_000) });
      const length = Number(response.headers.get("content-length") ?? "0");
      const type = response.headers.get("content-type")?.split(";")[0] ?? "";
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!/^image\/(jpeg|png|webp|avif|svg\+xml)$|^application\/pdf$/.test(type)) throw new Error(`unsupported content type ${type || "unknown"}`);
      if (length > 10_485_760) throw new Error("file exceeds 10 MB limit");
      const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > 10_485_760) throw new Error("file exceeds 10 MB limit");
      const path = `static/${createHash("sha256").update(source).digest("hex")}-${basename(new URL(source).pathname).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "asset"}`;
      const { error } = await client.storage.from("legacy-public-assets").upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: true }); if (error) throw error;
      replacements.set(source, client.storage.from("legacy-public-assets").getPublicUrl(path).data.publicUrl); report.asset_mirror.mirrored += 1;
      mirrored += 1;
      if (mirrored % 25 === 0 || mirrored === sourceUrls.length) console.log(`[import:static] mirrored ${mirrored}/${sourceUrls.length}`);
    } catch (error) { report.asset_mirror.failed.push({ url: source, message: error instanceof Error ? error.message : "asset download failed" }); }
  }
  for (const candidate of candidates) {
    for (const field of ["image", "logo", "brochure_url", "featured_image"]) {
      const source = url(candidate.payload[field]);
      if (source && replacements.has(source)) candidate.payload[field] = replacements.get(source)!;
    }
    for (const field of ["carousel_images", "gallery_images"]) {
      candidate.payload[field] = stringList(candidate.payload[field]).map((item) => replacements.get(item) ?? item);
    }
  }
}

async function insert(client: SupabaseClient, entity: Entity, candidates: Candidate[], known: Set<string>) {
  const stats = report.entities[entity]; const ready = candidates.filter((candidate) => {
    if (known.has(candidate.slug)) { stats.existing_in_supabase.push(candidate.slug); return false; }
    return true;
  });
  stats.eligible = ready.length;
  console.log(`[import:static] inserting ${entity}: ${ready.length} eligible, ${stats.existing_in_supabase.length} already in Supabase`);
  for (let i = 0; i < ready.length; i += 100) {
    const batch = ready.slice(i, i + 100); const { error } = await client.from(entity).insert(batch.map((candidate) => candidate.payload));
    if (!error) { stats.inserted += batch.length; continue; }
    for (const candidate of batch) { const result = await client.from(entity).insert(candidate.payload); if (result.error) stats.failed.push({ slug: candidate.slug, message: result.error.message }); else stats.inserted += 1; }
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybe = error as { message?: unknown; details?: unknown; code?: unknown };
    const parts = [maybe.message, maybe.details, maybe.code].filter(Boolean).map(String);
    if (parts.length) return parts.join("\n");
  }
  return String(error);
}

async function main() {
  const root = resolve(contentRoot!); report.sources.push(root);
  const client = offline ? null : createClient(projectUrl!, apply ? serviceKey! : publicKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`[import:static] mode=${apply ? "apply" : "dry-run"} publish=${publish} mirrorAssets=${mirrorAssets}`);
  const all = await discover(root); const flat = [...all.values()].flatMap((values) => [...values.values()]);
  console.log(`[import:static] discovered colleges=${all.get("colleges")!.size} courses=${all.get("courses")!.size} exams=${all.get("exams")!.size} articles=${all.get("articles")!.size}`);
  for (const entity of ["colleges", "courses", "exams", "articles"] as Entity[]) {
    console.log(`[import:static] checking existing slugs for ${entity}`);
    const current = client ? await existingSlugs(client, entity) : new Set<string>(); const candidates = [...all.get(entity)!.values()];
    for (const candidate of candidates) if (current.has(candidate.slug)) report.entities[entity].existing_in_supabase.push(candidate.slug); else report.entities[entity].eligible += 1;
  }
  if (apply && mirrorAssets) await mirror(client!, flat);
  if (apply) for (const entity of ["colleges", "courses", "exams", "articles"] as Entity[]) await insert(client!, entity, [...all.get(entity)!.values()], await existingSlugs(client!, entity));
  for (const entity of Object.keys(report.entities) as Entity[]) {
    const stats = report.entities[entity]; stats.duplicate_in_source = [...new Set(stats.duplicate_in_source)].sort(); stats.existing_in_supabase = [...new Set(stats.existing_in_supabase)].sort();
  }
  await mkdir(resolve(reportPath, ".."), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

await main().catch((error) => {
  const message = errorMessage(error);
  console.error("[import:static] failed");
  console.error(message);
  if (/ENOTFOUND|fetch failed|getaddrinfo/i.test(message)) {
    console.error("[import:static] Supabase is not reachable from this machine right now. Check internet/DNS, then rerun the same command.");
  }
  process.exitCode = 1;
});
