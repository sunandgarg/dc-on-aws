/**
 * Mirror legacy DekhoCampus images into Supabase Storage as WebP and update
 * only successfully verified database references.
 *
 * Inventory (default, no writes):
 *   npm run migrate:legacy-assets -- --project-ref <ref>
 *
 * Apply:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   npm run migrate:legacy-assets -- --project-ref <ref> --apply
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type Json = Record<string, unknown>;
type FieldConfig = { name: string; array?: boolean };
type TableConfig = { table: string; fields: FieldConfig[] };
type Reference = { table: string; id: string; slug: string; field: string; array: boolean; original: string | string[] };
type AssetResult = {
  source: string;
  destination?: string;
  local_original_path?: string;
  local_webp_path?: string;
  source_bytes?: number;
  webp_bytes?: number;
  status: "mirrored" | "failed";
  message?: string;
};

const TABLES: TableConfig[] = [
  { table: "colleges", fields: [
    { name: "image" }, { name: "logo" }, { name: "banner_ad_image" }, { name: "square_ad_image" },
    { name: "carousel_images", array: true }, { name: "gallery_images", array: true },
  ] },
  { table: "courses", fields: [{ name: "image" }] },
  { table: "exams", fields: [{ name: "image" }, { name: "logo" }] },
  { table: "articles", fields: [{ name: "featured_image" }] },
];

const DEFAULT_HOSTS = new Set([
  "dekhocampus.s3.ap-south-1.amazonaws.com",
  "devdc.s3.eu-north-1.amazonaws.com",
  "d3pbz6yh6cuepy.cloudfront.net",
]);

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const option = (name: string, fallback?: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const options = (name: string) => args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1]] : []);
const apply = has("--apply");
const projectRef = option("--project-ref");
const bucket = option("--bucket", "legacy-public-assets")!;
const reportPath = resolve(option("--report", "reports/legacy-asset-migration-report.json")!);
const concurrency = Math.max(1, Math.min(48, Number(option("--concurrency", "6")) || 6));
const updateConcurrency = Math.max(1, Math.min(20, Number(option("--update-concurrency", "10")) || 10));
const quality = Math.max(50, Math.min(95, Number(option("--quality", "82")) || 82));
const maxWidth = Math.max(320, Math.min(4000, Number(option("--max-width", "1920")) || 1920));
const maxHeight = Math.max(320, Math.min(4000, Number(option("--max-height", "1920")) || 1920));
const maxInputBytes = Math.max(1_000_000, Number(option("--max-input-bytes", "26214400")) || 26_214_400);
const requestedLimit = Math.max(0, Number(option("--limit", "0")) || 0);
const checkpointSize = Math.max(50, Math.min(5000, Number(option("--checkpoint-size", "1000")) || 1000));
const migrateAll = has("--all");
const localBackupRoot = option("--local-backup-root");
const localOriginalsDir = localBackupRoot ? resolve(localBackupRoot, "originals") : null;
const localWebpDir = localBackupRoot ? resolve(localBackupRoot, "webp") : null;
const allowedHosts = new Set([...DEFAULT_HOSTS, ...options("--allow-host").map((host) => host.toLowerCase())]);

if (!projectRef) throw new Error("Pass --project-ref to make the destination explicit.");
if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL is required for inventory and apply modes.");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required. Never use a publishable key.");
if (/^sb_publishable_/i.test(process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error("A publishable key cannot run the asset migration.");
if (apply && !migrateAll && requestedLimit < 1) throw new Error("Apply mode requires --limit <count> for a controlled batch, or explicit --all.");
const destinationRef = new URL(process.env.SUPABASE_URL).hostname.split(".")[0];
if (destinationRef !== projectRef) throw new Error(`Destination mismatch: URL points to ${destinationRef}, --project-ref is ${projectRef}.`);

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const report = {
  generated_at: new Date().toISOString(), mode: apply ? "apply" : "inventory", project_ref: projectRef, bucket,
  settings: {
    concurrency,
    update_concurrency: updateConcurrency,
    checkpoint_size: checkpointSize,
    quality,
    max_width: maxWidth,
    max_height: maxHeight,
    max_input_bytes: maxInputBytes,
    allowed_hosts: [...allowedHosts],
    local_backup_root: localBackupRoot,
  },
  scanned_rows: {} as Record<string, number>, unique_assets: 0, scheduled_assets: 0, references: 0, mirrored: 0, failed: 0,
  source_bytes: 0, webp_bytes: 0, rows_updated: 0, update_failures: [] as Array<{ table: string; slug: string; message: string }>,
  assets: [] as AssetResult[],
};

const cleanUrl = (value: unknown) => {
  if (typeof value !== "string" || !/^https:\/\//i.test(value.trim())) return null;
  try {
    const parsed = new URL(value.trim());
    return allowedHosts.has(parsed.hostname.toLowerCase()) ? parsed.toString() : null;
  } catch { return null; }
};

async function fetchRows(config: TableConfig) {
  const rows: Json[] = [];
  const selection = ["id", "slug", ...config.fields.map((field) => field.name)].join(",");
  for (let from = 0; ; from += 500) {
    const { data, error } = await client.from(config.table).select(selection).order("id", { ascending: true }).range(from, from + 499);
    if (error) throw new Error(`${config.table}: ${error.message}`);
    rows.push(...((data ?? []) as Json[]));
    if ((data?.length ?? 0) < 500) break;
  }
  report.scanned_rows[config.table] = rows.length;
  return rows;
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

async function loadSharp() {
  const packageName = "sharp";
  try {
    const module = await import(packageName);
    return (module.default ?? module) as (input: Uint8Array, options?: Json) => any;
  } catch {
    throw new Error("WebP conversion requires Sharp. Run `npm install --save-dev sharp` once, then rerun this command.");
  }
}

async function saveReport() {
  await mkdir(resolve(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2));
}

async function saveLocalCopies(source: string, input: Uint8Array, webp: Uint8Array) {
  if (!localOriginalsDir || !localWebpDir) return {};

  const parsed = new URL(source);
  const hash = createHash("sha256").update(source).digest("hex");
  const sourceExtension = extname(parsed.pathname).toLowerCase() || ".bin";
  const originalPath = resolve(localOriginalsDir, hash.slice(0, 2), `${hash}${sourceExtension}`);
  const webpPath = resolve(localWebpDir, hash.slice(0, 2), `${hash}.webp`);

  await mkdir(resolve(originalPath, ".."), { recursive: true });
  await mkdir(resolve(webpPath, ".."), { recursive: true });
  await writeFile(originalPath, input);
  await writeFile(webpPath, webp);

  return { local_original_path: originalPath, local_webp_path: webpPath };
}

async function mirrorAsset(source: string, sharp: Awaited<ReturnType<typeof loadSharp>>, index: number, total: number): Promise<AssetResult> {
  try {
    const response = await fetch(source, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`download returned HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > maxInputBytes) throw new Error(`source exceeds ${maxInputBytes} bytes`);
    const input = new Uint8Array(await response.arrayBuffer());
    if (!input.byteLength) throw new Error("source is empty");
    if (input.byteLength > maxInputBytes) throw new Error(`source exceeds ${maxInputBytes} bytes`);

    const webp = new Uint8Array(await sharp(input, { failOn: "error", limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer());
    const localCopies = await saveLocalCopies(source, input, webp);
    const hash = createHash("sha256").update(source).digest("hex");
    const objectPath = `webp/${hash.slice(0, 2)}/${hash}.webp`;
    const { error } = await client.storage.from(bucket).upload(objectPath, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
    if (error) throw new Error(`upload failed: ${error.message}`);
    const [folder, prefix, filename] = objectPath.split("/");
    const verification = await client.storage.from(bucket).list(`${folder}/${prefix}`, { search: filename, limit: 1 });
    if (verification.error || !verification.data?.some((item) => item.name === filename)) throw new Error(`verification failed: ${verification.error?.message ?? "object not listed"}`);
    const destination = client.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
    if ((index + 1) % 50 === 0 || index + 1 === total) console.log(`[assets] processed ${index + 1}/${total}`);
    return { source, destination, source_bytes: input.byteLength, webp_bytes: webp.byteLength, status: "mirrored", ...localCopies };
  } catch (error) {
    return { source, status: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const referencesByUrl = new Map<string, Reference[]>();
  for (const config of TABLES) {
    const rows = await fetchRows(config);
    for (const row of rows) {
      for (const field of config.fields) {
        const original = field.array ? (Array.isArray(row[field.name]) ? row[field.name] as string[] : []) : String(row[field.name] ?? "");
        const values = field.array ? original as string[] : [original as string];
        for (const value of values) {
          const source = cleanUrl(value);
          if (!source) continue;
          const refs = referencesByUrl.get(source) ?? [];
          refs.push({ table: config.table, id: String(row.id), slug: String(row.slug ?? row.id), field: field.name, array: Boolean(field.array), original });
          referencesByUrl.set(source, refs);
        }
      }
    }
  }
  const sources = [...referencesByUrl.keys()];
  report.unique_assets = sources.length;
  report.references = [...referencesByUrl.values()].reduce((sum, refs) => sum + refs.length, 0);
  console.log(`[assets] inventory unique=${report.unique_assets} references=${report.references}`);

  if (apply && sources.length) {
    const scheduled = migrateAll ? sources : sources.slice(0, requestedLimit);
    report.scheduled_assets = scheduled.length;
    const sharp = await loadSharp();
    const replacements = new Map<string, string>();

    for (let offset = 0; offset < scheduled.length; offset += checkpointSize) {
      const chunk = scheduled.slice(offset, offset + checkpointSize);
      const results = await mapLimit(chunk, concurrency, (source, index) => mirrorAsset(source, sharp, offset + index, scheduled.length));
      report.assets.push(...results);

      for (const asset of results) {
        report.source_bytes += asset.source_bytes ?? 0;
        report.webp_bytes += asset.webp_bytes ?? 0;
        if (asset.status === "mirrored" && asset.destination) {
          replacements.set(asset.source, asset.destination);
          report.mirrored += 1;
        } else report.failed += 1;
      }

      const chunkSources = new Set(results.filter((asset) => asset.status === "mirrored").map((asset) => asset.source));
      const patches = new Map<string, { table: string; id: string; slug: string; values: Json }>();
      for (const source of chunkSources) {
        const destination = replacements.get(source);
        if (!destination) continue;
        for (const ref of referencesByUrl.get(source) ?? []) {
          const key = `${ref.table}:${ref.id}`;
          const patch = patches.get(key) ?? { table: ref.table, id: ref.id, slug: ref.slug, values: {} };
          if (ref.array) {
            const current = (patch.values[ref.field] ?? ref.original) as string[];
            patch.values[ref.field] = current.map((value) => replacements.get(value) ?? value);
          } else patch.values[ref.field] = destination;
          patches.set(key, patch);
        }
      }

      await mapLimit([...patches.values()], updateConcurrency, async (patch) => {
        const { error } = await client.from(patch.table).update(patch.values).eq("id", patch.id);
        if (error) report.update_failures.push({ table: patch.table, slug: patch.slug, message: error.message });
        else report.rows_updated += 1;
      });

      await saveReport();
      console.log(`[assets] checkpoint ${Math.min(offset + chunk.length, scheduled.length)}/${scheduled.length} mirrored=${report.mirrored} failed=${report.failed} rows_updated=${report.rows_updated}`);
    }
  }

  await saveReport();
  console.log(`[assets] report=${reportPath}`);
  console.log(JSON.stringify({ mode: report.mode, scanned_rows: report.scanned_rows, unique_assets: report.unique_assets, scheduled_assets: report.scheduled_assets, references: report.references, mirrored: report.mirrored, failed: report.failed, rows_updated: report.rows_updated, source_bytes: report.source_bytes, webp_bytes: report.webp_bytes }, null, 2));
}

await main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  try { await mkdir(resolve(reportPath, ".."), { recursive: true }); await writeFile(reportPath, JSON.stringify({ ...report, fatal_error: message }, null, 2)); } catch { /* preserve the original error */ }
  console.error(`[assets] failed: ${message}`);
  process.exitCode = 1;
});
