import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { autoTrackRoute, getVisitorId, mergeVisitorIntoUser, setIntentUserId, trackIntent } from "@/lib/intentTracking";
import { supabase } from "@/integrations/supabase/client";

/**
 * Boots the visitor identity, mirrors route changes into intent_events for
 * detail pages, and merges anonymous activity into the user on sign-in.
 */
export function IntentTrackingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const mergedFor = useRef<string | null>(null);

  // Ensure visitor row exists once per session
  useEffect(() => {
    const vid = getVisitorId();
    try {
      (supabase as any).from("intent_visitors").upsert({
        visitor_id: vid,
        last_seen_at: new Date().toISOString(),
        device_type: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        landing_url: location.pathname + location.search,
        utm: Object.fromEntries(new URLSearchParams(location.search).entries()),
      }, { onConflict: "visitor_id" }).then(() => {}, () => {});
    } catch { /* noop */ }
  }, []);

  // Mirror auth state into the SDK + merge on first sign-in
  useEffect(() => {
    setIntentUserId(user?.id ?? null);
    if (user?.id && mergedFor.current !== user.id) {
      mergedFor.current = user.id;
      mergeVisitorIntoUser(user.id);
    }
  }, [user?.id]);

  // Auto track detail-page views
  useEffect(() => {
    autoTrackRoute(location.pathname);
    // Auto-track section/anchor hits on college detail (#fees, #placements, #admission, etc.)
    const hash = (location.hash || "").replace("#", "").toLowerCase();
    const m = location.pathname.match(/^\/colleges?\/([^\/]+)/i);
    if (m && hash) {
      const slug = m[1];
      if (/fee/.test(hash))         trackIntent("fee_viewed",               { college_slug: slug });
      else if (/placement/.test(hash))   trackIntent("placement_viewed",         { college_slug: slug });
      else if (/admission/.test(hash))   trackIntent("admission_process_viewed", { college_slug: slug });
      else if (/cutoff/.test(hash))      trackIntent("cutoff_viewed",            { college_slug: slug });
      else if (/ranking|rank/.test(hash))trackIntent("ranking_viewed",           { college_slug: slug });
      else if (/hostel/.test(hash))      trackIntent("hostel_viewed",            { college_slug: slug });
      else if (/scholarship/.test(hash)) trackIntent("scholarship_viewed",       { college_slug: slug });
    }
  }, [location.pathname, location.hash]);

  return <>{children}</>;
}
