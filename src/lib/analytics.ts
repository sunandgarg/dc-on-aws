/**
 * Lightweight analytics helper that fans events out to GA4 (gtag),
 * GTM (dataLayer) and Meta Pixel (fbq) when those are loaded by
 * <SiteIntegrations /> or <LpComplianceHeader />. All calls are no-ops
 * when the corresponding tracker isn't present, so it's safe to call
 * from anywhere.
 *
 * Standard events used by the LP funnel:
 *   - lp_view              (auto on LP mount)
 *   - lp_otp_sent          { lp_type, lp_slug, source, ...utm }
 *   - lp_otp_verified      { lp_type, lp_slug, source, ...utm }
 *   - lp_unlock_success    { lp_type, lp_slug, source, gate, ...utm }
 *   - lp_lead_submit       { lp_type, lp_slug, source, ...utm }
 */

export type LpEventName =
  | "lp_view"
  | "lp_otp_sent"
  | "lp_otp_verified"
  | "lp_unlock_success"
  | "lp_lead_submit"
  | "chunk_load_error"
  | "chunk_load_recovered";

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

export function getUtmParams(): AnalyticsParams {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const out: AnalyticsParams = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"].forEach((k) => {
    const v = sp.get(k);
    if (v) out[k] = v;
  });
  return out;
}

export function trackEvent(name: LpEventName | string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;
  const payload = { ...getUtmParams(), ...params, event_time: Date.now() };
  try {
    (window as any).gtag?.("event", name, payload);
  } catch {/* noop */}
  try {
    (window as any).fbq?.("trackCustom", name, payload);
  } catch {/* noop */}
  try {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({ event: name, ...payload });
  } catch {/* noop */}
  // Bridge CTA clicks into the intent-based scoring engine (zero-touch coverage).
  try {
    if (name === "cta_click") {
      import("@/lib/intentTracking").then(({ maybeTrackCtaAsIntent }) => maybeTrackCtaAsIntent(params as any)).catch(() => {});
    }
  } catch {/* noop */}
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, payload);
  }

  // Persist lead-popup funnel events to Supabase so admins can analyze them.
  try {
    if (typeof name === "string" && name.startsWith("lp_popup_")) {
      // Lazy import to keep this module free of supabase coupling at top.
      import("@/integrations/supabase/client").then(({ supabase }) => {
        let sid = "anon";
        try { sid = localStorage.getItem("dc_session_id") || "anon"; } catch {}
        (supabase as any).from("user_events").insert({
          session_id: sid,
          event_type: name,
          path: typeof location !== "undefined" ? location.pathname : null,
          metadata: payload,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }).then(() => {}, () => {});
      }).catch(() => {});
    }
    // Persist CTA click events (Apply/Talk/Brochure/etc) for the admin conversion dashboard.
    if (name === "cta_click") {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        let sid = "anon";
        try {
          sid = localStorage.getItem("dc_session_id") || "";
          if (!sid) {
            sid = (crypto as any)?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem("dc_session_id", sid);
          }
        } catch {}
        const p = params as any;
        (supabase as any).from("cta_events").insert({
          page: String(p.page || "unknown"),
          cta: String(p.cta || "unknown"),
          entity_slug: p.college_slug || p.course_slug || p.exam_slug || p.program_slug || p.slug || null,
          entity_name: p.entity_name || null,
          session_id: sid,
          path: typeof location !== "undefined" ? location.pathname : null,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
          utm_source: (payload as any).utm_source || null,
          utm_medium: (payload as any).utm_medium || null,
          utm_campaign: (payload as any).utm_campaign || null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          meta: payload,
        }).then(() => {}, () => {});
      }).catch(() => {});
    }
  } catch {/* noop */}
}

/** Lead/Conversion shortcut - also fires the standard generate_lead/Lead events. */
export function trackLeadConversion(params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;
  try { (window as any).gtag?.("event", "generate_lead", { value: 1, currency: "INR", ...params }); } catch {/* noop */}
  try { (window as any).fbq?.("track", "Lead", params); } catch {/* noop */}
  try { (window as any).fireGoogleAdsConversion?.(params); } catch {/* noop */}
  trackEvent("lp_lead_submit", params);
}
