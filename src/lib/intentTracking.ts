/**
 * Intent-Based Lead Intelligence - client SDK
 *
 * Captures every behavioral signal (views, CTAs, tool usage) and writes
 * them to `public.intent_events`. The DB trigger handles scoring, category
 * transitions and partner webhook alerts in real time.
 *
 * Anonymous visitors get a stable UUID in localStorage; on sign-in we call
 * the `intent_merge_visitor` RPC to roll their history into the user record.
 */
import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY  = "dc_intent_visitor_v1";
const SESSION_KEY  = "dc_session_id";
const CONSENT_KEY  = "dc_cookie_consent_v1";

// ------------------------------------------------------------------
// Event taxonomy (mirrors intent_event_weights.event_type)
// ------------------------------------------------------------------
export type IntentEventType =
  | "college_viewed" | "course_viewed" | "exam_viewed" | "scholarship_viewed"
  | "fee_viewed" | "placement_viewed" | "admission_process_viewed"
  | "cutoff_viewed" | "ranking_viewed" | "hostel_viewed"
  | "compare_colleges" | "save_college"
  | "download_brochure" | "apply_now" | "call_institute" | "whatsapp_institute"
  | "counselling_request"
  | "exam_predictor" | "rank_predictor" | "career_tool"
  | "video_watched" | "review_read" | "review_submitted"
  | "search_query";

export interface IntentProps {
  college_slug?: string | null;
  course_slug?: string | null;
  exam_slug?: string | null;
  university_slug?: string | null;
  metadata?: Record<string, any>;
}

// ------------------------------------------------------------------
// Consent + visitor id
// ------------------------------------------------------------------
function tracking_allowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = localStorage.getItem(CONSENT_KEY);
    return c !== "rejected"; // allow undecided + accepted (matches existing UserTracking)
  } catch { return true; }
}

function ensureUuid(): string {
  const u = (crypto as any)?.randomUUID?.();
  if (u) return u;
  // RFC4122-ish fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = ensureUuid();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return ensureUuid();
  }
}

function getSessionId(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

// ------------------------------------------------------------------
// Attribution helpers
// ------------------------------------------------------------------
function getDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function getUtm() {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  return {
    utm_source:   sp.get("utm_source"),
    utm_medium:   sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    utm_content:  sp.get("utm_content"),
    utm_term:     sp.get("utm_term"),
  };
}

function getTrafficSource(): string {
  if (typeof document === "undefined") return "direct";
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const u = new URL(ref);
    if (u.host === location.host) return "internal";
    if (/google|bing|duckduckgo|yahoo/.test(u.host)) return "organic";
    if (/facebook|instagram|twitter|linkedin|t\.co|youtube/.test(u.host)) return "social";
    return "referral";
  } catch { return "direct"; }
}

// ------------------------------------------------------------------
// Queue + flush (batched, non-blocking)
// ------------------------------------------------------------------
let queue: any[] = [];
let flushTimer: any = null;

async function flush() {
  flushTimer = null;
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try { await (supabase as any).from("intent_events").insert(batch); }
  catch (_) { /* swallow - never block UI */ }
}

let currentUserId: string | null = null;
export function setIntentUserId(uid: string | null) { currentUserId = uid; }

/** Fire-and-forget intent capture. Safe to call from anywhere. */
export function trackIntent(event_type: IntentEventType, props: IntentProps = {}) {
  if (typeof window === "undefined") return;
  if (!tracking_allowed()) return;

  const utm = getUtm();
  const row: any = {
    event_type,
    visitor_id:      getVisitorId(),
    user_id:         currentUserId,
    session_id:      getSessionId(),
    college_slug:    props.college_slug ?? null,
    course_slug:     props.course_slug ?? null,
    exam_slug:       props.exam_slug ?? null,
    university_slug: props.university_slug ?? null,
    device_type:     getDevice(),
    traffic_source:  getTrafficSource(),
    utm_source:      utm.utm_source ?? null,
    utm_medium:      utm.utm_medium ?? null,
    utm_campaign:    utm.utm_campaign ?? null,
    utm_content:     utm.utm_content ?? null,
    utm_term:        utm.utm_term ?? null,
    page_url:        location.pathname + location.search,
    referrer:        document.referrer || null,
    metadata:        props.metadata ?? {},
  };
  queue.push(row);
  if (!flushTimer) flushTimer = setTimeout(flush, 800);
}

// ------------------------------------------------------------------
// Auto-track page views (called by IntentProvider on route change)
// ------------------------------------------------------------------
const VIEW_RULES: { test: RegExp; type: IntentEventType; slugFrom: "college"|"course"|"exam"|"scholarship" }[] = [
  { test: /^\/colleges?\/([^\/]+)/i,   type: "college_viewed",     slugFrom: "college" },
  { test: /^\/courses?\/([^\/]+)/i,    type: "course_viewed",      slugFrom: "course" },
  { test: /^\/exams?\/([^\/]+)/i,      type: "exam_viewed",        slugFrom: "exam" },
  { test: /^\/scholarships?\/([^\/]+)/i, type: "scholarship_viewed", slugFrom: "scholarship" },
];

export function autoTrackRoute(pathname: string) {
  for (const r of VIEW_RULES) {
    const m = pathname.match(r.test);
    if (m && m[1]) {
      const props: IntentProps = {};
      if (r.slugFrom === "college") props.college_slug = m[1];
      if (r.slugFrom === "course")  props.course_slug  = m[1];
      if (r.slugFrom === "exam")    props.exam_slug    = m[1];
      trackIntent(r.type, props);
      return;
    }
  }
}

// ------------------------------------------------------------------
// Anonymous → user merge (call on sign-in)
// ------------------------------------------------------------------
export async function mergeVisitorIntoUser(userId: string) {
  const visitor = getVisitorId();
  if (!visitor || !userId) return;
  try {
    await (supabase as any).rpc("intent_merge_visitor", {
      _visitor_id: visitor,
      _user_id:    userId,
    });
  } catch { /* ignore */ }
}

// ------------------------------------------------------------------
// Bridge legacy trackEvent("cta_click", { cta, ... }) into intent_events
// ------------------------------------------------------------------
const CTA_MAP: Record<string, IntentEventType> = {
  "apply now":              "apply_now",
  "find best colleges":     "apply_now",
  "talk to counselor":      "counselling_request",
  "request counselling":    "counselling_request",
  "download brochure":      "download_brochure",
  "download syllabus":      "download_brochure",
  "call":                   "call_institute",
  "call now":               "call_institute",
  "whatsapp":               "whatsapp_institute",
  "save":                   "save_college",
  "save college":           "save_college",
  "compare":                "compare_colleges",
  "predict colleges":       "rank_predictor",
  "check eligibility":      "exam_predictor",
};

export function maybeTrackCtaAsIntent(params: Record<string, any>) {
  if (!params || typeof params !== "object") return;
  const cta = String(params.cta || "").trim().toLowerCase();
  const type = CTA_MAP[cta];
  if (!type) return;
  trackIntent(type, {
    college_slug: params.college_slug || null,
    course_slug:  params.course_slug  || null,
    exam_slug:    params.exam_slug    || null,
    metadata:     { source_cta: params.cta, page: params.page },
  });
}
