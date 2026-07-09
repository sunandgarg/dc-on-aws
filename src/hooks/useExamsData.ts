import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ExamImportantDate = { event: string; date: string };
export type ExamQuestionPaper = { label: string; url: string };

export type DbExam = {
  id: string;
  slug: string;
  name: string;
  full_name: string;
  category: string;
  level: string;
  exam_date: string;
  applicants: string;
  eligibility: string;
  mode: string;
  description: string;
  important_dates: ExamImportantDate[];
  syllabus: string[];
  top_colleges: string[];
  image: string;
  registration_url: string;
  duration: string;
  exam_type: string;
  language: string;
  frequency: string;
  application_mode: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New fields
  short_name: string;
  logo: string;
  application_start_date: string;
  application_end_date: string;
  result_date: string;
  website: string;
  negative_marking: boolean;
  seats: string;
  age_limit: string;
  sample_paper_url: string;
  summary_content: string;
  application_process: string;
  exam_pattern: string;
  cutoff_content: string;
  preparation_tips: string;
  counselling_content: string;
  center_content: string;
  question_paper: string;
  gender_wise: string;
  result_content: string;
  cast_wise_fee: string;
  dates_content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  question_papers: ExamQuestionPaper[];
  brochure_url: string;
  youtube_video_url: string;
  how_to_apply_video_url: string;
  google_rating: number;
  google_reviews_count: number;
  google_place_id: string;
  short_id?: number | null;
};

export function useDbExams() {
  return useQuery({
    queryKey: ["db-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapExam);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllDbExams() {
  return useQuery({
    queryKey: ["db-exams-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("priority", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapExam);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDbExam(slugOrSlugId: string | undefined) {
  return useQuery({
    queryKey: ["db-exam", slugOrSlugId],
    queryFn: async () => {
      if (!slugOrSlugId) return null;
      const m = slugOrSlugId.match(/^(.*?)-(\d+)$/);
      const id = m ? Number(m[2]) : null;
      const slug = m ? m[1] : slugOrSlugId;
      if (id) {
        const { data } = await supabase.from("exams").select("*").eq("short_id", id).maybeSingle();
        if (data) return mapExam(data);
      }
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? mapExam(data) : null;
    },
    enabled: !!slugOrSlugId,
    staleTime: 5 * 60 * 1000,
  });
}

function mapExam(row: any): DbExam {
  return {
    ...row,
    important_dates: Array.isArray(row.important_dates) ? row.important_dates : JSON.parse(row.important_dates || "[]"),
    question_papers: Array.isArray(row.question_papers) ? row.question_papers : JSON.parse(row.question_papers || "[]"),
    brochure_url: row.brochure_url ?? "",
  };
}

export function useSaveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exam: Partial<DbExam> & { slug: string; name: string }) => {
      const payload = {
        ...exam,
        important_dates: JSON.stringify(exam.important_dates ?? []),
        question_papers: JSON.stringify(exam.question_papers ?? []),
      };
      if (exam.id) {
        const { id, created_at, updated_at, ...rest } = payload;
        const { error } = await supabase.from("exams").update(rest as any).eq("id", id);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...rest } = payload;
        const { error } = await supabase.from("exams").insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db-exams"] });
      toast.success("Exam saved!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db-exams"] });
      toast.success("Exam deleted!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}
