/**
 * useInfiniteData - Cursor-based infinite scroll hook
 * 
 * Implements cursor pagination using IntersectionObserver.
 * Each page fetches BATCH_SIZE items ordered by a cursor field.
 * The sentinel element triggers the next fetch at 300px margin.
 */
import { useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SearchGroup } from "@/lib/listingFilters";

const BATCH_SIZE = 18;

interface InfiniteConfig {
  table: "colleges" | "courses" | "exams" | "articles";
  queryKey: string[];
  orderBy?: string;
  ascending?: boolean;
  nullsFirst?: boolean;
  /** Additional ORDER BY clauses applied after the primary `orderBy`. */
  extraOrders?: { column: string; ascending?: boolean; nullsFirst?: boolean }[];
  filters?: Record<string, string | string[] | undefined>;
  arrayFilters?: Record<string, string[] | undefined>;
  search?: string;
  searchFields?: string[];
  searchGroups?: SearchGroup[];
  enabled?: boolean;
}

export function useInfiniteData({
  table,
  queryKey,
  orderBy = "rating",
  ascending = false,
  nullsFirst,
  extraOrders = [],
  filters = {},
  arrayFilters = {},
  search,
  searchFields = ["name"],
  searchGroups = [],
  enabled = true,
}: InfiniteConfig) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: [
      ...queryKey,
      orderBy,
      ascending,
      nullsFirst,
      JSON.stringify(filters),
      JSON.stringify(arrayFilters),
      search ?? "",
      JSON.stringify(searchGroups),
      JSON.stringify(extraOrders),
    ],
    queryFn: async ({ pageParam = 0 }) => {
      let q: any = supabase
        .from(table)
        .select("*")
        .eq("is_active", true)
        .order(orderBy, { ascending, nullsFirst });
      for (const o of extraOrders) {
        q = q.order(o.column, { ascending: o.ascending ?? false, nullsFirst: o.nullsFirst });
      }
      q = q.range(pageParam, pageParam + BATCH_SIZE - 1);

      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        if (Array.isArray(value) && value.length > 0) {
          q = q.in(key, value);
        } else if (typeof value === "string" && value) {
          q = q.eq(key, value);
        }
      }

      // Postgres array columns (for example course specializations) need an
      // overlap operation rather than scalar IN semantics.
      for (const [key, value] of Object.entries(arrayFilters)) {
        if (value?.length) q = q.overlaps(key, value);
      }

      // Apply search
      if (search && searchFields.length > 0) {
        const orClause = searchFields.map(f => `${f}.ilike.%${search}%`).join(",");
        q = q.or(orClause);
      }

      for (const group of searchGroups) {
        const terms = group.terms.filter(Boolean);
        if (terms.length === 0) continue;
        const fields = group.fields?.length ? group.fields : searchFields;
        const orClause = fields.flatMap((field) => terms.map((term) => `${field}.ilike.%${term}%`)).join(",");
        if (orClause) q = q.or(orClause);
      }

      const { data, error } = await q;
      if (error) throw error;
      return { items: data ?? [], offset: pageParam };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.items.length < BATCH_SIZE) return undefined;
      return lastPage.offset + BATCH_SIZE;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const items = query.data?.pages.flatMap(p => p.items) ?? [];

  return {
    items,
    sentinelRef,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    error: query.error,
  };
}
