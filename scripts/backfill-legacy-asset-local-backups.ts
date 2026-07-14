/**
 * Backfill local image backups on a Mac after the database has already been
 * migrated to Supabase-hosted WebP URLs.
 *
 * It creates two local folders:
 *   - originals/: downloads legacy AWS/CloudFront source images discovered
 *     from old backup folders on disk
 *   - webp/: downloads current Supabase-hosted WebP images discovered from the
 *     live database image fields
 *
 * Example:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   npm run backup:legacy-assets -- \
 *     --project-ref <ref> \
 *     --output-root "/Users/sunandgarg/Desktop/dekhocampus-image-backup" \
 *     --source-root "/path/to/JSON-Structure" \
 *     --source-root "/path/to/CSV Excel Database"
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type Json = Record<string, unknown>;
type FieldConfig = { name: string; array?: boolean };
type TableConfig = { table: string; fields: FieldConfig[] };
type DownloadStatus = "downloaded" | "skipped" | "failed";
type DownloadResult = { url: string; local_path?: string; bytes?: number; status: DownloadStatus; message?: string };

const TABLES: TableConfig[] = [
  { table: "colleges", fields: [
    { name: "image" }, { name: "logo" }, { name: "banner_ad_image" }, { name: "square_ad_image" },
    { name: "carousel_images", array: true }, { name: "gallery_images", array: true },
  ] },
  { table: "courses", fields: [{ name: "image" }] },
  { table: "exams", fields: [{ name: "image" }, { name: "logo" }] },
  { table: "articles", fields: [{ name: "featured_image" }] },
];

const LEGACY_HOSTS = new Set([
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

const projectRef = option("--project-ref");
const outputRoot = resolve(option("--output-root", "/Users/sunandgarg/Desktop/dekhocampus-image-backup")!);
const originalsDir = resolve(outputRoot, "originals");
const webpDir = resolve(outputRoot, "webp");
const reportPath = resolve(option("--report", "reports/legacy-asset-local-backup-report.json")!);
const concurrency = Math.max(1, Math.min(32, Number(option("--concurrency", "8")) || 8));
const maxBytes = Math.max(1_000_000, Number(option("--max-bytes", "26214400")) || 26_214_400);
const sourceRoots = options("--source-root");
const mode = option("--mode", "both") as "both" | "originals" | "webp";
const includeReports = has("--include-reports");

if (!projectRef) throw new Error("Pass --project-ref to make the destination explicit.");
if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL is required.");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
if (/^sb_publishable_/i.test(process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error("A publishable key cannot read the required inventory.");
if ((mode === "both" || mode === "originals") && sourceRoots.length === 0 && !includeReports) {
  throw new Error("Pass at least one --source-root for originals, or use --include-reports.");
}

const destinationRef = new URL(process.env.SUPABASE_URL).hostname.split(".")[0];
if (destinationRef !== projectRef) throw new Error(`Destination mismatch: URL points to ${destinationRef}, --project-ref is ${projectRef}.`);

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const report = {
  generated_at: new Date().toISOString(),
  mode,
  output_root: outputRoot,
  project_ref: projectRef,
  source_roots: sourceRoots,
  originals: { discovered: 0, downloaded: 0, skipped: 0, failed: 0, bytes: 0, samples: [] as DownloadResult[] },
  webp: { discovered: 0, downloaded: 0, skipped: 0, failed: 0, bytes: 0, samples: [] as DownloadResult[] },
};

const urlRegex = /https:\/\/[^\s"'`)<>\]}]+/g;

function normalizeUrl(value: string) {
  try {
    return new URL(value.trim()).toString();
  } catch {
    return null;
  }
}

function isLegacyUrl(value: string) {
  try {
    return LEGACY_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isSupabaseWebpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname === `${projectRef}.supabase.co`
      && url.pathname.includes("/storage/v1/object/public/legacy-public-assets/webp/")
      && url.pathname.endsWith(".webp");
  } catch {
    return false;
  }
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function recursively(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await recursively(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

async function collectLegacyOriginalUrls() {
  const urls = new Set<string>();

  for (const root of sourceRoots) {
    const files = await recursively(root);
    for (const file of files) {
      const raw = await readFile(file, "utf8").catch(() => "");
      if (!raw) continue;
      for (const match of raw.match(urlRegex) ?? []) {
        const normalized = normalizeUrl(match);
        if (normalized && isLegacyUrl(normalized)) urls.add(normalized);
      }
    }
  }

  if (includeReports) {
    const reportFiles = await recursively(resolve(process.cwd(), "reports"));
    for (const file of reportFiles.filter((item) => basename(item).startsWith("legacy-asset-migration") && item.endsWith(".json"))) {
      const raw = await readFile(file, "utf8").catch(() => "");
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { assets?: Array<{ source?: string }> };
        for (const asset of parsed.assets ?? []) {
          const normalized = asset.source ? normalizeUrl(asset.source) : null;
          if (normalized && isLegacyUrl(normalized)) urls.add(normalized);
        }
      } catch {
        // Ignore malformed report snapshots.
      }
    }
  }

  return [...urls];
}

async function fetchRows(config: TableConfig) {
  const rows: Json[] = [];
  const selection = ["id", ...config.fields.map((field) => field.name)].join(",");
  for (let from = 0; ; from += 500) {
    const { data, error } = await client.from(config.table).select(selection).order("id", { ascending: true }).range(from, from + 499);
    if (error) throw new Error(`${config.table}: ${error.message}`);
    rows.push(...((data ?? []) as Json[]));
    if ((data?.length ?? 0) < 500) break;
  }
  return rows;
}

async function collectSupabaseWebpUrls() {
  const urls = new Set<string>();
  for (const config of TABLES) {
    const rows = await fetchRows(config);
    for (const row of rows) {
      for (const field of config.fields) {
        const rawValues = field.array
          ? (Array.isArray(row[field.name]) ? row[field.name] as string[] : [])
          : [String(row[field.name] ?? "")];
        for (const raw of rawValues) {
          const normalized = normalizeUrl(String(raw));
          if (normalized && isSupabaseWebpUrl(normalized)) urls.add(normalized);
        }
      }
    }
  }
  return [...urls];
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

function localOriginalPathFor(url: string) {
  const parsed = new URL(url);
  const hash = createHash("sha256").update(url).digest("hex");
  const extension = extname(parsed.pathname).toLowerCase() || ".bin";
  return resolve(originalsDir, hash.slice(0, 2), `${hash}${extension}`);
}

function localWebpPathFor(url: string) {
  const parsed = new URL(url);
  const file = basename(parsed.pathname);
  const shard = file.slice(0, 2) || "00";
  return resolve(webpDir, shard, file);
}

async function download(url: string, localPath: string): Promise<DownloadResult> {
  if (await exists(localPath)) return { url, local_path: localPath, status: "skipped" };

  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`download returned HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > maxBytes) throw new Error(`source exceeds ${maxBytes} bytes`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength) throw new Error("source is empty");
    if (bytes.byteLength > maxBytes) throw new Error(`source exceeds ${maxBytes} bytes`);
    await mkdir(resolve(localPath, ".."), { recursive: true });
    await writeFile(localPath, bytes);
    return { url, local_path: localPath, bytes: bytes.byteLength, status: "downloaded" };
  } catch (error) {
    return { url, local_path: localPath, status: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

async function saveReport() {
  await mkdir(resolve(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2));
}

async function runGroup(kind: "originals" | "webp", urls: string[]) {
  const targetDir = kind === "originals" ? originalsDir : webpDir;
  await mkdir(targetDir, { recursive: true });
  if (kind === "originals") report.originals.discovered = urls.length;
  else report.webp.discovered = urls.length;

  const results = await mapLimit(urls, concurrency, async (url, index) => {
    const localPath = kind === "originals" ? localOriginalPathFor(url) : localWebpPathFor(url);
    const result = await download(url, localPath);
    if ((index + 1) % 100 === 0 || index + 1 === urls.length) {
      console.log(`[backup:${kind}] processed ${index + 1}/${urls.length}`);
    }
    return result;
  });

  const stats = kind === "originals" ? report.originals : report.webp;
  for (const result of results) {
    stats.bytes += result.bytes ?? 0;
    if (result.status === "downloaded") stats.downloaded += 1;
    else if (result.status === "skipped") stats.skipped += 1;
    else stats.failed += 1;
  }
  stats.samples = results.filter((item) => item.status !== "skipped").slice(0, 20);
}

async function main() {
  const originals = mode === "webp" ? [] : await collectLegacyOriginalUrls();
  const webps = mode === "originals" ? [] : await collectSupabaseWebpUrls();

  console.log(`[backup] originals discovered=${originals.length}`);
  console.log(`[backup] webp discovered=${webps.length}`);

  if (originals.length) {
    await runGroup("originals", originals);
    await saveReport();
  }

  if (webps.length) {
    await runGroup("webp", webps);
    await saveReport();
  }

  await saveReport();
  console.log(`[backup] report=${reportPath}`);
  console.log(JSON.stringify(report, null, 2));
}

await main();
