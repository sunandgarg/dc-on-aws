/**
 * Postbuild sitemap generator.
 * Runs after `vite build` (see package.json `postbuild` hook) and writes
 * `dist/sitemap.xml` with one entry per public route + every published row in
 * colleges, courses, exams, careers, scholarships, articles, landing pages,
 * tools and study material.
 *
 * Falls back gracefully (still emits the static-route sitemap) if Supabase
 * env vars are unavailable at build time.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { eligibilityComboSlugs, predictorComboSlugs } from "../src/lib/seoSubSlugs";
import { SITE_URL } from "../src/lib/constant";

const BASE_URL = process.env.SITEMAP_BASE_URL || SITE_URL;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static, public-facing routes from src/App.tsx (admin / dashboard / auth omitted).
const STATIC: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/colleges", changefreq: "daily", priority: "0.9" },
  { path: "/courses", changefreq: "daily", priority: "0.9" },
  { path: "/exams", changefreq: "daily", priority: "0.9" },
  { path: "/careers", changefreq: "weekly", priority: "0.8" },
  { path: "/scholarships", changefreq: "weekly", priority: "0.8" },
  { path: "/articles", changefreq: "daily", priority: "0.8" },
  { path: "/news", changefreq: "daily", priority: "0.8" },
  { path: "/study-material", changefreq: "weekly", priority: "0.7" },
  { path: "/resources", changefreq: "weekly", priority: "0.7" },
  { path: "/tools", changefreq: "weekly", priority: "0.6" },
  { path: "/cat-universe", changefreq: "daily", priority: "0.8" },
  { path: "/compare", changefreq: "weekly", priority: "0.5" },
  { path: "/eligibility-checker", changefreq: "weekly", priority: "0.7" },
  { path: "/college-predictor", changefreq: "weekly", priority: "0.7" },
  { path: "/exam-calendar", changefreq: "weekly", priority: "0.7" },
  { path: "/exam-calendar-2026", changefreq: "weekly", priority: "0.7" },
  { path: "/about-us", changefreq: "monthly", priority: "0.4" },
];

// SEO sub-slug combos for tool pages — generates thousands of indexable URLs.
function toolComboEntries(): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (const s of eligibilityComboSlugs()) {
    out.push({ path: `/eligibility-checker/${s}`, changefreq: "weekly", priority: "0.55" });
  }
  for (const s of predictorComboSlugs()) {
    out.push({ path: `/college-predictor/${s}`, changefreq: "weekly", priority: "0.55" });
  }
  return out;
}

async function fetchSlugs(table: string, extraFilter?: (q: any) => any): Promise<{ slug: string; updated_at?: string }[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  let q = sb.from(table).select("slug, updated_at").not("slug", "is", null);
  if (extraFilter) q = extraFilter(q);
  const { data, error } = await q.limit(50000);
  if (error) {
    console.warn(`[sitemap] ${table}: ${error.message}`);
    return [];
  }
  return (data ?? []).filter((r) => r.slug);
}

async function fetchRows(table: string, select: string, extraFilter?: (q: any) => any): Promise<any[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  let q = sb.from(table).select(select);
  if (extraFilter) q = extraFilter(q);
  const { data, error } = await q.limit(50000);
  if (error) {
    console.warn(`[sitemap] ${table}: ${error.message}`);
    return [];
  }
  return data ?? [];
}

function entriesFor(prefix: string, rows: { slug: string; updated_at?: string }[], priority = "0.7"): SitemapEntry[] {
  return rows.map((r) => ({
    path: `${prefix}/${r.slug}`,
    lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : undefined,
    changefreq: "weekly",
    priority,
  }));
}

async function studyEntries(): Promise<SitemapEntry[]> {
  const subjects = await fetchRows(
    "study_subjects",
    "id, slug, class_num, board_slug, updated_at",
    (q) => q.eq("is_active", true).not("slug", "is", null),
  );
  const chapters = await fetchRows(
    "study_chapters",
    "slug, subject_id, updated_at",
    (q) => q.eq("is_active", true).not("slug", "is", null),
  );
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const classBoardEntries = new Map<string, SitemapEntry>();
  for (const s of subjects) {
    classBoardEntries.set(`${s.class_num}/${s.board_slug}`, {
      path: `/study-material/class-${s.class_num}/${s.board_slug}`,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly",
      priority: "0.6",
    });
  }
  return [
    ...classBoardEntries.values(),
    ...subjects.map((s) => ({
      path: `/study-material/class-${s.class_num}/${s.board_slug}/${s.slug}`,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly" as const,
      priority: "0.55",
    })),
    ...chapters.flatMap((ch) => {
      const s = subjectById.get(ch.subject_id);
      if (!s) return [];
      return [{
        path: `/study-material/class-${s.class_num}/${s.board_slug}/${s.slug}/${ch.slug}`,
        lastmod: ch.updated_at ? new Date(ch.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly" as const,
        priority: "0.5",
      }];
    }),
  ];
}

function xmlFor(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const [colleges, courses, exams, careers, scholarships, articles, landing, catUniverseModules, study] = await Promise.all([
    fetchSlugs("colleges", (q) => q.eq("is_active", true)),
    fetchSlugs("courses", (q) => q.eq("is_active", true)),
    fetchSlugs("exams", (q) => q.eq("is_active", true)),
    fetchSlugs("career_profiles", (q) => q.eq("is_active", true)),
    fetchSlugs("scholarships", (q) => q.eq("is_active", true)),
    fetchSlugs("articles", (q) => q.eq("is_active", true)),
    fetchSlugs("landing_pages", (q) => q.eq("is_active", true)),
    fetchSlugs("cat_universe_modules", (q) => q.eq("is_active", true)),
    studyEntries(),
  ]);

  const all: SitemapEntry[] = [
    ...STATIC,
    ...entriesFor("/colleges", colleges, "0.85"),
    ...entriesFor("/courses", courses, "0.85"),
    ...entriesFor("/exams", exams, "0.85"),
    ...entriesFor("/careers", careers, "0.7"),
    ...entriesFor("/scholarships", scholarships, "0.7"),
    ...entriesFor("/articles", articles, "0.6"),
    ...entriesFor("/landing", landing, "0.6"),
    ...entriesFor("/cat-universe", catUniverseModules, "0.75"),
    ...study,
    ...toolComboEntries(),
  ];

  // Dedupe by path
  const seen = new Set<string>();
  const unique = all.filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)));

  writeFileSync(resolve("dist/sitemap.xml"), xmlFor(unique));
  console.log(`sitemap.xml written — ${unique.length} entries`);
})().catch((e) => {
  console.warn("[sitemap] fatal:", e?.message || e);
  // Still emit the static sitemap so the build doesn't fail.
  writeFileSync(resolve("dist/sitemap.xml"), xmlFor(STATIC));
});
