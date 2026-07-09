import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SESSION_KEY = "dc_session_id";
const SESSION_STARTED_KEY = "dc_session_started";
const ENTRY_KEY = "dc_session_entry";
const CONSENT_KEY = "dc_cookie_consent_v1";
const PREFS_KEY = "dc_cookie_prefs_v1";
const PROFILE_KEY = "dc_user_prefill_v1";
const SESSION_TTL_MS = 30 * 60 * 1000;

function analyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) return false; // no decision yet - be safe
    if (consent === "rejected") return false;
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return prefs.analytics !== false;
  } catch { return false; }
}

function getOrCreateSession(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY) || 0);
    const fresh = existing && Date.now() - startedAt < SESSION_TTL_MS;
    if (fresh) {
      localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
      return existing!;
    }
    const sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, sid);
    localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
    localStorage.setItem(ENTRY_KEY, location.pathname);
    return sid;
  } catch { return `s_${Date.now()}`; }
}

function getDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function getUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gclid","fbclid"].forEach((k) => {
    const v = sp.get(k); if (v) out[k] = v;
  });
  return out;
}

function getProfilePrefill(): { name?: string; email?: string; phone?: string } {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

let queue: any[] = [];
let flushTimer: any = null;

function enqueue(event: any) {
  if (!analyticsEnabled()) return;
  queue.push(event);
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 1500);
}

async function flush() {
  flushTimer = null;
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try { await (supabase as any).from("user_events").insert(batch); } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    try {
      if (queue.length && analyticsEnabled()) {
        const blob = new Blob([JSON.stringify(queue)], { type: "application/json" });
        navigator.sendBeacon?.(`https://hpjbwtnvtktezwhafuuf.supabase.co/rest/v1/user_events`, blob);
      }
    } catch {}
  });
}

/** Click stream + session + funnel + heatmap data. Respects cookie consent. */
export function UserTrackingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const sessionIdRef = useRef<string>(getOrCreateSession());
  const pageStartRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>("");
  const maxScrollRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);
  const lastClickRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const rageRef = useRef<number>(0);

  // Page navigation tracking
  useEffect(() => {
    if (!analyticsEnabled()) return;
    const path = location.pathname + location.search;

    if (lastPathRef.current && lastPathRef.current !== path) {
      const dur = Date.now() - pageStartRef.current;
      totalTimeRef.current += dur;
      enqueue({
        session_id: sessionIdRef.current,
        user_id: user?.id ?? null,
        event_type: "page_leave",
        path: lastPathRef.current,
        metadata: { duration_ms: dur, max_scroll_pct: maxScrollRef.current, rage_clicks: rageRef.current },
      });
    }
    lastPathRef.current = path;
    pageStartRef.current = Date.now();
    maxScrollRef.current = 0;
    rageRef.current = 0;

    enqueue({
      session_id: sessionIdRef.current,
      user_id: user?.id ?? null,
      event_type: "page_view",
      path,
      referrer: typeof document !== "undefined" ? document.referrer : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      vw: window.innerWidth, vh: window.innerHeight,
      metadata: { title: document.title },
    });

    const prefill = getProfilePrefill();
    (supabase as any).from("user_sessions").upsert({
      session_id: sessionIdRef.current,
      user_id: user?.id ?? null,
      last_seen_at: new Date().toISOString(),
      last_path: path,
      exit_path: path,
      entry_path: localStorage.getItem(ENTRY_KEY) || path,
      device: getDevice(),
      referrer: document.referrer || null,
      utm: getUtm(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${window.screen?.width}x${window.screen?.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lead_name: prefill.name || null,
      lead_email: prefill.email || null,
      lead_phone: prefill.phone || null,
      total_time_ms: totalTimeRef.current,
      max_scroll_pct: maxScrollRef.current,
      opt_in: (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; } })(),
    }, { onConflict: "session_id" }).then(() => {}, () => {});
  }, [location.pathname, location.search, user?.id]);

  // Clicks (with coords for heatmap), submits, scroll, copy, visibility, rage
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>("[data-track], a, button");
      const trackName = el?.getAttribute("data-track");
      const text = ((el?.innerText) || el?.getAttribute("aria-label") || "").trim().slice(0, 80);
      const href = el?.getAttribute("href");

      // Rage click detection: 3 clicks within 50px in 1s
      const now = Date.now();
      if (lastClickRef.current && now - lastClickRef.current.t < 600 &&
          Math.abs(e.clientX - lastClickRef.current.x) < 50 && Math.abs(e.clientY - lastClickRef.current.y) < 50) {
        rageRef.current += 1;
        if (rageRef.current === 3) {
          enqueue({ session_id: sessionIdRef.current, user_id: user?.id ?? null, event_type: "rage_click",
            path: location.pathname, x: e.clientX, y: e.clientY, vw: window.innerWidth, vh: window.innerHeight,
            metadata: { text } });
        }
      }
      lastClickRef.current = { t: now, x: e.clientX, y: e.clientY };

      enqueue({
        session_id: sessionIdRef.current,
        user_id: user?.id ?? null,
        event_type: trackName ? "tracked_click" : el?.tagName === "A" ? "link_click" : el?.tagName === "BUTTON" ? "button_click" : "click",
        path: location.pathname,
        element: trackName || el?.tagName.toLowerCase(),
        x: e.clientX, y: e.clientY, vw: window.innerWidth, vh: window.innerHeight,
        metadata: { text, href, dead: !el }, // no actionable parent = dead click
      });
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      enqueue({
        session_id: sessionIdRef.current, user_id: user?.id ?? null,
        event_type: "form_submit", path: location.pathname,
        element: form.getAttribute("name") || form.getAttribute("id") || "form",
      });
    };

    const onCopy = () => {
      const sel = window.getSelection()?.toString().slice(0, 200) || "";
      enqueue({ session_id: sessionIdRef.current, user_id: user?.id ?? null,
        event_type: "copy", path: location.pathname, metadata: { text: sel } });
    };

    const onVisibility = () => {
      enqueue({ session_id: sessionIdRef.current, user_id: user?.id ?? null,
        event_type: document.hidden ? "tab_hidden" : "tab_visible", path: location.pathname });
    };

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const h = document.documentElement;
        const pct = Math.round(((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100);
        if (pct > maxScrollRef.current) {
          maxScrollRef.current = pct;
          // Milestones
          [25, 50, 75, 100].forEach((m) => {
            if (pct >= m && (maxScrollRef as any)[`hit${m}`] !== true) {
              (maxScrollRef as any)[`hit${m}`] = true;
              enqueue({ session_id: sessionIdRef.current, user_id: user?.id ?? null,
                event_type: "scroll_depth", path: location.pathname, metadata: { pct: m } });
            }
          });
        }
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true } as any);
      document.removeEventListener("submit", onSubmit, { capture: true } as any);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
    };
  }, [user?.id, location.pathname]);

  return <>{children}</>;
}
