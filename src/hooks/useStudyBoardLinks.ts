import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = 10 * 60 * 1000;

export function useStudyBoardLinks(classNum?: number, boardSlug?: string) {
  return useQuery({
    queryKey: ["study-board-links", classNum, boardSlug],
    enabled: !!classNum && !!boardSlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_board_links" as any)
        .select("*")
        .eq("class_num", classNum!)
        .eq("board_slug", boardSlug!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
