/**
 * Import the 31-12-2024 DekhoCampus CSV export into the current Supabase schema.
 *
 * Only public college, course, exam and college-course fee data is considered.
 * User, lead, account and other private tables are deliberately ignored.
 *
 * Dry run + manual CSV fallback:
 *   npm run import:legacy-csv -- --source-dir "/absolute/path/CSV Excel Database" \
 *     --export-dir reports/legacy-csv-mapped \
 *     --report reports/legacy-csv-import-report.json
 *
 * Safe apply (new records are Draft unless --publish is included):
 *   SUPABASE_URL=https://<project-ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<secret-or-service-role-key> \
 *   npm run import:legacy-csv -- --source-dir "/absolute/path/CSV Excel Database" \
 *     --apply --project-ref <project-ref> --report reports/legacy-csv-import-report.json
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, string>;
type Json = Record<string, unknown>;
type Entity = "colleges" | "courses" | "exams" | "course_fees";
type EntityReport = {
  source_rows: number;
  mapped_rows: number;
  duplicate_source_slugs: string[];
  existing_rows: number;
  inserted: number;
  enriched: number;
  skipped: number;
  failed: Array<{ key: string; message: string }>;
};
type ImportReport = {
  generated_at: string;
  source_dir: string;
  destination_project_ref: string | null;
  mode: "dry-run" | "apply";
  publish: boolean;
  mapping: {
    college_slug_collisions_resolved: number;
    exact_duplicate_colleges_merged: number;
    resolved_parent_universities: number;
    unresolved_parent_universities: Array<{ name: string; occurrences: number }>;
    college_course_rows: number;
    matched_course_offerings: number;
    unmatched_course_offerings: number;
    unmatched_course_names: Array<{ name: string; occurrences: number }>;
    orphan_college_offerings: number;
    invalid_established_values: Array<{ value: string; occurrences: number }>;
  };
  entities: Record<Entity, EntityReport>;
};

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const sourceDir = option("--source-dir");
const apply = has("--apply");
const publish = has("--publish");
const overwriteExisting = has("--overwrite-existing");
const skipExisting = has("--skip-existing");
const onlyColleges = has("--only-colleges");
const exportDir = option("--export-dir");
const reportPath = resolve(option("--report") ?? "reports/legacy-csv-import-report.json");
const requestedProjectRef = option("--project-ref") ?? null;

if (!sourceDir) throw new Error("Pass --source-dir with the absolute path to CSV Excel Database.");
if (apply && !requestedProjectRef) throw new Error("--apply requires --project-ref so the destination cannot be selected accidentally.");
if (apply && !process.env.SUPABASE_URL) throw new Error("--apply requires an explicit SUPABASE_URL. The frontend .env is intentionally ignored.");
if (apply && !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("--apply requires SUPABASE_SERVICE_ROLE_KEY. A publishable key cannot import content.");
if (apply && /^sb_publishable_/i.test(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")) throw new Error("SUPABASE_SERVICE_ROLE_KEY contains a publishable key. Use the Supabase secret/service_role key.");
if (apply) {
  const destinationRef = new URL(process.env.SUPABASE_URL!).hostname.split(".")[0];
  if (destinationRef !== requestedProjectRef) throw new Error(`Destination mismatch: SUPABASE_URL is ${destinationRef}, but --project-ref is ${requestedProjectRef}.`);
}

const entityReport = (): EntityReport => ({ source_rows: 0, mapped_rows: 0, duplicate_source_slugs: [], existing_rows: 0, inserted: 0, enriched: 0, skipped: 0, failed: [] });
const report: ImportReport = {
  generated_at: new Date().toISOString(),
  source_dir: resolve(sourceDir),
  destination_project_ref: requestedProjectRef,
  mode: apply ? "apply" : "dry-run",
  publish,
  mapping: { college_slug_collisions_resolved: 0, exact_duplicate_colleges_merged: 0, resolved_parent_universities: 0, unresolved_parent_universities: [], college_course_rows: 0, matched_course_offerings: 0, unmatched_course_offerings: 0, unmatched_course_names: [], orphan_college_offerings: 0, invalid_established_values: [] },
  entities: { colleges: entityReport(), courses: entityReport(), exams: entityReport(), course_fees: entityReport() },
};

const clean = (value: unknown) => {
  if (value == null) return "";
  const text = String(value).replace(/\u0000/g, "").trim();
  return /^(null|undefined|n\/a|na)$/i.test(text) ? "" : text;
};
const slugify = (value: unknown) => clean(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&(?:amp;)?/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
const normalizedName = (value: unknown) => clean(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&amp;/g, "and").replace(/\[[^\]]*]|\([^)]*\)/g, " ").replace(/\b(bachelor|master|doctor|post graduate|under graduate|of|in|and|the)\b/g, " ").replace(/[^a-z0-9]+/g, "");
const titleCase = (value: unknown) => clean(value).replace(/\s+/g, " ").toLowerCase().replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
const text = (value: unknown, max = 1_000_000) => clean(value).slice(0, max);
const unique = (values: string[], max = 100) => [...new Set(values.map(clean).filter(Boolean))].slice(0, max);
const stringList = (value: unknown, max = 100): string[] => {
  const raw = clean(value);
  if (!raw) return [];
  if (/^[\[{]/.test(raw)) {
    try {
      const parsed = JSON.parse(raw);
      const flatten = (item: unknown): string[] => {
        if (Array.isArray(item)) return item.flatMap(flatten);
        if (item && typeof item === "object") {
          const row = item as Json;
          return [row.slug, row.name, row.cat_name, row.course_name, row.short_name].map(clean).filter(Boolean);
        }
        return clean(item) ? [clean(item)] : [];
      };
      return unique(flatten(parsed), max);
    } catch { /* fall through to text splitting */ }
  }
  return unique(raw.split(/\s*[,|;]\s*/g), max);
};
const httpsUrl = (...values: unknown[]) => {
  for (const value of values) {
    const raw = clean(value);
    if (!/^https:\/\//i.test(raw)) continue;
    try { const parsed = new URL(raw); if (parsed.protocol === "https:") return parsed.toString(); } catch { /* ignore malformed URL */ }
  }
  return "";
};
const integer = (value: unknown, fallback = 0) => {
  const match = clean(value).replace(/,/g, "").match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : fallback;
};
const feeNumber = (value: unknown) => {
  const raw = clean(value).toLowerCase().replace(/₹|rs\.?|inr|\/year|per year|annum|p\.?a\.?/g, " ");
  const match = raw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(cr|crore|l|lac|lakh|k|thousand)?/i);
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  if (unit === "cr" || unit === "crore") return Math.round(amount * 10_000_000);
  if (unit === "l" || unit === "lac" || unit === "lakh") return Math.round(amount * 100_000);
  if (unit === "k" || unit === "thousand") return Math.round(amount * 1_000);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
};
const establishedYear = (value: unknown) => {
  const match = clean(value).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  const year = match ? Number.parseInt(match[0], 10) : 0;
  return year >= 1000 && year <= new Date().getFullYear() + 1 ? year : 0;
};
const boolean = (value: unknown, fallback = false) => {
  const raw = clean(value).toLowerCase();
  if (["1", "true", "yes", "y"].includes(raw)) return true;
  if (["0", "false", "no", "n"].includes(raw)) return false;
  return fallback;
};
const isoDate = (value: unknown) => {
  const raw = clean(value);
  if (!raw || raw === "0000-00-00") return "";
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return "";
  const parsed = new Date(`${match[0]}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "" : match[0];
};
const htmlItems = (value: unknown, max = 100) => {
  const raw = clean(value);
  if (!raw) return [];
  const decoded = raw.replace(/<\/?(?:ul|ol|table|tbody|thead|tr|p|h[1-6]|div|br)[^>]*>/gi, "\n").replace(/<\/?(?:li|td|th)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
  return unique(decoded.split(/\n+/).map((item) => item.replace(/\s+/g, " ").trim()).filter((item) => item.length >= 2), max);
};
const richer = (left: Row, right: Row) => {
  const score = (row: Row) => (clean(row.status) === "1" ? 1_000_000 : 0) + Object.values(row).reduce((total, value) => total + clean(value).length, 0);
  if (score(left) !== score(right)) return score(left) > score(right) ? left : right;
  return clean(left.updated_at) >= clean(right.updated_at) ? left : right;
};
const deterministicUuid = (value: string) => {
  const bytes = Buffer.from(createHash("sha256").update(value).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** RFC 4180 parser, including escaped quotes and multiline cells. */
function parseCsv(input: string): Row[] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); matrix.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); matrix.push(row); }
  const headers = (matrix.shift() ?? []).map((header) => header.replace(/^\ufeff/, "").trim());
  return matrix.filter((values) => values.some((value) => clean(value))).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}
async function csv(name: string) {
  return parseCsv(await readFile(resolve(sourceDir!, `${name}.csv`), "utf8"));
}

function parseCsvRecord(input: string) {
  const values: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { values.push(cell); cell = ""; }
    else cell += char;
  }
  values.push(cell.replace(/\r$/, ""));
  return values;
}

/** Stream the large, single-line support exports without retaining raw rows. */
async function streamCsv(name: string, consume: (row: Row) => void) {
  const lines = createInterface({ input: createReadStream(resolve(sourceDir!, `${name}.csv`), { encoding: "utf8" }), crlfDelay: Infinity });
  let headers: string[] | null = null;
  let count = 0;
  for await (const line of lines) {
    if (!headers) { headers = parseCsvRecord(line).map((header) => header.replace(/^\ufeff/, "").trim()); continue; }
    if (!line.trim()) continue;
    const values = parseCsvRecord(line);
    consume(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
    count += 1;
    if (count % 25_000 === 0) console.log(`[import:legacy-csv] streamed ${name} ${count}`);
  }
  return count;
}

function publication(row: Row) {
  const active = publish && clean(row.status) === "1";
  return { status: active ? "Published" : "Draft", is_active: active };
}
function courseLevel(value: unknown) {
  const raw = clean(value).toUpperCase();
  if (raw === "UG") return "Undergraduate";
  if (raw === "PG") return "Postgraduate";
  if (/PHD|DOCTOR/.test(raw)) return "Doctorate";
  if (/DIPLOMA/.test(raw)) return "Diploma";
  if (/CERT/.test(raw)) return "Certificate";
  return titleCase(value) || "General";
}
function categoryValues(value: unknown, categoriesById: Map<string, string>) {
  const values = stringList(value).map((item) => categoriesById.get(clean(item)) ?? item).map(titleCase).filter(Boolean);
  return unique(values.length ? values : ["General"]);
}
function pickCandidates(rows: Row[], slugField: string, entity: "colleges" | "courses" | "exams") {
  const selected = new Map<string, Row>();
  for (const row of rows) {
    const slug = slugify(row[slugField]);
    if (!slug) continue;
    const previous = selected.get(slug);
    if (previous) {
      report.entities[entity].duplicate_source_slugs.push(slug);
      selected.set(slug, richer(previous, row));
    } else selected.set(slug, row);
  }
  report.entities[entity].source_rows = rows.length;
  report.entities[entity].duplicate_source_slugs = unique(report.entities[entity].duplicate_source_slugs, 100_000).sort();
  return selected;
}

/**
 * College exports contain a small number of reused or blank slugs. Preserve
 * distinct campuses by progressively adding state, city and finally the
 * stable legacy id, while merging only rows that identify the same campus.
 */
function pickCollegeCandidates(rows: Row[]) {
  const selected = new Map<string, Row>();
  const slugBySignature = new Map<string, string>();
  const used = new Set<string>();
  const resolvedSlugById = new Map<string, string>();
  const collisionSlugs: string[] = [];

  for (const row of rows) {
    const nameSlug = slugify(row.clg_name) || "college";
    const stateSlug = slugify(row.clg_state);
    const citySlug = slugify(row.clg_city);
    const legacyId = slugify(row.id);
    const signature = [normalizedName(row.clg_name), normalizedName(row.clg_state), normalizedName(row.clg_city)].join("|");
    const previousSlug = signature.replace(/\|/g, "") ? slugBySignature.get(signature) : undefined;

    if (previousSlug) {
      selected.set(previousSlug, richer(selected.get(previousSlug)!, row));
      if (clean(row.id)) resolvedSlugById.set(clean(row.id), previousSlug);
      report.mapping.exact_duplicate_colleges_merged += 1;
      continue;
    }

    const sourceSlug = slugify(row.clg_slug) || nameSlug;
    const candidates = unique([
      sourceSlug,
      [nameSlug, stateSlug].filter(Boolean).join("-"),
      [nameSlug, stateSlug, citySlug].filter(Boolean).join("-"),
      [nameSlug, stateSlug, citySlug, legacyId].filter(Boolean).join("-"),
      `${nameSlug}-${createHash("sha256").update(`${signature}|${clean(row.id)}`).digest("hex").slice(0, 10)}`,
    ], 10).map((value) => value.slice(0, 180).replace(/-+$/g, ""));
    const slug = candidates.find((value) => value && !used.has(value));
    if (!slug) throw new Error(`Unable to create a unique slug for legacy college ${clean(row.id) || clean(row.clg_name)}`);
    if (slug !== sourceSlug) {
      report.mapping.college_slug_collisions_resolved += 1;
      collisionSlugs.push(sourceSlug);
    }
    used.add(slug);
    selected.set(slug, row);
    slugBySignature.set(signature, slug);
    if (clean(row.id)) resolvedSlugById.set(clean(row.id), slug);
  }

  report.entities.colleges.source_rows = rows.length;
  report.entities.colleges.duplicate_source_slugs = unique(collisionSlugs, 100_000).sort();
  return { selected, resolvedSlugById };
}

const empty = (value: unknown) => value == null || value === "" || (Array.isArray(value) && value.length === 0);
const mergeExisting = (existing: Json, legacy: Json) => {
  if (overwriteExisting) {
    const merged = { ...existing, ...legacy, id: existing.id, created_at: existing.created_at, short_id: existing.short_id, author_id: existing.author_id, priority: existing.priority, status: existing.status, is_active: existing.is_active };
    return merged;
  }
  const merged: Json = { ...existing };
  for (const [key, value] of Object.entries(legacy)) {
    if (["slug", "tags", "categories", "related_courses", "related_exams", "gallery_images", "carousel_images", "top_recruiters", "facilities", "approvals", "highlights"].includes(key) && Array.isArray(value)) {
      merged[key] = unique([...(Array.isArray(existing[key]) ? existing[key] as string[] : []), ...value.map(clean)], key.includes("images") ? 30 : 100);
    } else if (key === "slug" || empty(existing[key])) merged[key] = value;
  }
  const existingTags = Array.isArray(existing.tags) ? existing.tags.map(clean) : [];
  const isLegacyManaged = existingTags.some((tag) => tag === "legacy-csv-2024" || tag === "legacy-archive");
  if (isLegacyManaged && existing.affiliation_kind === "standalone") {
    if (legacy.affiliation_kind === "university") merged.affiliation_kind = "university";
    if (legacy.affiliation_kind === "affiliated" && clean(legacy.parent_university_slug)) {
      merged.affiliation_kind = "affiliated";
      merged.parent_university_slug = legacy.parent_university_slug;
    }
  }
  return merged;
};

async function existingRows(client: SupabaseClient, entity: "colleges" | "courses" | "exams", slugs: string[]) {
  const found = new Map<string, Json>();
  for (let index = 0; index < slugs.length; index += 100) {
    const { data, error } = await client.from(entity).select("*").in("slug", slugs.slice(index, index + 100));
    if (error) throw error;
    for (const row of data ?? []) found.set(row.slug, row as Json);
  }
  return found;
}
async function syncEntity(client: SupabaseClient, entity: "colleges" | "courses" | "exams", rows: Json[]) {
  const stats = report.entities[entity];
  const current = await existingRows(client, entity, rows.map((row) => String(row.slug)));
  stats.existing_rows += current.size;
  const fresh = rows.filter((row) => !current.has(String(row.slug)));
  for (let index = 0; index < fresh.length; index += 100) {
    const batch = fresh.slice(index, index + 100);
    const { error } = await client.from(entity).insert(batch);
    if (!error) { stats.inserted += batch.length; }
    else {
      for (const item of batch) {
        const result = await client.from(entity).insert(item);
        if (result.error) stats.failed.push({ key: String(item.slug), message: result.error.message });
        else stats.inserted += 1;
      }
    }
    if ((index + batch.length) % 500 === 0 || index + batch.length === fresh.length) console.log(`[import:legacy-csv] ${entity} inserted ${index + batch.length}/${fresh.length}`);
  }
  if (skipExisting) {
    stats.skipped += current.size;
    return;
  }
  for (const legacy of rows.filter((row) => current.has(String(row.slug)))) {
    const old = current.get(String(legacy.slug))!;
    const merged = mergeExisting(old, legacy);
    const patch = Object.fromEntries(Object.entries(merged).filter(([key, value]) => !["id", "created_at", "short_id"].includes(key) && JSON.stringify(value) !== JSON.stringify(old[key])));
    if (!Object.keys(patch).length) { stats.skipped += 1; continue; }
    const result = await client.from(entity).update(patch).eq("slug", legacy.slug);
    if (result.error) stats.failed.push({ key: String(legacy.slug), message: result.error.message });
    else stats.enriched += 1;
  }
}
async function syncCourseFees(client: SupabaseClient, rows: Json[]) {
  const stats = report.entities.course_fees;
  for (let index = 0; index < rows.length; index += 250) {
    const batch = rows.slice(index, index + 250);
    const { error } = await client.from("course_fees").upsert(batch, { onConflict: "id" });
    if (!error) stats.inserted += batch.length;
    else {
      for (const item of batch) {
        const result = await client.from("course_fees").upsert(item, { onConflict: "id" });
        if (result.error) stats.failed.push({ key: String(item.id), message: result.error.message });
        else stats.inserted += 1;
      }
    }
    if ((index + batch.length) % 1000 === 0 || index + batch.length === rows.length) console.log(`[import:legacy-csv] course_fees synced ${index + batch.length}/${rows.length}`);
  }
}

const postgresArray = (values: string[]) => `{${values.map((value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
const csvCell = (value: unknown, field: string) => {
  const formatted = field === "important_dates" || field === "question_papers"
    ? JSON.stringify(value ?? [])
    : Array.isArray(value) ? postgresArray(value.map(clean)) : value && typeof value === "object" ? JSON.stringify(value) : value == null ? "" : String(value);
  return /[",\n\r]/.test(formatted) ? `"${formatted.replace(/"/g, '""')}"` : formatted;
};
async function exportCsv(entity: Entity, rows: Json[], directory: string) {
  const headers = unique(rows.flatMap((row) => Object.keys(row)), 10_000);
  const body = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header], header)).join(","))].join("\n");
  await writeFile(resolve(directory, `${entity}.csv`), body);
}

async function main() {
  console.log(`[import:legacy-csv] reading ${resolve(sourceDir!)}`);
  const [collegeRows, courseRows, examRows, offeringRows, degreeRows, categoryRows] = await Promise.all([
    csv("colleges"), csv("course_info"), csv("exams"), csv("college_course"), csv("degree"), csv("college_category"),
  ]);
  const { selected: collegeCandidates, resolvedSlugById: collegeSlugById } = pickCollegeCandidates(collegeRows);
  const courseCandidates = pickCandidates(courseRows, "course_slug", "courses");
  const examCandidates = pickCandidates(examRows, "slug", "exams");
  const categoriesById = new Map(categoryRows.map((row) => [clean(row.cat_id), clean(row.cat_name)]));
  const examAlias = new Map<string, string>();
  for (const [slug, row] of examCandidates) for (const alias of [slug, row.name, row.short_name]) if (normalizedName(alias)) examAlias.set(normalizedName(alias), slug);

  const courseAlias = new Map<string, string>();
  for (const [slug, row] of courseCandidates) {
    for (const alias of [slug, row.course_name, row.branch, row.course_offered]) if (normalizedName(alias)) courseAlias.set(normalizedName(alias), slug);
  }
  for (const row of degreeRows) {
    const known = [row.name, row.short_name, row.full_name].map((alias) => courseAlias.get(normalizedName(alias))).find(Boolean);
    if (known) for (const alias of [row.name, row.short_name, row.full_name]) if (normalizedName(alias)) courseAlias.set(normalizedName(alias), known);
  }

  const relatedCourses = new Map<string, Set<string>>();
  const offeringsByCourse = new Map<string, Set<string>>();
  const feeRows = new Map<string, Json>();
  const unmatched = new Map<string, number>();
  report.mapping.college_course_rows = offeringRows.length;
  for (const row of offeringRows) {
    const collegeSlug = collegeSlugById.get(clean(row.clg_id));
    if (!collegeSlug) { report.mapping.orphan_college_offerings += 1; continue; }
    const courseSlug = [row.degree_name, row.course_name].map((name) => courseAlias.get(normalizedName(name))).find(Boolean);
    if (!courseSlug) {
      const name = clean(row.course_name) || clean(row.degree_name) || "Unknown";
      unmatched.set(name, (unmatched.get(name) ?? 0) + 1);
      report.mapping.unmatched_course_offerings += 1;
      continue;
    }
    report.mapping.matched_course_offerings += 1;
    if (!relatedCourses.has(collegeSlug)) relatedCourses.set(collegeSlug, new Set());
    relatedCourses.get(collegeSlug)!.add(courseSlug);
    if (!offeringsByCourse.has(courseSlug)) offeringsByCourse.set(courseSlug, new Set());
    offeringsByCourse.get(courseSlug)!.add(collegeSlug);
    const amount = feeNumber(row.fee);
    const feeType = titleCase(row.fee_type) || "Annual";
    const offeringKey = `${collegeSlug}|${courseSlug}|${clean(row.specialization_name)}|${feeType}|${amount}`;
    if (amount > 0 && !feeRows.has(offeringKey)) feeRows.set(offeringKey, {
      id: deterministicUuid(`legacy-course-fee|${offeringKey}`), college_slug: collegeSlug, course_slug: courseSlug,
      course_name: clean(row.specialization_name) ? `${clean(row.course_name)} - ${clean(row.specialization_name)}` : clean(row.course_name),
      fee_amount: amount, fee_type: feeType, year: clean(row.duration) && clean(row.duration_type) ? `${clean(row.duration)} ${clean(row.duration_type)}` : "",
    });
  }
  report.mapping.unmatched_course_names = [...unmatched].sort((a, b) => b[1] - a[1]).slice(0, 500).map(([name, occurrences]) => ({ name, occurrences }));

  const galleriesByCollege = new Map<string, string[]>();
  await streamCsv("college_gallery", (row) => {
    const slug = collegeSlugById.get(clean(row.clg_id));
    const image = httpsUrl(row.gallery_url, row.s3_url, row.olds_gallery_url);
    if (!slug || !image) return;
    const values = galleriesByCollege.get(slug) ?? [];
    if (values.length < 20 && !values.includes(image)) values.push(image);
    galleriesByCollege.set(slug, values);
  });
  const recruitersByCollege = new Map<string, string[]>();
  await streamCsv("college_placement", (row) => {
    const slug = collegeSlugById.get(clean(row.clg_id));
    const company = clean(row.company_name);
    if (!slug || !company) return;
    const values = recruitersByCollege.get(slug) ?? [];
    if (values.length < 50 && !values.includes(company)) values.push(company);
    recruitersByCollege.set(slug, values);
  });

  const collegeAliases = new Map<string, string | null>();
  const addCollegeAlias = (alias: unknown, slug: string) => {
    const key = normalizedName(alias);
    if (!key) return;
    if (!collegeAliases.has(key)) {
      collegeAliases.set(key, slug);
      return;
    }
    const previous = collegeAliases.get(key);
    if (previous !== slug) collegeAliases.set(key, null);
  };
  for (const [slug, row] of collegeCandidates) {
    for (const alias of [slug, row.clg_name, row.clg_short]) addCollegeAlias(alias, slug);
  }
  const parentSlugFor = (value: unknown) => {
    const raw = clean(value);
    if (!raw) return null;
    const candidates = [raw, raw.split(",")[0], raw.replace(/\s*[-–]\s*[^-–]+$/, "")];
    for (const candidate of candidates) {
      const found = collegeAliases.get(normalizedName(candidate));
      if (found) return found;
    }
    return null;
  };

  const invalidYears = new Map<string, number>();
  const unresolvedParents = new Map<string, number>();
  const colleges: Json[] = [...collegeCandidates].map(([slug, row]) => {
    const year = establishedYear(row.clg_estd);
    if (clean(row.clg_estd) && !year) invalidYears.set(clean(row.clg_estd), (invalidYears.get(clean(row.clg_estd)) ?? 0) + 1);
    const galleries = galleriesByCollege.get(slug) ?? [];
    const banner = httpsUrl(row.banner_url, row.old_banner_url, row.banner_img_download);
    const logo = httpsUrl(row.logo_url, row.old_logo_url, row.logo_img_download);
    const categories = categoryValues(row.college_category, categoriesById);
    const accepted = stringList(row.accepted_exams).map((item) => examAlias.get(normalizedName(item)) ?? slugify(item)).filter((item) => examCandidates.has(item));
    const courses = [...(relatedCourses.get(slug) ?? [])];
    const legacyParentName = clean(row.clg_university);
    const parentUniversitySlug = parentSlugFor(legacyParentName);
    const isUniversity = /\buniversity\b/i.test(clean(row.clg_name));
    const hasResolvedParent = Boolean(parentUniversitySlug && parentUniversitySlug !== slug && !isUniversity);
    if (hasResolvedParent) report.mapping.resolved_parent_universities += 1;
    else if (legacyParentName && !isUniversity) unresolvedParents.set(legacyParentName, (unresolvedParents.get(legacyParentName) ?? 0) + 1);
    return {
      slug, name: text(row.clg_name, 500), short_name: text(row.clg_short, 255), location: text(row.clg_location || row.clg_address, 500),
      city: titleCase(row.clg_city), state: titleCase(row.clg_state), type: titleCase(row.clg_institute_type) || "Private", category: categories[0], categories,
      established: year || 2000, description: text(row.clg_about_us || row.clg_about), image: banner || logo, logo, carousel_images: unique([banner, ...galleries].filter(Boolean), 20), gallery_images: galleries,
      fees: text(row.fees, 10_000), placement: text(row.placement, 10_000), placement_content: text(row.clg_placement_summary || row.placement),
      eligibility_criteria: text(row.eligibility_criteria), admission_process: text(row.admission_process), scholarship_details: text(row.scholarship_offered),
      scholarship_available: clean(row.scholarship_offered) ? "yes" : "unknown", hostel_life: text(row.hostel_life), brochure_url: httpsUrl(row.broucher),
      course_fee_content: text(row.undergraduate_fee_structure || row.postgraduate_fee_structure), facilities_content: text(row.facillities), facilities: stringList(row.facillities),
      approvals: stringList(row.affiliated_with), top_recruiters: recruitersByCollege.get(slug) ?? [], courses_count: courses.length, related_courses: courses,
      related_exams: unique(accepted), tags: ["legacy-csv-2024"], meta_title: text(row.meta_title, 500), meta_description: text(row.meta_description, 5_000),
      meta_keywords: text(row.meta_keywords, 5_000), is_partner: boolean(row.partner),
      // `affiliated_with` contains approval bodies (AICTE/NAAC/etc.). The
      // actual legacy university name is `clg_university`; only create a
      // constrained relationship when it resolves to a real imported slug.
      affiliation_kind: isUniversity ? "university" : hasResolvedParent ? "affiliated" : "standalone",
      parent_university_slug: hasResolvedParent ? parentUniversitySlug : null,
      ...publication(row),
    };
  }).filter((row) => clean(row.slug) && clean(row.name));
  report.mapping.invalid_established_values = [...invalidYears].sort((a, b) => b[1] - a[1]).map(([value, occurrences]) => ({ value, occurrences }));
  report.mapping.unresolved_parent_universities = [...unresolvedParents].sort((a, b) => b[1] - a[1]).slice(0, 1_000).map(([name, occurrences]) => ({ name, occurrences }));

  const courses: Json[] = [...courseCandidates].map(([slug, row]) => {
    const categories = categoryValues(row.category, categoriesById);
    const low = feeNumber(row.low_fee); const high = feeNumber(row.high_fee);
    const minimum = low && high ? Math.min(low, high) : low || high;
    const maximum = low && high ? Math.max(low, high) : low || high;
    const durationType = titleCase(row.duration_type);
    const duration = [clean(row.duration), durationType].filter(Boolean).join(" ");
    const specializations = unique([...stringList(row.branch), ...stringList(row.similar_courses).map((item) => clean(item))]);
    return {
      slug, name: text(row.course_name, 500), full_name: text(row.course_name, 500), category: categories[0], categories, level: courseLevel(row.course_level),
      duration, duration_type: durationType, study_type: titleCase(row.study_type) || "Full Time", mode: titleCase(row.study_type) || "Full-Time",
      colleges_count: offeringsByCourse.get(slug)?.size ?? 0, avg_fees: minimum || maximum ? `₹${Math.round((minimum + maximum) / 2).toLocaleString("en-IN")}` : "",
      fee: minimum && maximum ? Math.round((minimum + maximum) / 2) : minimum || maximum, low_fee: minimum, high_fee: maximum,
      image: httpsUrl(row.logo_url), description: text(row.course_about || row.course_content), about_content: text(row.course_about || row.course_content),
      eligibility: text(row.course_eligiblity), scope_content: text(row.course_scope), subjects_content: text(row.course_subjects), subjects: htmlItems(row.course_subjects, 100),
      specializations, specialization_content: text(row.branch), meta_title: text(row.meta_title, 500), meta_description: text(row.meta_description, 5_000),
      meta_keywords: text(row.meta_keywords, 5_000), tags: undefined, ...publication(row),
    };
  }).map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined))).filter((row) => clean(row.slug) && clean(row.name));

  const exams: Json[] = [...examCandidates].map(([slug, row]) => {
    const categories = categoryValues(row.category, categoriesById);
    const eligibility = text(row.elegiblity_criteria || row.eligibility);
    const importantDates = [
      ["Application starts", isoDate(row.application_form_start_date)], ["Application ends", isoDate(row.application_form_end_date)],
      ["Exam date", isoDate(row.examination_date)], ["Result date", isoDate(row.result_anounce_date)],
    ].filter(([, date]) => date).map(([label, date]) => ({ label, date }));
    return {
      slug, name: text(row.name, 500), full_name: text(row.name, 500), short_name: text(row.short_name, 255), logo: httpsUrl(row.logo), image: httpsUrl(row.logo),
      category: categories[0], categories, level: titleCase(row.level) || "National", exam_type: titleCase(row.exam_type), mode: titleCase(row.exam_mode) || "Online (CBT)",
      application_mode: titleCase(row.application_mode) || "Online", application_start_date: isoDate(row.application_form_start_date), application_end_date: isoDate(row.application_form_end_date),
      exam_date: isoDate(row.examination_date), result_date: isoDate(row.result_anounce_date), important_dates: importantDates, duration: clean(row.duration), frequency: titleCase(row.frequency) || "Once",
      website: httpsUrl(row.website), registration_url: httpsUrl(row.website) || "#", language: titleCase(row.language) || "English", negative_marking: boolean(row.neg_marking),
      seats: clean(row.number_of_seates), age_limit: clean(row.age_limit), description: text(row.summary), summary_content: text(row.summary), application_process: text(row.application_process),
      eligibility, syllabus: htmlItems(row.syllabus, 100), exam_pattern: text(row.exam_pattern), cutoff_content: text(row.exam_cut_off), preparation_tips: text(row.preparation_tips),
      counselling_content: text(row.counselling), center_content: text(row.center), gender_wise: text(row.gender_wise), cast_wise_fee: text(row.cast_wise_fees),
      meta_title: text(row.meta_title, 500), meta_description: text(row.meta_description, 5_000), meta_keywords: text(row.meta_keywords, 5_000), ...publication(row),
    };
  }).filter((row) => clean(row.slug) && clean(row.name));
  const courseFees = [...feeRows.values()];

  report.entities.colleges.mapped_rows = colleges.length;
  report.entities.courses.mapped_rows = courses.length;
  report.entities.exams.mapped_rows = exams.length;
  report.entities.course_fees.source_rows = offeringRows.length;
  report.entities.course_fees.mapped_rows = courseFees.length;
  console.log(`[import:legacy-csv] mapped colleges=${colleges.length} courses=${courses.length} exams=${exams.length} course_fees=${courseFees.length}`);

  if (exportDir) {
    const directory = resolve(exportDir); await mkdir(directory, { recursive: true });
    await exportCsv("colleges", colleges, directory); await exportCsv("courses", courses, directory); await exportCsv("exams", exams, directory); await exportCsv("course_fees", courseFees, directory);
    await writeFile(resolve(directory, "README.txt"), [
      "DekhoCampus legacy CSV mapping output", "", "Import order: courses.csv, exams.csv, colleges.csv, course_fees.csv.",
      "Rows are Draft/inactive unless the mapping command included --publish.", "Array columns use PostgreSQL text[] syntax. JSON columns contain valid JSON.",
      "The command-line importer is preferred because it preserves/enriches existing rows and is resumable.",
    ].join("\n"));
    console.log(`[import:legacy-csv] manual files written to ${directory}`);
  }

  if (apply) {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const preflight = await client.from("colleges").select("slug", { count: "exact", head: true });
    if (preflight.error) throw preflight.error;
    console.log(`[import:legacy-csv] destination preflight passed; current colleges=${preflight.count ?? "unknown"}`);
    if (!onlyColleges) {
      await syncEntity(client, "courses", courses);
      await syncEntity(client, "exams", exams);
    }
    // Parent rows must exist before affiliation triggers validate child rows.
    await syncEntity(client, "colleges", colleges.filter((row) => row.affiliation_kind !== "affiliated"));
    await syncEntity(client, "colleges", colleges.filter((row) => row.affiliation_kind === "affiliated"));
    if (!onlyColleges) await syncCourseFees(client, courseFees);
  }

  await mkdir(resolve(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`[import:legacy-csv] report written to ${reportPath}`);
  console.log(JSON.stringify({ mode: report.mode, mapped: Object.fromEntries(Object.entries(report.entities).map(([key, value]) => [key, value.mapped_rows])), mapping: { matched_course_offerings: report.mapping.matched_course_offerings, unmatched_course_offerings: report.mapping.unmatched_course_offerings, orphan_college_offerings: report.mapping.orphan_college_offerings } }, null, 2));
}

await main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[import:legacy-csv] failed"); console.error(message);
  try { await mkdir(resolve(reportPath, ".."), { recursive: true }); await writeFile(reportPath, JSON.stringify({ ...report, fatal_error: message }, null, 2)); } catch { /* keep original error */ }
  process.exitCode = 1;
});
