import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureBootstrap } from "@/lib/bootstrap";

type Row = { key: string; value: string | null; enabled: boolean };

const ALL_KEY = ["site-integrations", "all"] as const;

async function fetchAll(): Promise<Row[]> {
  const boot = await ensureBootstrap();
  if (boot?.site_integrations) return boot.site_integrations as Row[];
  const { data } = await (supabase as any)
    .from("site_integrations")
    .select("key,value,enabled");
  return (data ?? []) as Row[];
}

/** Per-key lookup. Backed by a single shared cache of ALL rows - 10 callers,
 *  10 different keys → ONE network call (or zero if bootstrap seeded it). */
export function useSiteIntegration(key: string) {
  return useQuery({
    queryKey: ALL_KEY,
    queryFn: fetchAll,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    select: (rows: Row[]): string => {
      const row = rows.find((r) => r.key === key);
      if (!row || !row.enabled) return "";
      return (row.value as string) || "";
    },
  });
}
