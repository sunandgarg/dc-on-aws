import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureBootstrap } from "@/lib/bootstrap";

export interface HeroSettings {
  id: string;
  image_urls: string[];
  overlay_mode: "none" | "dark" | "light" | "tint" | "gradient";
  tint_color: string;
  overlay_opacity: number;
  blur_px: number;
  grayscale: number;
  brightness: number;
  saturation: number;
  rotation_seconds: number;
  is_active: boolean;
}

export function useHeroSettings() {
  return useQuery({
    queryKey: ["hero_settings"],
    queryFn: async (): Promise<HeroSettings | null> => {
      const boot = await ensureBootstrap();
      if (boot && "hero_settings" in boot) return (boot.hero_settings ?? null) as HeroSettings | null;
      const { data, error } = await (supabase as any)
        .from("hero_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as HeroSettings | null;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useUpdateHeroSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<HeroSettings> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await (supabase as any).from("hero_settings").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero_settings"] });
      toast.success("Hero settings updated");
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });
}
