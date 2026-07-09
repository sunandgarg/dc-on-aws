import { useDraftState } from "@/hooks/useDraftState";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllHeroBanners, useUpsertHeroBanner, useDeleteHeroBanner, type HeroBanner } from "@/hooks/useHeroBanners";
import { Plus, Trash2, Save, Image } from "lucide-react";
import { toast } from "sonner";
import { ImageHint } from "@/components/ImageHint";

import { CSVTools } from "@/components/CSVTools";
const empty: Partial<HeroBanner> & { image_url: string } = {
  title: "",
  image_url: "",
  link_url: "#",
  cta_text: "Explore Now",
  display_order: 0,
  is_active: true,
};

export default function AdminBanners() {
  const { data: banners, isLoading } = useAllHeroBanners();
  const upsert = useUpsertHeroBanner();
  const deleteBanner = useDeleteHeroBanner();
  const [editing, setEditing] = useDraftState<(Partial<HeroBanner> & { image_url: string }) | null>("admin.banners.editing.v1", null);

  const handleSave = async () => {
    if (!editing?.image_url) {
      toast.error("Image URL is required");
      return;
    }
    try {
      await upsert.mutateAsync(editing);
      toast.success("Banner saved!");
      setEditing(null);
    } catch {
      toast.error("Failed to save banner");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await deleteBanner.mutateAsync(id);
      toast.success("Banner deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AdminLayout title="Hero Banners">
      <div className="mb-4">
        <CSVTools table="hero_banners" filename="hero_banners.csv" columns="*" upsertKey="slug" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Add banner images to the homepage. Users clicking the CTA will be asked for their details first.
        </p>
        <Button onClick={() => setEditing({ ...empty })} className="gradient-primary text-primary-foreground rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Banner
        </Button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-card rounded-2xl border border-border p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-foreground">{editing.id ? "Edit Banner" : "New Banner"}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">College / Banner Title (shown below image, clickable)</label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g., IIT Delhi" className="rounded-xl" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Subtitle (optional, shown under name)</label>
              <Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="e.g., Admissions open for 2026 - apply now" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Image URL *</label>
              <Input value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." className="rounded-xl" />
              <ImageHint preset="heroBanner" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">CTA Button Text</label>
              <Input value={editing.cta_text} onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })} placeholder="Explore Now" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Link URL (redirect after lead form)</label>
              <Input value={editing.link_url} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} placeholder="/colleges/iit-delhi" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Order</label>
              <Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} className="rounded-xl" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="rounded" />
                Active
              </label>
            </div>
          </div>
          {editing.image_url && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img src={editing.image_url} alt="Preview" className="w-full h-40 object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={upsert.isPending} className="gradient-primary text-primary-foreground rounded-xl gap-2">
              <Save className="w-4 h-4" /> {upsert.isPending ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* Banner list */}
      {isLoading ? (
        <div className="text-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : (banners ?? []).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No Banners Yet</h3>
          <p className="text-sm text-muted-foreground">Add banner images that will show on the homepage</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(banners ?? []).map((b) => (
            <div key={b.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <img src={b.image_url} alt={b.title} className="w-full h-36 object-cover" />
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground text-sm truncate">{b.title || "Untitled"}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">CTA: {b.cta_text} → {b.link_url}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(b)} className="rounded-lg flex-1 text-xs">Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(b.id)} className="rounded-lg text-xs text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
