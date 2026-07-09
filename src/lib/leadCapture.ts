/**
 * Centralized silent lead-capture utilities.
 *
 * Psychology / UX 2026 principle: once a user has identified themselves
 * (form submit OR prefill cookie OR logged-in), we never ask again for a
 * configurable cooldown window. Every subsequent intent (brochure download,
 * "Apply to UPES", "Apply to DBS"…) is captured **silently** as its own
 * lead row tagged with `interested_college_slug` / `interested_course_slug`
 * / `interested_exam_slug` so the same person becomes a re-usable, multi-
 * intent record in admin instead of a popup-fatigued bounce.
 */
import { getPrefillCookie, savePrefillCookie } from "@/components/CookieConsent";
import { normalizeIndianMobile } from "@/lib/phone";

const LAST_LEAD_TS_KEY = "dc_last_lead_ts_v1";
export const LEAD_SILENT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const LEAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-lead`;

export function markLeadSubmitted(ts: number = Date.now()) {
  try { localStorage.setItem(LAST_LEAD_TS_KEY, String(ts)); } catch { /* noop */ }
}

export function getLastLeadTs(): number {
  try {
    const v = parseInt(localStorage.getItem(LAST_LEAD_TS_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

export function isWithinSilentWindow(windowMs: number = LEAD_SILENT_WINDOW_MS) {
  const ts = getLastLeadTs();
  return ts > 0 && Date.now() - ts < windowMs;
}

export function hasPrefillIdentity(): boolean {
  const c = getPrefillCookie();
  const phone = normalizeIndianMobile(c.phone || "");
  return !!c.name && phone.length === 10;
}

export interface SilentLeadPayload {
  source: string;                 // e.g. "brochure_download", "apply_button"
  cta?: string;                   // e.g. "Download Brochure"
  interested_college_slug?: string | null;
  interested_course_slug?: string | null;
  interested_exam_slug?: string | null;
  initial_query?: string | null;
  page_url?: string | null;
  // Optional explicit identity (overrides prefill cookie if provided)
  name?: string;
  email?: string | null;
  phone?: string;
  city?: string | null;
  state?: string | null;
}

/**
 * Save a lead without ever showing UI. Uses the identity in `payload`
 * if provided, otherwise the prefill cookie. Returns true if a request
 * was sent (regardless of network outcome - we never want UX to block).
 */
export async function silentSaveLead(payload: SilentLeadPayload): Promise<boolean> {
  const c = getPrefillCookie();
  const name = payload.name ?? c.name;
  const phone = normalizeIndianMobile(payload.phone ?? c.phone ?? "");
  if (!name || phone.length !== 10) return false;

  const body = {
    name,
    email: payload.email ?? c.email ?? null,
    phone,
    city: payload.city ?? c.city ?? null,
    state: payload.state ?? c.state ?? null,
    current_situation: null,
    initial_query: payload.initial_query ?? null,
    source: payload.source,
    cta: payload.cta ?? payload.source,
    page_url: payload.page_url ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : null),
    interested_college_slug: payload.interested_college_slug ?? null,
    interested_course_slug: payload.interested_course_slug ?? null,
    interested_exam_slug: payload.interested_exam_slug ?? null,
    silent_capture: true,
  };

  // Refresh prefill cookie so subsequent calls keep working
  savePrefillCookie({ name, email: body.email ?? undefined, phone, city: body.city ?? undefined, state: body.state ?? undefined });
  markLeadSubmitted();

  try {
    // Fire-and-forget; do NOT await UX-blocking
    fetch(LEAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {/* ignore */});
  } catch { /* ignore */ }

  return true;
}
