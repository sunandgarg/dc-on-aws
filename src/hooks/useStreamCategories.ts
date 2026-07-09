import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STREAM_CATEGORIES } from "@/lib/streamCategories";

export interface StreamCategory {
  id: string;
  label: string;
  emoji: string;
}

/**
 * Reads the 12 stream categories from `stream_categories`.
 * Falls back to the hardcoded constant if DB is empty / loading.
 */
export function useStreamCategories() {
  return useQuery({
    queryKey: ["stream_categories"],
    staleTime: 10 * 60 * 1000,
    placeholderData: STREAM_CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
    queryFn: async (): Promise<StreamCategory[]> => {
      const { data } = await (supabase as any)
        .from("stream_categories")
        .select("slug,label,emoji,display_order,is_active")
        .eq("is_active", true)
        .order("display_order");
      if (!data || data.length === 0) {
        return STREAM_CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji }));
      }
      return data.map((d: any) => ({ id: d.slug, label: d.label, emoji: d.emoji }));
    },
  });
}
