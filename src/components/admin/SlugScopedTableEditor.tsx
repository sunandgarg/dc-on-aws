import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { CSVTools } from "@/components/CSVTools";

export interface SlugFieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "select";
  placeholder?: string;
  options?: string[];
  cols?: 1 | 2 | 3;
}

interface Props {
  table: string;
  scopeColumn: string;
  scopeValue: string;
  fields: SlugFieldDef[];
  defaultValues?: Record<string, any>;
  titleKey: string;
  subtitleKey?: string;
  renderRow?: (row: any) => React.ReactNode;
  emptyMessage?: string;
  orderColumn?: string;
  /** When provided, exposes CSV import/export for this child table scoped to the parent. */
  csvColumns?: string[];
  csvTypeHints?: Record<string, "number" | "boolean" | "array" | "json">;
}

/**
 * Inline editor for child tables scoped to a parent slug.
 * Used inside parent dialogs (e.g. faculty/contact/fees inside the College editor).
 * Rows persist immediately on Save - independent of the parent form save.
 */
export function SlugScopedTableEditor({
  table, scopeColumn, scopeValue, fields, defaultValues = {}, titleKey, subtitleKey, renderRow, emptyMessage, orderColumn, csvColumns, csvTypeHints,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    if (!scopeValue) { setRows([]); return; }
    setLoading(true);
    let q = (supabase as any).from(table).select("*").eq(scopeColumn, scopeValue);
    if (orderColumn) q = q.order(orderColumn, { ascending: true });
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [table, scopeColumn, scopeValue]);

  const save = async () => {
    if (!draft || !scopeValue) return;
    const payload = { ...draft, [scopeColumn]: scopeValue };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { error } = draft.id
      ? await (supabase as any).from(table).update(payload).eq("id", draft.id)
      : await (supabase as any).from(table).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setDraft(null);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); reload(); }
  };

  if (!scopeValue) {
    return <p className="text-xs text-muted-foreground italic">Save the slug first to enable this editor.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{loading ? "Loading…" : `${rows.length} item${rows.length === 1 ? "" : "s"}`}</span>
        {!draft && (
          <Button type="button" size="sm" variant="outline" onClick={() => setDraft({ ...defaultValues })} className="rounded-lg gap-1 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        )}
      </div>

      {csvColumns && (
        <CSVTools
          table={table}
          filename={`${table}-${scopeValue}.csv`}
          columns={csvColumns}
          typeHints={csvTypeHints}
          upsertKey="id"
          onImported={reload}
        />
      )}

      {draft && (
        <div className="bg-muted/40 rounded-xl border border-border p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields.map(f => (
              <div key={f.key} className={`${f.cols === 3 ? "sm:col-span-2" : ""}`}>
                <label className="text-[11px] text-muted-foreground">{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={draft[f.key] ?? ""}
                    onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm"
                  >
                    <option value="">Select</option>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "boolean" ? (
                  <select
                    value={draft[f.key] ? "true" : "false"}
                    onChange={e => setDraft({ ...draft, [f.key]: e.target.value === "true" })}
                    className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={draft[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={e => setDraft({
                      ...draft,
                      [f.key]: f.type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value,
                    })}
                    className="rounded-lg h-9 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)} className="h-8 text-xs gap-1"><X className="w-3 h-3" /> Cancel</Button>
            <Button type="button" size="sm" onClick={save} className="h-8 text-xs gap-1"><Save className="w-3 h-3" /> Save</Button>
          </div>
        </div>
      )}

      {rows.length === 0 && !draft ? (
        <p className="text-xs text-muted-foreground italic">{emptyMessage || "No items yet."}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-card rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                {renderRow ? renderRow(r) : (
                  <>
                    <div className="text-sm font-medium text-foreground truncate">{r[titleKey] || "(untitled)"}</div>
                    {subtitleKey && r[subtitleKey] && <div className="text-[11px] text-muted-foreground truncate">{r[subtitleKey]}</div>}
                  </>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDraft({ ...r })}><Pencil className="w-3 h-3" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
