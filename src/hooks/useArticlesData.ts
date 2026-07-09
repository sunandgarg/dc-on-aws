import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DbArticle = {
  id: string;
  status: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  vertical: string;
  category: string;
  author: string;
  featured_image: string;
  views: number;
  tags: string[];
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useDbArticles() {
  return useQuery({
    queryKey: ["db-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbArticle[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllDbArticles() {
  return useQuery({
    queryKey: ["db-articles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbArticle[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDbArticle(slug: string | undefined) {
  return useQuery({
    queryKey: ["db-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as DbArticle | null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (article: Partial<DbArticle> & { slug: string; title: string }) => {
      // Normalize slug: lowercase, spaces & special chars -> dashes
      const cleanSlug = (article.slug || "")
        .toString()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const normalized = { ...article, slug: cleanSlug || article.slug };
      if (normalized.id) {
        const { id, created_at, updated_at, ...rest } = normalized;
        const { error } = await supabase.from("articles").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...rest } = normalized;
        const { error } = await supabase.from("articles").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db-articles"] });
      toast.success("Article saved!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db-articles"] });
      toast.success("Article deleted!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}
