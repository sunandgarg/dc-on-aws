import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbCollege } from "@/hooks/useCollegesData";

export const COLLEGE_DIRECTORY_SELECT = "id,short_id,slug,name,short_name,location,city,state,type,category,rating,reviews,fees,image,logo,tags,approvals,naac_grade,established,priority,featured_rank,affiliation_kind,parent_university_slug";

export type CollegeDirectoryItem = Pick<DbCollege, "id" | "slug" | "name" | "short_name" | "location" | "city" | "state" | "type" | "category" | "rating" | "reviews" | "fees" | "image" | "logo" | "tags" | "approvals" | "naac_grade" | "established" | "priority" | "featured_rank" | "affiliation_kind" | "parent_university_slug"> & { short_id?: number | null };

async function fetchDirectory() {
  const rows: CollegeDirectoryItem[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("colleges").select(COLLEGE_DIRECTORY_SELECT).eq("is_active", true)
      .order("priority", { ascending: true, nullsFirst: false }).order("featured_rank", { ascending: true, nullsFirst: false })
      .order("rating", { ascending: false }).order("name", { ascending: true }).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as CollegeDirectoryItem[]));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

/** One persisted, minimal browse dataset; filters/search run locally. */
export function useCollegeDirectory() {
  return useQuery({ queryKey: ["colleges-directory", "v1"], queryFn: fetchDirectory, staleTime: 30 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: false });
}
