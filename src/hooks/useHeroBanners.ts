import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureBootstrap, resetBootstrap } from "@/lib/bootstrap";

export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url: string;
  cta_text: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useHeroBanners() {
  return useQuery({
    queryKey: ["hero-banners"],
    queryFn: async () => {
      const boot = await ensureBootstrap();
      if (boot?.hero_banners) return boot.hero_banners as HeroBanner[];
      const { data, error } = await supabase
        .from("hero_banners" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HeroBanner[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAllHeroBanners() {
  return useQuery({
    queryKey: ["hero-banners-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners" as any)
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HeroBanner[];
    },
  });
}

export function useUpsertHeroBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: Partial<HeroBanner> & { image_url: string }) => {
      if (banner.id) {
        const { error } = await supabase
          .from("hero_banners" as any)
          .update(banner as any)
          .eq("id", banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hero_banners" as any)
          .insert(banner as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      resetBootstrap();
      qc.invalidateQueries({ queryKey: ["hero-banners"] });
      qc.invalidateQueries({ queryKey: ["hero-banners-all"] });
    },
  });
}

export function useDeleteHeroBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hero_banners" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      resetBootstrap();
      qc.invalidateQueries({ queryKey: ["hero-banners"] });
      qc.invalidateQueries({ queryKey: ["hero-banners-all"] });
    },
  });
}
