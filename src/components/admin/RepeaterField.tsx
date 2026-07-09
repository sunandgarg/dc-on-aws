import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export type RepeaterFieldSpec = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "image";
  placeholder?: string;
  folder?: string;
};

interface Props {
  label: string;
  hint?: string;
  items: any[];
  onChange: (next: any[]) => void;
  fields: RepeaterFieldSpec[];
  defaultItem?: Record<string, any>;
  addLabel?: string;
}

/**
 * Generic repeater for arrays of structured objects.
 * Replaces raw JSON editors so admins can manage mentors / companies /
 * testimonials / hero sections with proper inputs and image upload.
 */
export function RepeaterField({ label, hint, items, onChange, fields, defaultItem, addLabel }: Props) {
  const list = Array.isArray(items) ? items : [];

  const update = (i: number, key: string, val: any) => {
    const next = [...list];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };

  const add = () => {
    const blank = defaultItem || Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? 0 : ""]));
    onChange([...list, blank]);
  };

  const remove = (i: number) => {
    if (!confirm("Remove this item?")) return;
    onChange(list.filter((_, idx) => idx !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <label className="text-xs font-semibold text-foreground">{label}</label>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 gap-1 text-xs">
          <Plus className="w-3 h-3" /> {addLabel || "Add"}
        </Button>
      </div>

      {list.length === 0 && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 text-center">
          No items yet - click <b>Add</b> to create one.
        </p>
      )}

      <div className="space-y-2">
        {list.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">#{i + 1}</span>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === list.length - 1}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => remove(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fields.map((f) => (
                <div key={f.key} className={f.type === "textarea" || f.type === "image" ? "sm:col-span-2" : ""}>
                  <label className="text-[11px] text-muted-foreground">{f.label}</label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      value={item[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => update(i, f.key, e.target.value)}
                    />
                  ) : f.type === "image" ? (
                    <ImageUploadField
                      value={item[f.key] || ""}
                      onChange={(v) => update(i, f.key, v)}
                      folder={f.folder || "promoted-programs"}
                    />
                  ) : f.type === "number" ? (
                    <Input
                      type="number"
                      value={item[f.key] ?? 0}
                      placeholder={f.placeholder}
                      onChange={(e) => update(i, f.key, parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <Input
                      value={item[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => update(i, f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
