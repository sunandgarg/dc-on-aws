import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureBootstrap } from "@/lib/bootstrap";

interface Ad {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string;
  link_url: string;
  image_url: string | null;
  variant: string;
  bg_gradient: string;
  target_type: string;
  target_page: string | null;
  target_item_slug: string | null;
  target_city: string | null;
  position: string;
  priority: number;
  is_active: boolean;
}

/**
 * Fetches ads with fallback priority:
 * 1. Item-specific ad (specific college/course/exam/article)
 * 2. Page + city specific
 * 3. Page-specific (e.g., "colleges" page)
 * 4. City-specific universal
 * 5. Universal fallback
 */
export function useAds(options?: {
  page?: string;
  itemSlug?: string;
  city?: string;
  variant?: string;
  position?: string;
}) {
  return useQuery({
    // Single shared cache key so every <DynamicAdBanner> reuses the same fetch.
    // Filtering happens in `select` (client-side) - no extra network calls per slot.
    queryKey: ["ads", "all-active"],
    queryFn: async () => {
      const boot = await ensureBootstrap();
      if (boot?.ads) return boot.ads as Ad[];
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Ad[];
    },
    select: (allAds) => {
      if (!allAds.length) return null;

      const { page, itemSlug, city, variant, position } = options ?? {};

      let candidates = allAds;
      if (variant) candidates = candidates.filter((a) => a.variant === variant);
      if (position) candidates = candidates.filter((a) => a.position === position);

      if (itemSlug) {
        const itemAd = candidates.find(
          (a) => a.target_type === "item" && a.target_item_slug === itemSlug
        );
        if (itemAd) return itemAd;
      }
      if (page && city) {
        const pageCityAd = candidates.find(
          (a) => a.target_type === "page" && a.target_page === page && a.target_city === city
        );
        if (pageCityAd) return pageCityAd;
      }
      if (page) {
        const pageAd = candidates.find(
          (a) => a.target_type === "page" && a.target_page === page && !a.target_city
        );
        if (pageAd) return pageAd;
      }
      if (city) {
        const cityAd = candidates.find(
          (a) => a.target_type === "city" && a.target_city === city
        );
        if (cityAd) return cityAd;
      }
      const universalAd = candidates.find((a) => a.target_type === "universal");
      return universalAd ?? null;
    },
    staleTime: 5 * 60_000, // 5 min - ads change rarely
    gcTime: 30 * 60_000,
  });
}

/** Fetch all ads for admin management */
export function useAllAds() {
  return useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ad[];
    },
  });
}
