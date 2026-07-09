import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Save, X, Layers } from "lucide-react";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
interface Cat {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  display_order: number;
  is_active: boolean;
}

export default function AdminCategories() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["stream_categories_admin"],
    queryFn: async () => (await (supabase as any).from("stream_categories").select("*").order("display_order")).data ?? [],
  });

  const [editing, setEditing] = useDraftState<Partial<Cat> | null>('admin.categories.editing.v1', null);
  const isNew = editing && !editing.id;

  const save = async () => {
    if (!editing?.label || !editing?.slug) return toast.error("Label and slug are required");
    const payload = {
      slug: editing.slug.trim(),
      label: editing.label.trim(),
      emoji: editing.emoji?.trim() || "📚",
      display_order: editing.display_order ?? 0,
      is_active: editing.is_active !== false,
    };
    const { error } = isNew
      ? await (supabase as any).from("stream_categories").insert(payload)
      : await (supabase as any).from("stream_categories").update(payload).eq("id", editing.id!);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Category added" : "Category updated");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["stream_categories_admin"] });
    qc.invalidateQueries({ queryKey: ["stream_categories"] });
    qc.invalidateQueries({ queryKey: ["stream_categories_active"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category? Items tagged with this stream will keep the value as text but it won't be selectable in admin.")) return;
    const { error } = await (supabase as any).from("stream_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["stream_categories_admin"] });
    qc.invalidateQueries({ queryKey: ["stream_categories"] });
  };

  return (
    <AdminLayout title="Stream Categories">
      <div className="mb-4">
        <CSVTools table="stream_categories" filename="stream_categories.csv" columns="*" upsertKey="slug" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Master list of stream categories used across the homepage, header mega-menu and admin pickers.</p>
        <Button onClick={() => setEditing({ slug: "", label: "", emoji: "📚", display_order: (rows[rows.length - 1]?.display_order || 0) + 10, is_active: true })} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-2">
          {rows.map((r: Cat) => (
            <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-2xl">{r.emoji}</span>
                <div>
                  <p className="font-semibold text-foreground text-sm">{r.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.slug} · order {r.display_order} · {r.is_active ? "active" : "hidden"}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-2xl p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">{isNew ? "New Category" : "Edit Category"}</h3>
              <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Label</label>
              <Input value={editing.label || ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Engineering" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Slug (used in URLs / DB filter)</label>
              <Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="Engineering" className="font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Emoji</label>
                <Input value={editing.emoji || ""} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} placeholder="⚡" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Display Order</label>
                <Input type="number" value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
              <span className="text-sm">Active (visible on site)</span>
              <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
            </div>
            <Button onClick={save} className="w-full gap-2"><Save className="w-4 h-4" /> Save</Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
