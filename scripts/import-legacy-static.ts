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
const stringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(stringList);
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
function candidateFromPage(file: string, root: string, document: Json): Candidate | null {
  const props = nested(document, "pageProps");
  const route = relative(root, file).replaceAll("\\", "/");
  const source = route;
  if (route.startsWith("college/")) {
    const r = nested(props, "college"); const slug = slugify(r.clg_slug ?? props.college_slug);
    const name = text(r.clg_name, 500); if (!slug || !name) return null;
    const images = [url(r.banner_url), url(r.second_banner_url), ...stringList(r.college_gallery).map(url)].filter((item): item is string => Boolean(item));
    return { entity: "colleges", slug, source, richness: JSON.stringify(r).length, payload: {
      slug, name, short_name: text(r.clg_short, 255), state: text(r.clg_state, 255), city: text(r.clg_city, 255), location: text(r.clg_location, 500), type: text(r.clg_institute_type, 255), category: text(r.college_category, 255), established: text(r.clg_estd, 64), description: text(r.clg_about_us) ?? text(r.clg_about), image: images[0] ?? url(r.logo_url), logo: url(r.logo_url), carousel_images: images, gallery_images: images.slice(2), fees: text(r.fees, 10_000), placement_content: text(r.clg_placement_summary) ?? text(r.placement), eligibility_criteria: text(r.eligibility_criteria), admission_process: text(r.admission_process), scholarship_details: text(r.scholarship_offered), hostel_life: text(r.hostel_life), course_fee_content: text(r.undergraduate_fee_structure) ?? text(r.postgraduate_fee_structure), facilities_content: text(r.facillities), brochure_url: url(r.broucher), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), categories: stringList(r.college_category), related_exams: stringList(r.accepted_exams), related_courses: stringList(r.popular_courses), tags: ["legacy-archive"], ...publication()
    } };
  }
  if (route.startsWith("courses/")) {
    const r = nested(props, "course"); const slug = slugify(r.course_slug ?? props.course_slug);
    const name = text(r.course_name, 500); if (!slug || !name) return null;
    return { entity: "courses", slug, source, richness: JSON.stringify(r).length, payload: {
      slug, name, full_name: name, category: text(r.category, 255), level: text(r.course_level, 255), duration: text(r.duration, 255), duration_type: text(r.duration_type, 255), study_type: text(r.study_type, 255), low_fee: text(r.low_fee, 100), high_fee: text(r.high_fee, 100), image: url(r.logo_url), description: text(r.course_about), about_content: text(r.course_about), scope_content: text(r.course_scope), subjects_content: text(r.course_subjects), eligibility: text(r.course_eligiblity), specialization_content: text(r.branch), categories: stringList(r.category), specializations: stringList(r.branch), top_exams: stringList(r.popular_exams), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), ...publication()
    } };
  }
  if (route.startsWith("exams/")) {
    const r = nested(props, "exam"); const slug = slugify(r.slug ?? props.exam_slug);
    const name = text(r.name, 500); if (!slug || !name) return null;
    return { entity: "exams", slug, source, richness: JSON.stringify(r).length, payload: {
      slug, name, full_name: name, short_name: text(r.short_name, 255), logo: url(r.logo), image: url(r.logo), category: text(r.category, 255), categories: stringList(r.category), exam_type: text(r.exam_type, 255), mode: text(r.exam_mode, 255), duration: text(r.duration, 255), frequency: text(r.frequency, 255), application_start_date: date(r.application_form_start_date), application_end_date: date(r.application_form_end_date), exam_date: date(r.examination_date), result_date: date(r.result_anounce_date), summary_content: text(r.summary), description: text(r.summary), application_process: text(r.application_process), eligibility: text(r.elegiblity_criteria), syllabus: text(r.syllabus), exam_pattern: text(r.exam_pattern), cutoff_content: text(r.exam_cut_off), preparation_tips: text(r.preparation_tips), counselling_content: text(r.counselling), center_content: text(r.center), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), ...publication()
    } };
  }
  if (route.startsWith("news/")) {
    const r = nested(props, "post"); const slug = slugify(r.slug ?? props.slug); const title = text(r.title, 500);
    if (!slug || !title) return null;
    return { entity: "articles", slug, source, richness: JSON.stringify(r).length, payload: { slug, title, content: text(r.content), description: text(r.description), featured_image: url(r.featured_image) ?? url(nested(r, "featured_image").id), category: text(r.category, 255), author: text(nested(r, "author").name, 255), meta_title: text(r.meta_title, 500), meta_description: text(r.meta_description, 5_000), meta_keywords: text(r.meta_keywords, 5_000), tags: ["legacy-archive"], ...publication() } };
  }
  return null;
}

async function discover(root: string) {
  const candidates = new Map<Entity, Map<string, Candidate>>(["colleges", "courses", "exams", "articles"].map((entity) => [entity as Entity, new Map()]));
  for (const file of (await files(root)).filter((item) => item.endsWith(".json") && !item.endsWith(".nft.json"))) {
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
  const replacements = new Map<string, string>();
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
  for (let i = 0; i < ready.length; i += 100) {
    const batch = ready.slice(i, i + 100); const { error } = await client.from(entity).insert(batch.map((candidate) => candidate.payload));
    if (!error) { stats.inserted += batch.length; continue; }
    for (const candidate of batch) { const result = await client.from(entity).insert(candidate.payload); if (result.error) stats.failed.push({ slug: candidate.slug, message: result.error.message }); else stats.inserted += 1; }
  }
}

async function main() {
  const root = resolve(contentRoot!); report.sources.push(root);
  const client = offline ? null : createClient(projectUrl!, apply ? serviceKey! : publicKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const all = await discover(root); const flat = [...all.values()].flatMap((values) => [...values.values()]);
  for (const entity of ["colleges", "courses", "exams", "articles"] as Entity[]) {
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

await main();
