import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAllFeaturedColleges } from "@/hooks/useFeaturedColleges";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, X, GripVertical } from "lucide-react";
import { colleges } from "@/data/colleges";
import { collegeCategories, collegeStates } from "@/data/colleges";
import { CSVTools } from "@/components/CSVTools";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FeaturedForm {
  college_slug: string;
  category: string;
  state: string;
  display_order: number;
  is_active: boolean;
}

const emptyForm: FeaturedForm = {
  college_slug: "",
  category: "",
  state: "",
  display_order: 0,
  is_active: true,
};

export default function AdminFeatured() {
  const { data: featured, isLoading } = useAllFeaturedColleges();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FeaturedForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.college_slug) {
      toast({ title: "Select a college", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      const { error } = await supabase.from("featured_colleges").insert({
        college_slug: form.college_slug,
        category: form.category || null,
        state: form.state || null,
        display_order: form.display_order,
        is_active: form.is_active,
      });
      if (error) throw error;
      toast({ title: "Featured college added" });
      queryClient.invalidateQueries({ queryKey: ["admin-featured-colleges"] });
      queryClient.invalidateQueries({ queryKey: ["featured-colleges"] });
      setShowForm(false);
      setForm(emptyForm);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this featured college?")) return;
    const { error } = await supabase.from("featured_colleges").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-featured-colleges"] });
      queryClient.invalidateQueries({ queryKey: ["featured-colleges"] });
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("featured_colleges").update({ is_active: active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-featured-colleges"] });
    queryClient.invalidateQueries({ queryKey: ["featured-colleges"] });
  };

  const getCollegeName = (slug: string) => {
    return colleges.find((c) => c.slug === slug)?.shortName || slug;
  };

  // Filter categories/states without "All"
  const categories = collegeCategories.filter((c) => c !== "All");
  const states = collegeStates.filter((s) => s !== "All");

  return (
    <AdminLayout title="Featured Colleges">
      <div className="mb-4">
        <CSVTools table="featured_colleges" filename="featured_colleges.csv" columns="*" upsertKey="id" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Control which colleges appear first when filtering by category or state.
        Higher display order = shown first. If a category filter is selected and featured colleges exist for it, they'll appear at the top.
      </p>

      <div className="flex justify-end mb-4">
        <Button onClick={() => { setForm(emptyForm); setShowForm(true); }} className="rounded-xl gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Add Featured
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Add Featured College</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">College *</Label>
              <Select value={form.college_slug} onValueChange={(v) => setForm({ ...form, college_slug: v })}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select college" /></SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.shortName} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Category (optional)</Label>
              <Select value={form.category || "__any__"} onValueChange={(v) => setForm({ ...form, category: v === "__any__" ? "" : v })}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Any category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">State (optional)</Label>
              <Select value={form.state || "__any__"} onValueChange={(v) => setForm({ ...form, state: v === "__any__" ? "" : v })}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Any state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any</SelectItem>
                  {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Display Order (higher = first)</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                className="rounded-xl mt-1"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} disabled={saving} className="rounded-xl gradient-primary text-primary-foreground">
              {saving ? "Saving..." : "Add Featured"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground w-8"></th>
                  <th className="text-left p-3 font-medium text-muted-foreground">College</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">State</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {featured?.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground"><GripVertical className="w-4 h-4" /></td>
                    <td className="p-3 font-medium text-foreground">{getCollegeName(f.college_slug)}</td>
                    <td className="p-3">{f.category ? <Badge variant="outline" className="text-xs">{f.category}</Badge> : <span className="text-xs text-muted-foreground">Any</span>}</td>
                    <td className="p-3">{f.state ? <Badge variant="outline" className="text-xs">{f.state}</Badge> : <span className="text-xs text-muted-foreground">Any</span>}</td>
                    <td className="p-3 font-mono text-xs">{f.display_order}</td>
                    <td className="p-3">
                      <Switch checked={f.is_active} onCheckedChange={(v) => handleToggle(f.id, v)} className="scale-75" />
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="w-8 h-8 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!featured || featured.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">No featured colleges. Add some to prioritize them in filters.</div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
