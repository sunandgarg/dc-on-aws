/**
 * SEO sub-slug builders & parsers for tool pages.
 * Every meaningful filter combination becomes a crawlable, shareable URL.
 *
 *   /eligibility-checker/:slug      e.g. obc-jee-above-85
 *   /college-predictor/:slug        e.g. jee-main-rank-under-10000-cse-delhi
 *
 * Keep these pure (no DB) so they're cheap to call client + sitemap-side.
 */

export type EligibilitySlugState = {
  stream?: string;          // "Engineering" | "Medical" | ...
  category?: string;        // "General" | "OBC" | "SC" | "ST" | "EWS" | "PwD"
  exam?: string;            // "JEE" | "NEET" | "CAT" | "CLAT" | "CUET"
  percentBucket?: string;   // "above-90" | "80-90" | "70-80" | "60-70" | "below-60"
  state?: string;           // city/state slug
};

export type PredictorSlugState = {
  exam?: string;            // "jee-main" | "neet" | "cat"
  rankBucket?: string;      // "under-1000" | "under-10000" | "under-50000" | "above-50000"
  branch?: string;          // "cse" | "ece" | "mech"
  category?: string;
  state?: string;
};

const STREAM_SLUG: Record<string, string> = {
  engineering: "Engineering",
  medical: "Medical",
  management: "Management",
  arts: "Arts",
  commerce: "Commerce",
  law: "Law",
  design: "Design",
};
const STREAMS = Object.keys(STREAM_SLUG);

const CATEGORY_SLUG: Record<string, string> = {
  general: "General",
  obc: "OBC-NCL",
  "obc-ncl": "OBC-NCL",
  sc: "SC",
  st: "ST",
  ews: "EWS",
  pwd: "PwD",
};

const EXAMS = ["jee-advanced", "jee-main", "jee", "neet", "cat", "cuet", "clat", "ailet", "bitsat", "viteee", "ipmat", "nift", "nid"];

const PERCENT_BUCKETS = ["above-90", "80-90", "70-80", "60-70", "below-60"];

const RANK_BUCKETS = ["under-100", "under-1000", "under-5000", "under-10000", "under-25000", "under-50000", "under-100000", "above-100000"];

const BRANCHES = ["cse", "it", "ece", "ee", "mech", "civil", "chem", "aero", "bio", "ai-ml", "data-science"];

const CITIES = ["delhi", "mumbai", "bangalore", "pune", "hyderabad", "chennai", "kolkata", "noida", "gurgaon", "jaipur", "lucknow"];

function tokens(slug: string): string[] {
  return (slug || "").toLowerCase().split("-").filter(Boolean);
}

function bucketForPercent(p: number): string {
  if (p >= 90) return "above-90";
  if (p >= 80) return "80-90";
  if (p >= 70) return "70-80";
  if (p >= 60) return "60-70";
  return "below-60";
}

function bucketForRank(r: number): string {
  if (r <= 100) return "under-100";
  if (r <= 1000) return "under-1000";
  if (r <= 5000) return "under-5000";
  if (r <= 10000) return "under-10000";
  if (r <= 25000) return "under-25000";
  if (r <= 50000) return "under-50000";
  if (r <= 100000) return "under-100000";
  return "above-100000";
}

// ---------- Eligibility ----------

export function buildEligibilitySlug(s: { stream?: string; category?: string; exam?: string; percent?: number; state?: string }): string {
  const parts: string[] = [];
  if (s.category) {
    const k = Object.keys(CATEGORY_SLUG).find((key) => CATEGORY_SLUG[key].toLowerCase() === s.category!.toLowerCase()) || s.category.toLowerCase();
    parts.push(k.replace(/[^a-z0-9]+/g, "-"));
  }
  if (s.exam) parts.push(s.exam.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  if (s.stream && !s.exam) parts.push(s.stream.toLowerCase());
  if (typeof s.percent === "number" && s.percent > 0) parts.push(bucketForPercent(s.percent));
  if (s.state) parts.push("in-" + s.state.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  return parts.join("-");
}

export function parseEligibilitySlug(slug: string): EligibilitySlugState {
  const t = tokens(slug);
  const out: EligibilitySlugState = {};
  for (const tok of t) {
    if (CATEGORY_SLUG[tok]) out.category = CATEGORY_SLUG[tok];
    if (STREAM_SLUG[tok]) out.stream = STREAM_SLUG[tok];
    if (EXAMS.includes(tok)) out.exam = tok.toUpperCase().replace(/-/g, " ");
    if (PERCENT_BUCKETS.includes(tok)) out.percentBucket = tok;
  }
  // multi-token percent buckets like "80-90", "above-90"
  const s = (slug || "").toLowerCase();
  for (const b of PERCENT_BUCKETS) if (s.includes(b)) out.percentBucket = b;
  // state: "in-delhi" / "in-mumbai"
  const m = s.match(/in-([a-z0-9-]+)$/);
  if (m) out.state = m[1].replace(/-/g, " ");
  return out;
}

// ---------- Predictor ----------

export function buildPredictorSlug(s: { exam?: string; rank?: number; branch?: string; category?: string; state?: string }): string {
  const parts: string[] = [];
  if (s.exam) parts.push(s.exam.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  if (typeof s.rank === "number" && s.rank > 0) parts.push("rank", bucketForRank(s.rank));
  if (s.branch) parts.push(s.branch.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  if (s.category) {
    const k = Object.keys(CATEGORY_SLUG).find((key) => CATEGORY_SLUG[key].toLowerCase() === s.category!.toLowerCase()) || s.category.toLowerCase();
    parts.push(k.replace(/[^a-z0-9]+/g, "-"));
  }
  if (s.state) parts.push("in-" + s.state.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  return parts.join("-");
}

export function parsePredictorSlug(slug: string): PredictorSlugState {
  const t = tokens(slug);
  const out: PredictorSlugState = {};
  const s = (slug || "").toLowerCase();

  for (const e of EXAMS) if (s.startsWith(e)) { out.exam = e; break; }
  for (const b of RANK_BUCKETS) if (s.includes(b)) { out.rankBucket = b; break; }
  for (const br of BRANCHES) if (t.includes(br)) { out.branch = br; break; }
  for (const tok of t) if (CATEGORY_SLUG[tok]) { out.category = CATEGORY_SLUG[tok]; break; }
  const m = s.match(/in-([a-z0-9-]+)$/);
  if (m) out.state = m[1].replace(/-/g, " ");
  return out;
}

// ---------- Sitemap matrix ----------

/** Returns every reasonable eligibility-checker sub-slug for the sitemap. */
export function eligibilityComboSlugs(): string[] {
  const out: string[] = [];
  const cats = ["general", "obc", "sc", "st", "ews"];
  const ex = ["jee", "neet", "cat", "cuet", "clat"];
  const pb = PERCENT_BUCKETS;
  for (const c of cats) for (const e of ex) for (const p of pb) out.push(`${c}-${e}-${p}`);
  for (const c of cats) for (const s of STREAMS) out.push(`${c}-${s}`);
  for (const e of ex) for (const p of pb) out.push(`${e}-${p}`);
  return Array.from(new Set(out));
}

/** Returns every reasonable college-predictor sub-slug for the sitemap. */
export function predictorComboSlugs(): string[] {
  const out: string[] = [];
  const ex = ["jee-main", "jee-advanced", "neet", "cat"];
  for (const e of ex) for (const r of RANK_BUCKETS) out.push(`${e}-rank-${r}`);
  for (const e of ex) for (const r of RANK_BUCKETS) for (const b of BRANCHES.slice(0, 6)) out.push(`${e}-rank-${r}-${b}`);
  for (const e of ex) for (const r of RANK_BUCKETS.slice(0, 4)) for (const city of CITIES) out.push(`${e}-rank-${r}-in-${city}`);
  return Array.from(new Set(out));
}

export const _internals = { STREAMS, EXAMS, PERCENT_BUCKETS, RANK_BUCKETS, BRANCHES, CITIES };
