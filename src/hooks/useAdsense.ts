import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdsenseSettings {
  id: string;
  publisher_id: string;
  client_id: string;
  account_id: string;
  verification_meta: string;
  auto_ads_enabled: boolean;
  ads_globally_enabled: boolean;
  enabled_on_mobile: boolean;
  enabled_on_desktop: boolean;
  enabled_for_guests: boolean;
  enabled_for_logged_in: boolean;
  disabled_roles: string[];
  disabled_pages: string[];
  ads_per_page_limit: number;
  lazy_load_enabled: boolean;
  refresh_interval_seconds: number;
  head_scripts: string;
  body_scripts: string;
  footer_scripts: string;
  custom_css: string;
  custom_js: string;
}

export interface AdUnit {
  id: string;
  name: string;
  ad_type: string;
  placement: string;
  position: string;
  ad_slot_id: string;
  ad_format: string;
  full_width_responsive: boolean;
  custom_html: string;
  priority: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_devices: string[];
  target_roles: string[];
  target_countries: string[];
  target_categories: string[];
  url_pattern: string;
  min_width: number | null;
  min_height: number | null;
}

export interface AdScript {
  id: string;
  name: string;
  location: "head" | "body" | "footer";
  code: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

export function useAdsenseSettings() {
  return useQuery({
    queryKey: ["adsense-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("adsense_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data ?? null) as AdsenseSettings | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAdUnits() {
  return useQuery({
    queryKey: ["ad-units", "active"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ad_units")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      return (data ?? []) as AdUnit[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAdScripts() {
  return useQuery({
    queryKey: ["ad-scripts", "active"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ad_scripts")
        .select("*")
        .eq("is_active", true);
      return (data ?? []) as AdScript[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Resolve whether ads should render for current user/device/page */
export function useAdsAllowed(pageKey?: string) {
  const { data: settings } = useAdsenseSettings();
  const { user } = useAuth();
  if (!settings || !settings.ads_globally_enabled) return false;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  if (isMobile && !settings.enabled_on_mobile) return false;
  if (!isMobile && !settings.enabled_on_desktop) return false;
  if (user && !settings.enabled_for_logged_in) return false;
  if (!user && !settings.enabled_for_guests) return false;
  if (pageKey && settings.disabled_pages?.includes(pageKey)) return false;
  return true;
}

export function pickAdUnit(
  units: AdUnit[] | undefined,
  placement: string,
  position?: string,
): AdUnit | null {
  if (!units?.length) return null;
  const now = Date.now();
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const device = isMobile ? "mobile" : "desktop";
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const candidates = units.filter((u) => {
    if (u.placement !== placement) return false;
    if (position && u.position !== position) return false;
    if (u.start_date && new Date(u.start_date).getTime() > now) return false;
    if (u.end_date && new Date(u.end_date).getTime() < now) return false;
    if (u.target_devices?.length && !u.target_devices.includes(device)) return false;
    if (u.url_pattern && !path.includes(u.url_pattern)) return false;
    return true;
  });
  return candidates[0] ?? null;
}
