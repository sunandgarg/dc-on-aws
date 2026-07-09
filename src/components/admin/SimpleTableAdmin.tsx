import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AuthorPicker } from "@/components/admin/AuthorPicker";
import { ComboboxAdd } from "@/components/admin/ComboboxAdd";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { OpenOnSiteButton } from "@/components/admin/OpenOnSiteButton";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { CSVTools } from "@/components/CSVTools";
import { RowDataIO } from "@/components/admin/RowDataIO";

export type FieldType = "text" | "number" | "textarea" | "boolean" | "author" | "combobox" | "image";
export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  /** Options for `combobox` field type. Free text is always allowed. */
  options?: string[];
}

interface Props {
  table: string;
  fields: FieldDef[];
  titleKey?: string;
  subtitleKey?: string;
  defaultValues?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  /** If set, each row shows a "Preview" button linking to `${previewBasePath}/${row[previewSlugKey]}${previewSuffix}`. */
  previewBasePath?: string;
  previewSlugKey?: string;
  previewSuffix?: string;
  /** When set, shows the universal CSV/JSON import/export toolbar and per-row export.
   *  Pass an explicit column list, or "*" (default) to auto-discover every column. */
  ioColumns?: string[] | "*";
  ioTypeHints?: Record<string, "number" | "boolean" | "array" | "json">;
  ioBaseName?: string;
}

export function SimpleTableAdmin({ table, fields, titleKey = "name", subtitleKey, defaultValues = {}, orderBy, previewBasePath, previewSlugKey = "slug", previewSuffix = "", ioColumns = "*", ioTypeHints = {}, ioBaseName }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from(table).select("*");
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data, error } = await q;
    if (error) toast.error(error.message); else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [table]);

  const save = async () => {
    if (!editing) return;
    for (const f of fields) {
      if (f.required && !editing[f.key]) {
        toast.error(`${f.label} is required`); return;
      }
    }
    const payload: any = { ...editing };
    Object.keys(payload).forEach(k => {
      if (payload[k] === "") payload[k] = null;
    });
    const { error } = editing.id
      ? await (supabase as any).from(table).update(payload).eq("id", editing.id)
      : await (supabase as any).from(table).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div>
      {ioColumns && ioColumns.length > 0 && (
        <div className="mb-3">
          <CSVTools
            table={table}
            filename={`${ioBaseName || table}.csv`}
            columns={ioColumns}
            typeHints={ioTypeHints}
            onImported={load}
          />
        </div>
      )}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setEditing({ ...defaultValues })} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add New
        </Button>
      </div>

      {editing && (
        <div className="bg-card rounded-2xl border border-border p-5 mb-6 space-y-3">
          <h3 className="font-semibold">{editing.id ? "Edit" : "New"}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {f.label}{f.required && " *"}
                </label>
                {f.type === "textarea" ? (
                  <RichTextEditor
                    bare
                    value={editing[f.key] ?? ""}
                    onChange={(v) => setEditing({ ...editing, [f.key]: v })}
                    placeholder={f.placeholder}
                    rows={4}
                  />
                ) : f.type === "boolean" ? (
                  <select
                    value={editing[f.key] ? "true" : "false"}
                    onChange={e => setEditing({ ...editing, [f.key]: e.target.value === "true" })}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : f.type === "author" ? (
                  <AuthorPicker value={editing[f.key]} onChange={(v) => setEditing({ ...editing, [f.key]: v })} />
                ) : f.type === "combobox" ? (
                  <ComboboxAdd
                    value={editing[f.key] ?? ""}
                    onChange={(v) => setEditing({ ...editing, [f.key]: v })}
                    options={f.options || []}
                    placeholder={f.placeholder || "Search or type to add…"}
                  />
                ) : f.type === "image" ? (
                  <ImageUploadField
                    value={editing[f.key] ?? ""}
                    onChange={(v) => setEditing({ ...editing, [f.key]: v })}
                  />
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={editing[f.key] ?? ""}
                    onChange={e => setEditing({ ...editing, [f.key]: f.type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value })}
                    placeholder={f.placeholder}
                    className="rounded-xl"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="rounded-xl gap-2"><Save className="w-4 h-4" /> Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border text-muted-foreground">No records yet</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(r => (
            <div key={r.id} className="bg-card rounded-2xl border border-border p-4">
              <div className="font-semibold text-foreground">{r[titleKey] || "(untitled)"}</div>
              {subtitleKey && <div className="text-xs text-muted-foreground mt-1">{r[subtitleKey]}</div>}
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)} className="rounded-lg text-xs">Edit</Button>
                {previewBasePath && r[previewSlugKey] && (
                  <OpenOnSiteButton href={`${previewBasePath}/${r[previewSlugKey]}${previewSuffix}`} label="Preview" size="sm" variant="outline" />
                )}
                {ioColumns && ioColumns.length > 0 && (
                  <RowDataIO row={r} base={ioBaseName || table} columns={ioColumns} size="sm" />
                )}
                <Button size="sm" variant="outline" onClick={() => remove(r.id)} className="rounded-lg text-xs text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
