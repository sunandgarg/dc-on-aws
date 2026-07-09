/**
 * Auto-discovery helpers for "all-columns" import/export.
 *
 * Goals:
 *  - Never drop a field: when columns="*", use the union of every key found in
 *    the table (excluding only auto-managed columns: id/created_at/updated_at).
 *  - Auto-infer typeHints from real row data so CSV round-trips don't lose
 *    arrays/booleans/numbers/json blobs.
 */
import { supabase } from "@/integrations/supabase/client";

export const STRIPPED = new Set<string>(["id", "created_at", "updated_at", "priority_updated_at"]);

export type AutoTypeHints = Record<string, "number" | "boolean" | "array" | "json">;

export interface AutoSchema {
  columns: string[];           // ordered, stripped of auto-managed
  typeHints: AutoTypeHints;
}

/** Inspect rows and return ordered union of keys + inferred type hints. */
export function inferSchemaFromRows(rows: any[]): AutoSchema {
  const seen = new Map<string, number>();
  const hints: AutoTypeHints = {};
  for (const r of rows || []) {
    if (!r || typeof r !== "object") continue;
    for (const k of Object.keys(r)) {
      if (STRIPPED.has(k)) continue;
      if (!seen.has(k)) seen.set(k, seen.size);
      const v = (r as any)[k];
      if (v == null) continue;
      if (hints[k]) continue;
      if (Array.isArray(v)) hints[k] = "array";
      else if (typeof v === "boolean") hints[k] = "boolean";
      else if (typeof v === "number") hints[k] = "number";
      else if (typeof v === "object") hints[k] = "json";
    }
  }
  // Always keep slug / short_id first when present
  const cols = Array.from(seen.keys()).sort((a, b) => {
    const pri = (k: string) => k === "slug" ? 0 : k === "short_id" ? 1 : k === "name" || k === "title" ? 2 : 9;
    const pa = pri(a), pb = pri(b);
    if (pa !== pb) return pa - pb;
    return (seen.get(a) ?? 0) - (seen.get(b) ?? 0);
  });
  return { columns: cols, typeHints: hints };
}

/** Fetch every row of a table (paged) and return the inferred schema + rows. */
export async function discoverTable(table: string, pageSize = 1000): Promise<{ rows: any[]; schema: AutoSchema }> {
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table as any)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data || []) as any[];
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
    if (from > 50_000) break; // safety
  }
  // Always inspect at least one row even when table is empty (sample columns by select * limit 1)
  if (all.length === 0) {
    const { data } = await supabase.from(table as any).select("*").limit(1);
    return { rows: [], schema: inferSchemaFromRows(data || []) };
  }
  return { rows: all, schema: inferSchemaFromRows(all) };
}

/** Cheap one-row schema sniff (for templates / import preview). */
export async function sniffSchema(table: string): Promise<AutoSchema> {
  const { data, error } = await supabase.from(table as any).select("*").limit(50);
  if (error) throw error;
  return inferSchemaFromRows(data || []);
}
