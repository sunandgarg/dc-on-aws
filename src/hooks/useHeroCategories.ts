import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import iconCollege from "@/assets/cat-college.png";
import iconCourse from "@/assets/cat-course.png";
import iconExam from "@/assets/cat-exam.png";
import iconApplication from "@/assets/cat-application.png";
import iconReviews from "@/assets/cat-reviews.png";
import iconNews from "@/assets/cat-news.png";

export type HeroCategory = { key: string; label: string; img: string; tint: string; href: string };

export const DEFAULT_HERO_CATEGORIES: HeroCategory[] = [
  { key: "college", label: "13,004+ Colleges", img: iconCollege, tint: "bg-rose-50 border-rose-100", href: "/colleges" },
  { key: "course", label: "840+ Courses", img: iconCourse, tint: "bg-sky-50 border-sky-100", href: "/courses" },
  { key: "exam", label: "219+ Exams", img: iconExam, tint: "bg-violet-50 border-violet-100", href: "/exams" },
  { key: "application", label: "Application Form", img: iconApplication, tint: "bg-emerald-50 border-emerald-100", href: "/colleges" },
  { key: "review", label: "Student Reviews", img: iconReviews, tint: "bg-amber-50 border-amber-100", href: "/colleges" },
  { key: "news", label: "Latest News", img: iconNews, tint: "bg-blue-50 border-blue-100", href: "/news" },
];

export function useHeroCategories() {
  const query = useQuery({
    queryKey: ["hero-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hero_categories")
        .select("key,label,image_url,href,tint,is_active,display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ key: string; label: string; image_url: string; href: string; tint: string }>;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const categories = useMemo(() => {
    const rows = query.data ?? [];
    if (!rows.length) return DEFAULT_HERO_CATEGORIES;
    const defaults = new Map(DEFAULT_HERO_CATEGORIES.map((item) => [item.key, item]));
    return rows.map((row) => {
      const fallback = defaults.get(row.key);
      return {
        key: row.key,
        label: row.label || fallback?.label || row.key,
        img: row.image_url || fallback?.img || iconCollege,
        tint: row.tint || fallback?.tint || "bg-muted border-border",
        href: row.href || fallback?.href || "/",
      };
    });
  }, [query.data]);

  return { ...query, data: categories };
}
