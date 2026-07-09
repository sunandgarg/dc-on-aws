import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = 10 * 60 * 1000;

export function useCollegePrograms() {
  return useQuery({
    queryKey: ["college-programs"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_programs" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCollegeProgram(slug?: string) {
  return useQuery({
    queryKey: ["college-program", slug],
    enabled: !!slug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_programs" as any)
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCollegeUniversities(programSlug?: string) {
  return useQuery({
    queryKey: ["college-universities", programSlug],
    enabled: !!programSlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_universities" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCollegeUniversity(programSlug?: string, universitySlug?: string) {
  return useQuery({
    queryKey: ["college-university", programSlug, universitySlug],
    enabled: !!programSlug && !!universitySlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_universities" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("slug", universitySlug!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCollegeSemesters(programSlug?: string, universitySlug?: string) {
  return useQuery({
    queryKey: ["college-semesters", programSlug, universitySlug],
    enabled: !!programSlug && !!universitySlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_semesters" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("university_slug", universitySlug!)
        .eq("is_active", true)
        .order("semester_num");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCollegeSubjects(programSlug?: string, universitySlug?: string, semesterNum?: number) {
  return useQuery({
    queryKey: ["college-subjects", programSlug, universitySlug, semesterNum],
    enabled: !!programSlug && !!universitySlug && !!semesterNum,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_subjects" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("university_slug", universitySlug!)
        .eq("semester_num", semesterNum!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCollegeSubject(programSlug?: string, universitySlug?: string, semesterNum?: number, subjectSlug?: string) {
  return useQuery({
    queryKey: ["college-subject", programSlug, universitySlug, semesterNum, subjectSlug],
    enabled: !!programSlug && !!universitySlug && !!semesterNum && !!subjectSlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_subjects" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("university_slug", universitySlug!)
        .eq("semester_num", semesterNum!)
        .eq("slug", subjectSlug!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCollegeResources(subjectId?: string) {
  return useQuery({
    queryKey: ["college-resources", subjectId],
    enabled: !!subjectId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_resources" as any)
        .select("*")
        .eq("subject_id", subjectId!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCollegeQuickLinks(programSlug?: string, universitySlug?: string, semesterNum?: number) {
  return useQuery({
    queryKey: ["college-quick-links", programSlug, universitySlug, semesterNum ?? null],
    enabled: !!programSlug && !!universitySlug,
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase
        .from("college_quick_links" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("university_slug", universitySlug!)
        .eq("is_active", true);
      if (semesterNum != null) q = q.eq("semester_num", semesterNum);
      else q = q.is("semester_num", null);
      const { data, error } = await q.order("display_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCollegeFewLinks(programSlug?: string, universitySlug?: string) {
  return useQuery({
    queryKey: ["college-few-links", programSlug, universitySlug],
    enabled: !!programSlug && !!universitySlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_few_links" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("university_slug", universitySlug!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCollegeToppers(programSlug?: string, universitySlug?: string) {
  return useQuery({
    queryKey: ["college-toppers", programSlug, universitySlug],
    enabled: !!programSlug && !!universitySlug,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("college_toppers" as any)
        .select("*")
        .eq("program_slug", programSlug!)
        .eq("university_slug", universitySlug!)
        .eq("is_active", true)
        .order("year", { ascending: false })
        .order("rank");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
