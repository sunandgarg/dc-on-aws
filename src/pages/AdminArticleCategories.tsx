import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Save, X, Tag } from "lucide-react";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
interface Cat {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export default function AdminArticleCategories() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["article_categories_admin"],
    queryFn: async () =>
      ((await (supabase as any).from("article_categories").select("*").order("display_order")).data ?? []) as Cat[],
  });

  const [editing, setEditing] = useDraftState<Partial<Cat> | null>('admin.article-categories.editing.v1', null);
  const isNew = editing && !editing.id;

  const save = async () => {
    if (!editing?.name || !editing?.slug) return toast.error("Name and slug are required");
    const payload = {
      slug: editing.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name: editing.name.trim(),
      display_order: editing.display_order ?? 0,
      is_active: editing.is_active !== false,
    };
    const { error } = isNew
      ? await (supabase as any).from("article_categories").insert(payload)
      : await (supabase as any).from("article_categories").update(payload).eq("id", editing.id!);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Category added" : "Category updated");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["article_categories_admin"] });
    qc.invalidateQueries({ queryKey: ["article_categories"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await (supabase as any).from("article_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["article_categories_admin"] });
    qc.invalidateQueries({ queryKey: ["article_categories"] });
  };

  return (
    <AdminLayout title="Article Categories">
      <div className="mb-4">
        <CSVTools table="article_categories" filename="article_categories.csv" columns="*" upsertKey="slug" />
      </div>

      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{rows.length} categories - used as the dropdown when authoring articles.</p>
        <Button onClick={() => setEditing({ display_order: rows.length, is_active: true })} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {rows.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border p-3 flex items-center gap-3">
              <Tag className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{c.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{c.slug} · order {c.display_order}{!c.is_active && " · hidden"}</div>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setEditing(c)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => remove(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-xl border p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">{isNew ? "Add" : "Edit"} Category</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Slug *</Label><Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="career-guidance" /></div>
              <div><Label>Display order</Label><Input type="number" value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: +e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}><Save className="w-4 h-4 mr-1" /> Save</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
