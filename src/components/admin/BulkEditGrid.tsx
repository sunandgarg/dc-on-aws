import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Settings2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BulkColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "select";
  options?: string[];
  width?: number;
  readOnly?: boolean;
  defaultVisible?: boolean;
};

interface Props {
  table: string;
  columns: BulkColumn[];
  /** Columns included in search */
  searchKeys?: string[];
  /** Order by column desc, then by name */
  orderBy?: { column: string; ascending?: boolean };
  selectExtra?: string[];
  pageSize?: number;
}

/**
 * Reusable inline bulk-edit grid:
 * - search across configured keys
 * - column visibility toggles
 * - per-cell editing with dirty tracking
 * - batch "Save All" with Promise.all
 */
export function BulkEditGrid({
  table,
  columns,
  searchKeys = ["name", "slug"],
  orderBy = { column: "updated_at", ascending: false },
  selectExtra = [],
  pageSize = 300,
}: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(columns.map((c) => [c.key, c.defaultVisible !== false]))
  );

  const selectCols = Array.from(new Set(["id", ...columns.map((c) => c.key), ...selectExtra]));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["bulk-edit", table, pageSize],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select(selectCols.join(","))
        .order(orderBy.column, { ascending: orderBy.ascending ?? false })
        .limit(pageSize);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return rows;
    return rows.filter((r) =>
      searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(ql))
    );
  }, [rows, q, searchKeys]);

  const dirtyIds = useMemo(
    () => Object.keys(draft).filter((id) => Object.keys(draft[id] || {}).length > 0),
    [draft]
  );

  const setCell = (id: string, key: string, value: any, original: any) => {
    setDraft((d) => {
      const row = { ...(d[id] || {}) };
      // Compare against original; if equal remove key
      const equal =
        value === original ||
        (value === "" && (original === null || original === undefined));
      if (equal) delete row[key];
      else row[key] = value;
      const next = { ...d };
      if (Object.keys(row).length === 0) delete next[id];
      else next[id] = row;
      return next;
    });
  };

  const saveAll = async () => {
    if (!dirtyIds.length) return;
    setSaving(true);
    try {
      const updates = dirtyIds.map((id) =>
        (supabase as any).from(table).update(draft[id]).eq("id", id)
      );
      const results = await Promise.all(updates);
      const failed = results.filter((r: any) => r.error);
      if (failed.length) {
        toast.error(`${failed.length} of ${dirtyIds.length} updates failed`);
        console.error(failed.map((f: any) => f.error));
      } else {
        toast.success(`Saved ${dirtyIds.length} ${dirtyIds.length === 1 ? "row" : "rows"}`);
        setDraft({});
      }
      qc.invalidateQueries({ queryKey: ["bulk-edit", table] });
      qc.invalidateQueries({ queryKey: [`db-${table}`] });
      qc.invalidateQueries({ queryKey: [`db-${table}-all`] });
    } finally {
      setSaving(false);
    }
  };

  const visibleCols = columns.filter((c) => visible[c.key]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${table}…`}
            className="pl-10 rounded-xl h-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1">
              <Settings2 className="w-3.5 h-3.5" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={!!visible[c.key]}
                onCheckedChange={(v) => setVisible((s) => ({ ...s, [c.key]: !!v }))}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {dirtyIds.length > 0 && (
          <>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {dirtyIds.length} unsaved
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-9 gap-1"
              onClick={() => setDraft({})}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Discard
            </Button>
          </>
        )}
        <Button
          onClick={saveAll}
          disabled={!dirtyIds.length || saving}
          size="sm"
          className="rounded-xl h-9 gap-1"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save All"}
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-auto bg-card max-h-[70vh]">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No rows.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
              <tr>
                {visibleCols.map((c) => (
                  <th
                    key={c.key}
                    className="text-left px-2 py-2 font-medium text-xs text-muted-foreground border-b border-border whitespace-nowrap"
                    style={{ minWidth: c.width || 140 }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const rowDirty = !!draft[r.id];
                return (
                  <tr
                    key={r.id}
                    className={
                      "border-b border-border last:border-b-0 " +
                      (rowDirty ? "bg-amber-50 dark:bg-amber-950/20" : "")
                    }
                  >
                    {visibleCols.map((c) => {
                      const orig = r[c.key];
                      const draftVal = draft[r.id]?.[c.key];
                      const value = draftVal !== undefined ? draftVal : orig;
                      return (
                        <td key={c.key} className="px-2 py-1 align-middle">
                          {c.readOnly ? (
                            <span className="text-xs text-muted-foreground">{String(value ?? "")}</span>
                          ) : c.type === "boolean" ? (
                            <input
                              type="checkbox"
                              checked={!!value}
                              onChange={(e) => setCell(r.id, c.key, e.target.checked, orig)}
                              className="w-4 h-4"
                            />
                          ) : c.type === "select" ? (
                            <select
                              value={value ?? ""}
                              onChange={(e) => setCell(r.id, c.key, e.target.value, orig)}
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm w-full"
                            >
                              <option value="">-</option>
                              {(c.options || []).map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={c.type === "number" ? "number" : "text"}
                              value={value ?? ""}
                              onChange={(e) =>
                                setCell(
                                  r.id,
                                  c.key,
                                  c.type === "number"
                                    ? e.target.value === ""
                                      ? null
                                      : Number(e.target.value)
                                    : e.target.value,
                                  orig
                                )
                              }
                              className="h-8 rounded-md border border-input bg-background px-2 text-sm w-full min-w-[120px]"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} • Edits are batched - click <b>Save All</b> to persist.
      </p>
    </div>
  );
}
