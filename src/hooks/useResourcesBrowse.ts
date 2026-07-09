import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = 10 * 60 * 1000;

export type ResourceFilters = {
  classNum?: number | null;
  boardSlug?: string | null;
  subjectSlug?: string | null;
  type?: string | null; // pyq | notes | ncert | sample
  q?: string | null;
};

// Browses all resources, joined to subject for class/board metadata.
// Returns enriched rows so we can filter client-side without N+1 calls.
export function useAllResources() {
  return useQuery({
    queryKey: ["resources-browse-all"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_resources")
        .select(
          "id,title,description,resource_type,year,file_url,download_count,chapter_id,subject_id,study_subjects:subject_id(slug,name,class_num,board_slug,icon_emoji),study_chapters:chapter_id(slug,name,chapter_number)"
        )
        .eq("is_active", true)
        .order("year", { ascending: false })
        .order("display_order")
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useDistinctSubjects() {
  return useQuery({
    queryKey: ["resources-distinct-subjects"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_subjects")
        .select("slug,name,class_num,board_slug,icon_emoji")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
