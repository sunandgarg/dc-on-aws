import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DbCollege = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  location: string;
  city: string;
  state: string;
  type: string;
  category: string;
  rating: number;
  reviews: number;
  courses_count: number;
  fees: string;
  placement: string;
  ranking: string;
  image: string;
  tags: string[];
  established: number;
  description: string;
  highlights: string[];
  facilities: string[];
  approvals: string[];
  naac_grade: string;
  top_recruiters: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New fields
  status: string;
  logo: string;
  carousel_images: string[];
  brochure_url: string;
  eligibility_criteria: string;
  admission_process: string;
  scholarship_details: string;
  hostel_life: string;
  gallery_images: string[];
  cutoff: string;
  course_fee_content: string;
  placement_content: string;
  rankings_content: string;
  facilities_content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  banner_ad_image: string;
  square_ad_image: string;
  youtube_video_url: string;
  priority?: number | null;
  priority_updated_at?: string | null;
  featured_rank?: number | null;
  apply_cta_mode?: string | null;
  apply_url?: string | null;
  admission_criteria_points?: string[] | null;
  affiliation_kind?: "university" | "affiliated" | "standalone" | null;
  parent_university_slug?: string | null;
  is_partner?: boolean | null;
};

export type AdminCollegeListItem = Pick<DbCollege,
  | "id" | "slug" | "name" | "short_name" | "location" | "city" | "state"
  | "type" | "category" | "rating" | "reviews" | "courses_count" | "established"
  | "image" | "logo" | "status" | "is_active" | "updated_at" | "priority"
  | "featured_rank" | "affiliation_kind" | "is_partner"
>;

export type AdminCollegeListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: "all" | "Published" | "Draft";
  category?: string;
  state?: string;
};

const ADMIN_COLLEGE_LIST_SELECT = "id,slug,name,short_name,location,city,state,type,category,rating,reviews,courses_count,established,image,logo,status,is_active,updated_at,priority,featured_rank,affiliation_kind,is_partner";
const PUBLIC_COLLEGE_CARD_SELECT = "id,slug,name,short_name,location,city,state,type,category,rating,reviews,courses_count,fees,image,logo,tags,established,approvals,naac_grade,is_active,status,priority,priority_updated_at,featured_rank,affiliation_kind,parent_university_slug,is_partner";

const COLLEGE_PAGE_SIZE = 1000;

async function fetchActiveColleges(): Promise<DbCollege[]> {
  const { data, error } = await supabase
    .from("colleges")
    .select(PUBLIC_COLLEGE_CARD_SELECT)
    .eq("is_active", true)
    .order("priority", { ascending: true, nullsFirst: false })
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("priority_updated_at", { ascending: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as DbCollege[];
}

async function fetchAllColleges(): Promise<DbCollege[]> {
  const colleges: DbCollege[] = [];

  for (let from = 0; ; from += COLLEGE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .order("priority", { ascending: true, nullsFirst: false })
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .order("priority_updated_at", { ascending: false })
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + COLLEGE_PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as DbCollege[];
    colleges.push(...page);
    if (page.length < COLLEGE_PAGE_SIZE) break;
  }

  return colleges;
}

export function useDbColleges() {
  return useQuery({
    queryKey: ["db-colleges"],
    queryFn: async () => {
      // Sort rule (UI/UX 2026, leaderboard semantics):
      //   1. priority asc (1 = top, nulls last) - admin-pinned items always win
      //   2. featured_rank asc (1–4 slots) - secondary tiebreaker
      //   3. most-recently re-pinned wins ties
      //   4. rating desc
      return fetchActiveColleges();
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useFeaturedCollegeCards(slugs: string[]) {
  const orderedSlugs = slugs.filter(Boolean);

  return useQuery({
    queryKey: ["featured-college-cards", orderedSlugs],
    queryFn: async () => {
      if (!orderedSlugs.length) return [] as DbCollege[];
      const { data, error } = await supabase
        .from("colleges")
        .select(PUBLIC_COLLEGE_CARD_SELECT)
        .eq("is_active", true)
        .in("slug", orderedSlugs);

      if (error) throw error;

      const rows = new Map<string, DbCollege>();
      ((data ?? []) as unknown as DbCollege[]).forEach((row) => rows.set(row.slug, row));
      return orderedSlugs.map((slug) => rows.get(slug)).filter(Boolean) as DbCollege[];
    },
    enabled: orderedSlugs.length > 0,
    staleTime: 10 * 60_000,
  });
}

/** Small, independent homepage query so category cards never depend on the
 * directory's first top-100 batch. */
export function useHomepageCategoryColleges(category: string) {
  return useQuery({
    queryKey: ["homepage-category-colleges", category],
    queryFn: async () => {
      const base = () => supabase.from("colleges").select(PUBLIC_COLLEGE_CARD_SELECT).eq("is_active", true).order("priority", { ascending: true, nullsFirst: false }).order("rating", { ascending: false, nullsFirst: false }).limit(8);
      const [primary, additional] = await Promise.all([base().ilike("category", category), base().contains("categories", [category])]);
      if (primary.error) throw primary.error;
      if (additional.error && !String(additional.error.message).includes("categories")) throw additional.error;
      const unique = new Map<string, DbCollege>();
      [...(primary.data || []), ...(additional.data || [])].forEach((row: any) => unique.set(row.id, row));
      return [...unique.values()].slice(0, 5);
    },
    staleTime: 10 * 60_000,
  });
}

export function useAllDbColleges() {
  return useQuery({
    queryKey: ["db-colleges-all"],
    queryFn: fetchAllColleges,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminCollegeList(filters: AdminCollegeListFilters) {
  const page = Math.max(1, filters.page);
  const pageSize = Math.max(10, Math.min(100, filters.pageSize));
  const search = (filters.search ?? "").trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ");

  return useQuery({
    queryKey: ["admin-colleges-list-v2", page, pageSize, search, filters.status ?? "all", filters.category ?? "", filters.state ?? ""],
    queryFn: async () => {
      let query = supabase
        .from("colleges")
        .select(ADMIN_COLLEGE_LIST_SELECT, { count: "exact" });

      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.state) query = query.eq("state", filters.state);
      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const { data, error, count } = await query
        .order("priority", { ascending: true, nullsFirst: false })
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      return { rows: (data ?? []) as AdminCollegeListItem[], total: count ?? 0 };
    },
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });
}

export function useAdminCollegeStats() {
  return useQuery({
    queryKey: ["admin-colleges-stats-v2"],
    queryFn: async () => {
      const [total, published, draft, active, inactive] = await Promise.all([
        supabase.from("colleges").select("id", { count: "exact", head: true }),
        supabase.from("colleges").select("id", { count: "exact", head: true }).eq("status", "Published"),
        supabase.from("colleges").select("id", { count: "exact", head: true }).eq("status", "Draft"),
        supabase.from("colleges").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("colleges").select("id", { count: "exact", head: true }).eq("is_active", false),
      ]);
      const failed = [total, published, draft, active, inactive].find((result) => result.error);
      if (failed?.error) throw failed.error;
      return {
        total: total.count ?? 0,
        published: published.count ?? 0,
        draft: draft.count ?? 0,
        active: active.count ?? 0,
        inactive: inactive.count ?? 0,
      };
    },
    staleTime: 30 * 1000,
    refetchOnMount: "always",
  });
}

/**
 * Sensible defaults so a freshly-created college (just slug + name) still
 * renders a complete-looking detail page. Admin-entered values always win.
 */
function applyCollegeFallbacks(c: DbCollege | null): DbCollege | null {
  if (!c) return c;
  const shortName = c.short_name || c.name;
  const yr = new Date().getFullYear();
  return {
    ...c,
    short_name: shortName,
    location: c.location || [c.city, c.state].filter(Boolean).join(", ") || "India",
    city: c.city || "-",
    state: c.state || "India",
    type: c.type || "Private",
    category: c.category || "General",
    rating: c.rating ?? 4.2,
    reviews: c.reviews ?? 0,
    courses_count: c.courses_count ?? 25,
    fees: c.fees || "₹50,000 – ₹2,50,000 / year (approx.)",
    placement: c.placement || "₹4 – 8 LPA (avg.)",
    ranking: c.ranking || "Emerging",
    image: c.image || "/placeholder.svg",
    tags: c.tags?.length ? c.tags : ["Admissions Open", `Session ${yr}`],
    established: c.established || 2000,
    description:
      c.description ||
      `<p>${shortName} is a recognised ${c.type || "private"} institution offering a wide range of programs across UG and PG streams. Admissions for the ${yr} academic session are now open. Read on for fees, placements, courses, ranking, scholarships and admission process.</p>`,
    highlights: c.highlights?.length
      ? c.highlights
      : [
          `Recognised ${c.type || "Private"} institution`,
          `Multiple UG & PG programs`,
          `Modern campus & infrastructure`,
          `Active placement cell`,
          `Scholarships available for eligible students`,
        ],
    facilities: c.facilities?.length ? c.facilities : ["Library", "Hostel", "Wi-Fi Campus", "Cafeteria", "Sports Complex", "Labs"],
    approvals: c.approvals?.length ? c.approvals : ["UGC", "AICTE"],
    naac_grade: c.naac_grade || "-",
    top_recruiters: c.top_recruiters?.length
      ? c.top_recruiters
      : ["TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "HCL"],
  };
}

export function useDbCollege(slugOrSlugId: string | undefined) {
  return useQuery({
    queryKey: ["db-college", slugOrSlugId],
    queryFn: async () => {
      if (!slugOrSlugId) return null;
      // Parse trailing -<id>
      const m = slugOrSlugId.match(/^(.*?)-(\d+)$/);
      const id = m ? Number(m[2]) : null;
      const slug = m ? m[1] : slugOrSlugId;

      // Try id first (canonical), then slug fallback.
      if (id) {
        const { data } = await supabase.from("colleges").select("*").eq("short_id", id).maybeSingle();
        if (data) return applyCollegeFallbacks(data as DbCollege);
      }
      const { data, error } = await supabase
        .from("colleges")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return applyCollegeFallbacks(data as DbCollege | null);
    },
    enabled: !!slugOrSlugId,
    staleTime: 5 * 60 * 1000,
  });
}


export function useCollegesByState(state: string | undefined, excludeSlug?: string) {
  return useQuery({
    queryKey: ["db-colleges-state", state, excludeSlug],
    queryFn: async () => {
      let q = supabase.from("colleges").select("*").eq("state", state!).eq("is_active", true).limit(6);
      if (excludeSlug) q = q.neq("slug", excludeSlug);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbCollege[];
    },
    enabled: !!state,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCollegesByCategory(category: string | undefined, excludeSlug?: string) {
  return useQuery({
    queryKey: ["db-colleges-category", category, excludeSlug],
    queryFn: async () => {
      let q = supabase.from("colleges").select("*").eq("category", category!).eq("is_active", true).limit(6);
      if (excludeSlug) q = q.neq("slug", excludeSlug);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbCollege[];
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveCollege() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (college: Partial<DbCollege> & { slug: string; name: string }) => {
      if (college.id) {
        const { id, created_at, updated_at, ...rest } = college;
        const { error } = await supabase.from("colleges").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...rest } = college;
        const { error } = await supabase.from("colleges").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate every cached colleges query so changes (priority, featured rank,
      // status, etc.) reflect everywhere without a hard refresh.
      qc.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey?.[0];
        return typeof k === "string" && (k.startsWith("db-college") || k.startsWith("admin-colleges") || k.startsWith("infinite-college") || k === "featured-colleges");
      }});
      toast.success("College saved!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}

export function useDeleteCollege() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colleges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey?.[0];
        return typeof k === "string" && (k.startsWith("db-college") || k.startsWith("admin-colleges") || k.startsWith("infinite-college") || k === "featured-colleges");
      }});
      toast.success("College deleted!");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}
