import { useState, useEffect, useRef } from "react";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { trackEvent } from "@/lib/analytics";
import { getLastLeadTs, LEAD_SILENT_WINDOW_MS, markLeadSubmitted } from "@/lib/leadCapture";

/**
 * Persistent student-help lead popup.
 *  - First shows 15s after page load (longer if recently dismissed).
 *  - If the user submits ANY lead (here or anywhere else on the site),
 *    we go quiet for 30 minutes (LEAD_SILENT_WINDOW_MS), then resume.
 *  - If dismissed, re-appears after 30s, 45s, 60s ... (increments of 15s).
 *  - Dismiss/submission state syncs across browser tabs via the `storage` event.
 */
const BASE_DELAY_MS = 15_000;
const PERSIST_DISMISS_COUNT = "dc_lead_dismiss_count_v1";
const LAST_LEAD_TS_KEY = "dc_last_lead_ts_v1";

const COPY = {
  title: "🎓 Need help choosing the right college?",
  subtitle:
    "Built by IIT Delhi Alumni, we'll guide you to the right college, course & scholarships - completely free.",
  source: "periodic_popup",
};

function cooldownRemaining(): number {
  const ts = getLastLeadTs();
  if (!ts) return 0;
  return Math.max(0, LEAD_SILENT_WINDOW_MS - (Date.now() - ts));
}

export function PeriodicLeadPopup() {
  const [open, setOpen] = useState(false);
  const dismissCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = (delay: number) => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const remaining = cooldownRemaining();
      if (remaining > 0) {
        // Still in 30-min cooldown after a recent submission - defer.
        schedule(remaining + 250);
        return;
      }
      setOpen(true);
      trackEvent("lp_popup_scheduled_show", { source: COPY.source, dismiss_count: dismissCountRef.current });
    }, delay) as unknown as number;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = parseInt(localStorage.getItem(PERSIST_DISMISS_COUNT) || "0", 10);
    dismissCountRef.current = Number.isFinite(stored) ? stored : 0;
    const baseDelay = BASE_DELAY_MS * (dismissCountRef.current + 1);
    const remaining = cooldownRemaining();
    schedule(Math.max(baseDelay, remaining + 250));

    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_LEAD_TS_KEY && e.newValue) {
        clearTimer();
        setOpen(false);
        schedule(LEAD_SILENT_WINDOW_MS + 250);
      }
      if (e.key === PERSIST_DISMISS_COUNT && e.newValue) {
        const n = parseInt(e.newValue, 10);
        if (Number.isFinite(n)) {
          dismissCountRef.current = n;
          schedule(BASE_DELAY_MS * (n + 1));
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      // If popup just closed because of a submit, cooldown will handle it.
      if (cooldownRemaining() > 0) return;
      dismissCountRef.current += 1;
      localStorage.setItem(PERSIST_DISMISS_COUNT, String(dismissCountRef.current));
      trackEvent("lp_popup_dismiss_periodic", { source: COPY.source, dismiss_count: dismissCountRef.current });
      schedule(BASE_DELAY_MS * (dismissCountRef.current + 1));
    }
  };

  const handleSuccess = () => {
    markLeadSubmitted();
    trackEvent("lp_popup_submit_periodic", { source: COPY.source, dismiss_count: dismissCountRef.current });
    clearTimer();
    setOpen(false);
    // Resume scheduling AFTER the 30-min silent window
    schedule(LEAD_SILENT_WINDOW_MS + 250);
  };

  return (
    <LeadGateDialog
      open={open}
      onOpenChange={handleOpenChange}
      onSuccess={handleSuccess}
      title={COPY.title}
      subtitle={COPY.subtitle}
      source={COPY.source}
    />
  );
}
