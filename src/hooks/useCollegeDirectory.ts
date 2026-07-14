import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbCollege } from "@/hooks/useCollegesData";

export const COLLEGE_DIRECTORY_SELECT = "id,short_id,slug,name,short_name,location,city,state,type,category,rating,reviews,fees,image,logo,tags,approvals,naac_grade,established,priority,featured_rank,affiliation_kind,parent_university_slug";
export const COLLEGE_DIRECTORY_PAGE_SIZE = 50;

export type CollegeDirectoryItem = Pick<DbCollege, "id" | "slug" | "name" | "short_name" | "location" | "city" | "state" | "type" | "category" | "rating" | "reviews" | "fees" | "image" | "logo" | "tags" | "approvals" | "naac_grade" | "established" | "priority" | "featured_rank" | "affiliation_kind" | "parent_university_slug"> & { short_id?: number | null };

export type CollegeDirectoryFilters = {
  search?: string;
  categories?: string[];
  state?: string;
  city?: string;
  types?: string[];
  approvals?: string[];
  naacGrades?: string[];
};

function cleanSearch(value = "") {
  return value.trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, 100);
}

async function fetchDirectoryPage(filters: CollegeDirectoryFilters, page: number) {
  const from = page * COLLEGE_DIRECTORY_PAGE_SIZE;
  const search = cleanSearch(filters.search);

  let query = supabase
    .from("colleges")
    .select(COLLEGE_DIRECTORY_SELECT)
    .eq("is_active", true);

  if (search) {
    query = query.or(`name.ilike.%${search}%,short_name.ilike.%${search}%,slug.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%,location.ilike.%${search}%`);
  }
  if (filters.categories?.length) query = query.in("category", filters.categories);
  if (filters.state) query = query.eq("state", filters.state);
  if (filters.city) query = query.eq("city", filters.city);
  if (filters.types?.length) query = query.in("type", filters.types);
  if (filters.approvals?.length) query = query.overlaps("approvals", filters.approvals);
  if (filters.naacGrades?.length) query = query.in("naac_grade", filters.naacGrades);

  const { data, error } = await query
    .order("priority", { ascending: true, nullsFirst: false })
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + COLLEGE_DIRECTORY_PAGE_SIZE - 1);

  if (error) throw error;
  return (data ?? []) as CollegeDirectoryItem[];
}

/**
 * Ranked, server-filtered directory pages. The browser receives the first 50
 * cards immediately and asks for later pages only as the visitor scrolls.
 */
export function useCollegeDirectory(filters: CollegeDirectoryFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["colleges-directory", "v2", filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchDirectoryPage(filters, pageParam),
    getNextPageParam: (lastPage, pages) => lastPage.length === COLLEGE_DIRECTORY_PAGE_SIZE ? pages.length : undefined,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
