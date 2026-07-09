import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureBootstrap } from "@/lib/bootstrap";

interface FeaturedCollege {
  id: string;
  college_slug: string;
  category: string | null;
  state: string | null;
  display_order: number;
  is_active: boolean;
}

export function useFeaturedColleges(category?: string, state?: string) {
  return useQuery({
    queryKey: ["featured-colleges", category, state],
    queryFn: async () => {
      const boot = await ensureBootstrap();
      if (boot?.featured_colleges) return boot.featured_colleges as FeaturedCollege[];
      const { data, error } = await supabase
        .from("featured_colleges")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeaturedCollege[];
    },
    select: (all) => {
      if (category && category !== "All") {
        const catFiltered = all.filter((f) => f.category === category);
        if (catFiltered.length > 0) return catFiltered.map((f) => f.college_slug);
      }
      if (state && state !== "All") {
        const stateFiltered = all.filter((f) => f.state === state);
        if (stateFiltered.length > 0) return stateFiltered.map((f) => f.college_slug);
      }
      return all.map((f) => f.college_slug);
    },
    staleTime: 5 * 60_000,
  });
}

export function useAllFeaturedColleges() {
  return useQuery({
    queryKey: ["admin-featured-colleges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_colleges")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeaturedCollege[];
    },
  });
}
