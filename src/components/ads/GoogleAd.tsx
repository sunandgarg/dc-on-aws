import { useEffect, useRef } from "react";
import { useAdsenseSettings, useAdUnits, useAdsAllowed, pickAdUnit } from "@/hooks/useAdsense";
import { supabase } from "@/integrations/supabase/client";

interface GoogleAdProps {
  placement: string; // homepage | article | sidebar | footer | header | search | study | course | custom
  position?: string; // top | middle | bottom | before-content | after-content | sticky-left | sticky-right
  pageKey?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal ad slot. Picks the best matching admin-configured ad unit and
 * renders Google AdSense, custom HTML, or nothing. Layout-safe with min-height
 * to prevent CLS, lazy-loaded via IntersectionObserver when enabled.
 */
export function GoogleAd({ placement, position, pageKey, className = "", style }: GoogleAdProps) {
  const allowed = useAdsAllowed(pageKey);
  const { data: settings } = useAdsenseSettings();
  const { data: units } = useAdUnits();
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  const unit = pickAdUnit(units, placement, position);

  useEffect(() => {
    if (!allowed || !unit || !ref.current || firedRef.current) return;
    const node = ref.current;
    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      try {
        if (unit.ad_slot_id && (window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
        }
      } catch {
        /* noop */
      }
      // Impression event
      try {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        (supabase as any)
          .from("ad_analytics_events")
          .insert({
            ad_unit_id: unit.id,
            event_type: "impression",
            device: isMobile ? "mobile" : "desktop",
            page_url: window.location.pathname,
          })
          .then(() => undefined, () => undefined);
      } catch {
        /* noop */
      }
    };

    if (settings?.lazy_load_enabled) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              fire();
              io.disconnect();
            }
          });
        },
        { rootMargin: "200px" },
      );
      io.observe(node);
      return () => io.disconnect();
    }
    fire();
  }, [allowed, unit, settings?.lazy_load_enabled]);

  if (!allowed || !unit) return null;

  const client = settings?.client_id || settings?.publisher_id || "";
  const minH = unit.min_height || (unit.ad_type === "sticky" ? 90 : 120);

  const trackClick = () => {
    try {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      (supabase as any)
        .from("ad_analytics_events")
        .insert({
          ad_unit_id: unit.id,
          event_type: "click",
          device: isMobile ? "mobile" : "desktop",
          page_url: window.location.pathname,
        })
        .then(() => undefined, () => undefined);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      ref={ref}
      onClick={trackClick}
      className={`google-ad-slot ${className}`}
      data-ad-placement={placement}
      data-ad-position={position || ""}
      style={{ minHeight: minH, display: "block", overflow: "hidden", ...style }}
    >
      {unit.ad_type === "custom" || unit.custom_html ? (
        <div dangerouslySetInnerHTML={{ __html: unit.custom_html }} />
      ) : unit.ad_slot_id && client ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={unit.ad_slot_id}
          data-ad-format={unit.ad_format || "auto"}
          data-full-width-responsive={unit.full_width_responsive ? "true" : "false"}
        />
      ) : null}
    </div>
  );
}
