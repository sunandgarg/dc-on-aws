import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = 10 * 60 * 1000;

export function useStudyBoards() {
  return useQuery({
    queryKey: ["study-boards"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_boards")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStudySubjects(classNum?: number, boardSlug?: string) {
  return useQuery({
    queryKey: ["study-subjects", classNum, boardSlug],
    enabled: !!classNum && !!boardSlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_subjects")
        .select("*")
        .eq("class_num", classNum!)
        .eq("board_slug", boardSlug!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStudySubject(classNum?: number, boardSlug?: string, subjectSlug?: string) {
  return useQuery({
    queryKey: ["study-subject", classNum, boardSlug, subjectSlug],
    enabled: !!classNum && !!boardSlug && !!subjectSlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_subjects")
        .select("*")
        .eq("class_num", classNum!)
        .eq("board_slug", boardSlug!)
        .eq("slug", subjectSlug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useStudyChapters(subjectId?: string) {
  return useQuery({
    queryKey: ["study-chapters", subjectId],
    enabled: !!subjectId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_chapters")
        .select("*")
        .eq("subject_id", subjectId!)
        .eq("is_active", true)
        .order("chapter_number");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStudyResources(opts: { chapterId?: string; subjectId?: string }) {
  return useQuery({
    queryKey: ["study-resources", opts.chapterId, opts.subjectId],
    enabled: !!(opts.chapterId || opts.subjectId),
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from("study_resources").select("*").eq("is_active", true);
      if (opts.chapterId) q = q.eq("chapter_id", opts.chapterId);
      else if (opts.subjectId) q = q.eq("subject_id", opts.subjectId).is("chapter_id", null);
      const { data, error } = await q.order("year", { ascending: false }).order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Fetches every resource (chapter-level + subject-level) for a subject.
// Used by the subject page to build year-wise PYQ chips, tricks, easy notes etc.
export function useAllSubjectResources(subjectId?: string) {
  return useQuery({
    queryKey: ["study-resources-all", subjectId],
    enabled: !!subjectId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_resources")
        .select("*")
        .eq("subject_id", subjectId!)
        .eq("is_active", true)
        .order("year", { ascending: false })
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Board-wise toppers (Science / Commerce / Arts) shown above subject grid.
export function useStudyToppers(classNum?: number, boardSlug?: string) {
  return useQuery({
    queryKey: ["study-toppers", classNum, boardSlug],
    enabled: !!classNum && !!boardSlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_toppers" as any)
        .select("*")
        .eq("class_num", classNum!)
        .eq("board_slug", boardSlug!)
        .eq("is_active", true)
        .order("year", { ascending: false })
        .order("stream")
        .order("rank");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
