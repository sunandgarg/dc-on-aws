/** Safe, repeatable importer for the archived DekhoCampus Directus/MySQL export.
 * Default mode is read-only. `--apply` needs a service-role key. Historical
 * leads additionally require `--include-leads` and remain in quarantine. */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, string | null>;
type Stat = { found: number; inserted: number; skipped: number; warnings: string[] };
type Summary = Record<string, Stat>;
const args = process.argv.slice(2);
const value = (name: string) => args[args.indexOf(name) + 1];
const enabled = (name: string) => args.includes(name);
const sqlPath = value("--sql");
const assetsPath = value("--assets");
const assetBaseUrl = value("--asset-base-url");
const apply = enabled("--apply");
const includeLeads = enabled("--include-leads");
const syncAssets = enabled("--sync-assets");
if (!sqlPath) throw new Error("Pass --sql /absolute/path/to/dekhocampus-database-full.sql");
if (apply && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error("--apply requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never use a publishable key for imports.");

const stat = (summary: Summary, name: string) => summary[name] ??= { found: 0, inserted: 0, skipped: 0, warnings: [] };
const plain = (input: string | null) => input?.replace(/\u0000/g, "").trim() || null;
const slug = (input: string | null | undefined) => (input ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
const number = (input: string | null) => { const parsed = Number((input ?? "").replace(/[^0-9.]/g, "")); return Number.isFinite(parsed) ? parsed : null; };
const timestamp = (input: string | null) => { if (!input || input.startsWith("0000-00-00")) return null; const parsed = new Date(`${input.replace(" ", "T")}Z`); return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString(); };
const text = (input: string | null, fallback = "") => plain(input) ?? fallback;
const pick = <T>(...values: Array<T | null | undefined>) => values.find((value) => value !== null && value !== undefined && value !== "") ?? null;
const year = (input: string | null, fallback = 2000) => {
  const match = plain(input)?.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : fallback;
};
const tryJson = (input: string | null) => {
  const value = plain(input);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
};
const textList = (input: string | null) => {
  const parsed = tryJson(input);
  if (Array.isArray(parsed)) return parsed.map((item) => plain(String(item))).filter(Boolean) as string[];
  const value = plain(input);
  if (!value) return [];
  return value.split(/[,|]/).map((item) => plain(item)).filter(Boolean) as string[];
};
const firstSentence = (input: string | null, fallback = "") => {
  const value = text(input, fallback).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!value) return fallback;
  const sentence = value.match(/.+?[.!?](\s|$)/)?.[0]?.trim();
  return sentence || value.slice(0, 220);
};

type LegacyRefs = {
  states: Map<string, string>;
  cities: Map<string, string>;
  commonCategories: Map<string, string>;
  articleCategories: Map<string, string>;
  authors: Map<string, string>;
  collegeCourseFees: Map<string, Row[]>;
  collegePlacements: Map<string, string[]>;
};

function splitOutside(text: string, delimiter: string) {
  const parts: string[] = []; let quote = false; let escape = false; let depth = 0; let start = 0;
  for (let i = 0; i < text.length; i += 1) { const char = text[i]; if (escape) { escape = false; continue; } if (char === "\\") { escape = true; continue; } if (char === "'") { quote = !quote; continue; } if (!quote && char === "(") depth += 1; if (!quote && char === ")") depth -= 1; if (!quote && depth === 0 && char === delimiter) { parts.push(text.slice(start, i)); start = i + 1; } }
  parts.push(text.slice(start)); return parts;
}

/** Parses INSERT statements safely even when HTML has semicolons. */
function readTable(sql: string, table: string): Row[] {
  const create = sql.indexOf(`CREATE TABLE \`${table}\``); if (create < 0) return [];
  const structure = sql.slice(create, sql.indexOf(") ENGINE=", create));
  const columns = [...structure.matchAll(/^  `([^`]+)`/gm)].map((match) => match[1]);
  const marker = `INSERT INTO \`${table}\` VALUES `; const rows: Row[] = []; let cursor = 0;
  while ((cursor = sql.indexOf(marker, cursor)) >= 0) {
    const valuesStart = cursor + marker.length; let quote = false; let escape = false; let end = valuesStart;
    for (; end < sql.length; end += 1) { const char = sql[end]; if (escape) { escape = false; continue; } if (char === "\\") { escape = true; continue; } if (char === "'") { quote = !quote; continue; } if (!quote && char === ";") break; }
    for (const group of splitOutside(sql.slice(valuesStart, end), ",").map((item) => item.trim()).filter((item) => item.startsWith("(") && item.endsWith(")"))) {
      const fields = splitOutside(group.slice(1, -1), ",").map((item) => { const v = item.trim(); if (v === "NULL") return null; return v.startsWith("'") && v.endsWith("'") ? v.slice(1, -1).replace(/\\0/g, "\0").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\'/g, "'").replace(/\\\\/g, "\\") : v; });
      if (fields.length === columns.length) rows.push(Object.fromEntries(columns.map((column, index) => [column, fields[index]])));
    }
    cursor = end + 1;
  }
  return rows;
}

async function recursively(directory: string): Promise<string[]> { const entries = await readdir(directory, { withFileTypes: true }); return (await Promise.all(entries.map((entry) => { const path = join(directory, entry.name); return entry.isDirectory() ? recursively(path) : [path]; }))).flat(); }
function mime(path: string) { return ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".pdf": "application/pdf" } as Record<string, string>)[extname(path).toLowerCase()] ?? "application/octet-stream"; }

async function mergeSlug(client: SupabaseClient, table: string, payload: Record<string, unknown>, summary: Summary) {
  const item = stat(summary, table); item.found += 1; const key = String(payload.slug ?? "");
  if (!key) { item.skipped += 1; return; }
  const { data: existing, error: lookupError } = await client.from(table).select("*").eq("slug", key).maybeSingle(); if (lookupError) throw lookupError;
  const update = existing ? Object.fromEntries(Object.entries(payload).filter(([field, fieldValue]) => { const current = (existing as Record<string, unknown>)[field]; return (current === null || current === "" || (Array.isArray(current) && current.length === 0)) && fieldValue !== null; })) : payload;
  if (existing && Object.keys(update).length === 0) { item.skipped += 1; return; }
  const { error } = existing ? await client.from(table).update(update).eq("slug", key) : await client.from(table).insert(payload); if (error) throw error; item.inserted += 1;
}

function buildRefs(sql: string): LegacyRefs {
  const states = new Map(readTable(sql, "state").map((row) => [String(row.id), text(row.name)]).filter(([, name]) => Boolean(name)));
  const cities = new Map(readTable(sql, "city").map((row) => [String(row.id), text(row.name)]).filter(([, name]) => Boolean(name)));
  const commonCategories = new Map(readTable(sql, "common_categories").map((row) => [String(row.id), text(row.name)]).filter(([, name]) => Boolean(name)));
  const articleCategories = new Map(readTable(sql, "categories").map((row) => [String(row.id), text(row.name)]).filter(([, name]) => Boolean(name)));
  const authors = new Map(readTable(sql, "directus_users").map((row) => {
    const full = [plain(row.first_name), plain(row.last_name)].filter(Boolean).join(" ").trim();
    return [String(row.id), full || text(row.email)];
  }).filter(([, name]) => Boolean(name)));

  const courseAndFees = new Map(readTable(sql, "course_and_fee").map((row) => [String(row.id), row]));
  const collegeCourseFees = new Map<string, Row[]>();
  for (const link of readTable(sql, "college_course_and_fee")) {
    const collegeId = plain(link.college_id);
    const feeRow = courseAndFees.get(String(link.course_and_fee_id));
    if (!collegeId || !feeRow) continue;
    const bucket = collegeCourseFees.get(collegeId) ?? [];
    bucket.push(feeRow);
    collegeCourseFees.set(collegeId, bucket);
  }

  const placementNames = new Map(readTable(sql, "college_placement").map((row) => [String(row.id), text(row.name)]).filter(([, name]) => Boolean(name)));
  const collegePlacements = new Map<string, string[]>();
  for (const link of readTable(sql, "college_college_placement")) {
    const collegeId = plain(link.college_id);
    const name = placementNames.get(String(link.college_placement_id));
    if (!collegeId || !name) continue;
    const bucket = collegePlacements.get(collegeId) ?? [];
    if (!bucket.includes(name)) bucket.push(name);
    collegePlacements.set(collegeId, bucket);
  }

  return { states, cities, commonCategories, articleCategories, authors, collegeCourseFees, collegePlacements };
}

async function runContent(sql: string, client: SupabaseClient | null, summary: Summary) {
  const refs = buildRefs(sql);
  const mappings: Array<[string, string, (row: Row) => Record<string, unknown> | null]> = [
    ["college", "colleges", (r) => {
      const key = slug(r.slug || r.name);
      if (!key || !r.name) return null;
      const linkedFees = refs.collegeCourseFees.get(String(r.id)) ?? [];
      const firstLinkedFee = linkedFees[0];
      const category = pick(firstLinkedFee ? refs.commonCategories.get(String(firstLinkedFee.category)) : null, "General");
      const feeText = firstLinkedFee?.fee ? `₹${Number(firstLinkedFee.fee).toLocaleString("en-IN")}${plain(firstLinkedFee.fee_type) ? `/${plain(firstLinkedFee.fee_type)}` : ""}` : "";
      const stateName = refs.states.get(String(r.state)) ?? "";
      const cityName = refs.cities.get(String(r.city)) ?? "";
      const recruiters = refs.collegePlacements.get(String(r.id)) ?? [];
      return {
        slug: key,
        name: text(r.name),
        short_name: text(r.short_name),
        type: text(r.type, "Private"),
        category,
        rating: number(r.rating) ?? 0,
        reviews: number(r.rating_count) ?? 0,
        location: text(r.location),
        city: cityName,
        state: stateName,
        courses_count: linkedFees.length,
        established: year(r.established_in),
        description: text(r.description),
        image: "",
        logo: "",
        fees: feeText,
        brochure_url: "",
        eligibility_criteria: text(r.eligibility_criteria),
        admission_process: text(r.admission_process),
        scholarship_details: text(r.scholarship_details),
        hostel_life: text(r.hostel_life),
        cutoff: text(r.cutoff),
        facilities_content: text(r.facilities),
        rankings_content: text(r.rankings),
        placement_content: text(r.placement_content),
        course_fee_content: text(r.course_and_fee_content),
        meta_title: text(r.meta_title),
        meta_description: text(r.meta_description),
        meta_keywords: textList(r.meta_keywords).join(", "),
        top_recruiters: recruiters,
        status: r.status === "published" ? "published" : "draft",
        is_active: r.status === "published",
      };
    }],
    ["course", "courses", (r) => {
      const key = slug(r.slug || r.name);
      return key && r.name ? {
        slug: key,
        name: text(r.short_name || r.name),
        full_name: text(r.name),
        category: refs.commonCategories.get(String(r.category)) ?? "General",
        duration: r.duration ? `${text(r.duration)} ${text(r.duration_type || "Years")}`.trim() : text(r.duration_type),
        rating: number(r.rating) ?? 0,
        image: "",
        study_type: text(r.study_type),
        duration_type: text(r.duration_type),
        fee: number(r.fee) ?? 0,
        low_fee: number(r.low_fee) ?? 0,
        high_fee: number(r.high_fee) ?? 0,
        avg_fees: text(r.fees),
        description: text(pick(r.short_description, r.about)),
        short_description: text(r.short_description, firstSentence(r.about)),
        domain: text(r.domain),
        about_content: text(r.about),
        scope_content: text(r.scope),
        subjects_content: text(r.subjects),
        placements_content: text(r.placements),
        admission_process: text(r.admission_process),
        fees_content: text(r.fees),
        cutoff_content: text(r.cut_off),
        specialization_content: text(r.specialization),
        syllabus_content: text(r.syllabus),
        meta_title: text(r.meta_title),
        meta_description: text(r.meta_description),
        meta_keywords: textList(r.meta_keywords).join(", "),
        status: r.status === "published" ? "published" : "draft",
        is_active: r.status === "published",
      } : null;
    }],
    ["exam", "exams", (r) => {
      const key = slug(r.slug || r.name);
      return key && r.name ? {
        slug: key,
        name: text(r.short_name || r.name),
        full_name: text(r.name),
        short_name: text(r.short_name),
        image: "",
        logo: "",
        category: refs.commonCategories.get(String(r.category)) ?? "General",
        level: text(r.level),
        exam_date: text(r.exam_date),
        application_start_date: text(r.application_form_start_date),
        application_end_date: text(r.application_form_end),
        result_date: text(r.result_date),
        mode: text(r.exam_mode),
        application_mode: text(r.application_mode),
        exam_type: text(r.exam_type),
        language: textList(r.language).join(", ") || text(r.language),
        frequency: text(r.frequency),
        website: text(r.website),
        duration: text(r.duration),
        seats: text(r.seats),
        age_limit: text(r.age_limit),
        eligibility: text(r.eligibility),
        description: firstSentence(r.summary),
        summary_content: text(r.summary),
        application_process: text(r.application_process),
        syllabus: textList(r.syllabus),
        exam_pattern: text(r.exam_pattern),
        cutoff_content: text(r.cut_off),
        preparation_tips: text(r.preparation_tips),
        counselling_content: text(r.counselling),
        center_content: text(r.center),
        gender_wise: text(r.gender_wise),
        cast_wise_fee: text(r.cast_wise_fee),
        dates_content: text(r.dates),
        result_content: text(r.result),
        negative_marking: plain(r.negative_marking) === "1",
        meta_title: text(r.meta_title),
        meta_description: text(r.meta_description),
        meta_keywords: textList(r.meta_keywords).join(", "),
        status: r.status === "published" ? "published" : "draft",
        is_active: r.status === "published",
      } : null;
    }],
    ["blog_posts", "articles", (r) => {
      const key = slug(r.slug || r.title);
      return key && r.title ? {
        slug: key,
        title: text(r.title),
        content: text(r.content),
        description: text(r.description, firstSentence(r.content)),
        featured_image: "",
        views: number(r.views) ?? 0,
        category: refs.articleCategories.get(String(r.category)) ?? "",
        author: refs.authors.get(String(r.author)) ?? "",
        vertical: text(r.vertical),
        meta_title: text(r.meta_title),
        meta_description: text(r.meta_description, firstSentence(r.content)),
        meta_keywords: textList(r.meta_keywords).join(", "),
        status: r.status === "published" ? "published" : "draft",
        is_active: r.status === "published",
      } : null;
    }]
  ];
  for (const [source, destination, map] of mappings) for (const row of readTable(sql, source)) { const payload = map(row); if (!payload) { stat(summary, destination).skipped += 1; continue; } if (client) await mergeSlug(client, destination, payload, summary); else stat(summary, destination).found += 1; }
  const states = readTable(sql, "state").filter((row) => row.status === "published"); const accepted = new Map(states.map((row) => [row.id, plain(row.name)])); const cities = readTable(sql, "city").filter((row) => accepted.has(row.state)); const cityStat = stat(summary, "states_cities"); cityStat.found = cities.length;
  if (client) { const { data, error } = await client.from("states_cities").select("state,city"); if (error) throw error; const known = new Set((data ?? []).map((row) => `${slug(row.state)}:${slug(row.city)}`)); const payload = cities.map((row) => ({ state: accepted.get(row.state)!, city: plain(row.name), is_active: true })).filter((row) => row.city && !known.has(`${slug(row.state)}:${slug(row.city)}`)); for (let i = 0; i < payload.length; i += 250) { const { error: insertError } = await client.from("states_cities").insert(payload.slice(i, i + 250)); if (insertError) throw insertError; } cityStat.inserted = payload.length; cityStat.skipped = cities.length - payload.length; }
}

async function runLeads(sql: string, client: SupabaseClient | null, runId: string | undefined, summary: Summary) {
  if (!includeLeads) return; const rows = readTable(sql, "Lead"); const item = stat(summary, "legacy_leads_quarantine"); item.found = rows.length;
  for (const r of rows) { const email = plain(r.email)?.toLowerCase() ?? null; const phone = plain(r.phone)?.replace(/[^0-9+]/g, "") ?? null; if (!email && !phone) { item.skipped += 1; continue; } if (client) { const payload = { legacy_lead_id: Number(r.id), contact_fingerprint: createHash("sha256").update(`${email ?? ""}|${phone ?? ""}`).digest("hex"), name: plain(r.name), email, phone, gender: plain(r.gender), course_name: plain(r.course_name), level: plain(r.level), state: plain(r.state_name), city: plain(r.city_name), source: plain(r.source), source_detail: plain(r.sub_source), legacy_created_at: timestamp(r.date_created), consent_status: "unknown", marketing_eligible: false, import_run_id: runId }; const { error } = await client.from("legacy_leads_quarantine").upsert(payload, { onConflict: "legacy_lead_id" }); if (error) throw error; item.inserted += 1; } }
}

async function runAssets(client: SupabaseClient, directory: string, summary: Summary) { const item = stat(summary, "legacy-public-assets"); const files = (await recursively(directory)).filter((file) => /\.(jpe?g|png|webp|avif|svg|pdf)$/i.test(file)); item.found = files.length; for (const file of files) { const path = `frontend-images/${relative(directory, file).split("\\").join("/")}`; const { error } = await client.storage.from("legacy-public-assets").upload(path, await readFile(file), { contentType: mime(file), cacheControl: "31536000", upsert: true }); if (error) { item.skipped += 1; item.warnings.push(`${basename(file)}: ${error.message}`); } else item.inserted += 1; } }

/** Fetches only publicly readable legacy objects. It never uses archived AWS credentials. */
async function runRemoteAssets(client: SupabaseClient, sql: string, baseUrl: string, summary: Summary) {
  const item = stat(summary, "legacy-directus-assets");
  const source = readTable(sql, "directus_files"); item.found = source.length;
  for (const file of source) {
    if (!file.id || !file.filename_disk) { item.skipped += 1; continue; }
    const url = new URL(encodeURIComponent(file.filename_disk), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
    try {
      const response = await fetch(url, { redirect: "error" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const objectPath = `directus/${file.id}-${file.filename_disk}`;
      const { error } = await client.storage.from("legacy-public-assets").upload(objectPath, new Uint8Array(await response.arrayBuffer()), { contentType: response.headers.get("content-type") || mime(file.filename_download ?? ""), cacheControl: "31536000", upsert: true });
      if (error) throw error;
      item.inserted += 1;
    } catch (error) {
      item.skipped += 1;
      item.warnings.push(`${file.id}: ${error instanceof Error ? error.message : "download failed"}`);
    }
  }
}

const sql = await readFile(sqlPath, "utf8"); const sourceHash = createHash("sha256").update(sql).digest("hex"); const summary: Summary = {}; const client = apply ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }) : null; let runId: string | undefined;
if (client) { const { data, error } = await client.from("legacy_import_runs").insert({ source_name: basename(sqlPath), source_sha256: sourceHash, mode: "apply" }).select("id").single(); if (error) throw error; runId = data.id; }
await runContent(sql, client, summary); await runLeads(sql, client, runId, summary); if (client && syncAssets) { if (!assetsPath && !assetBaseUrl) throw new Error("--sync-assets needs --assets /absolute/path/to/public/images and/or --asset-base-url https://public-bucket.example/"); if (assetsPath) await runAssets(client, assetsPath, summary); if (assetBaseUrl) await runRemoteAssets(client, sql, assetBaseUrl, summary); }
if (client && runId) { const { error } = await client.from("legacy_import_runs").update({ completed_at: new Date().toISOString(), summary }).eq("id", runId); if (error) throw error; }
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", source_sha256: sourceHash, summary }, null, 2));
