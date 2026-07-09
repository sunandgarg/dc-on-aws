import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllTrustedPartners, useUpsertTrustedPartner, useDeleteTrustedPartner, type TrustedPartner } from "@/hooks/useTrustedPartners";
import { Plus, Trash2, Save, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { ImageHint } from "@/components/ImageHint";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
const empty: Partial<TrustedPartner> & { name: string } = {
  name: "", logo_url: "", college_slug: "", display_order: 0, is_active: true,
};

export default function AdminPartners() {
  const { data: partners, isLoading } = useAllTrustedPartners();
  const upsert = useUpsertTrustedPartner();
  const deleteFn = useDeleteTrustedPartner();
  const [editing, setEditing] = useDraftState<(Partial<TrustedPartner> & { name: string }) | null>('admin.partners.editing.v1', null);

  const handleSave = async () => {
    if (!editing?.name) { toast.error("Name is required"); return; }
    try {
      await upsert.mutateAsync(editing);
      toast.success("Partner saved!");
      setEditing(null);
    } catch { toast.error("Failed to save"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this partner?")) return;
    try { await deleteFn.mutateAsync(id); toast.success("Deleted"); } catch { toast.error("Failed"); }
  };

  return (
    <AdminLayout title="Trusted Partners">
      <div className="mb-4">
        <CSVTools table="trusted_partners" filename="trusted_partners.csv" columns="*" upsertKey="id" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Manage the "Partnered with India's top institutions" carousel on the homepage.</p>
        <Button onClick={() => setEditing({ ...empty })} className="gradient-primary text-primary-foreground rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Partner
        </Button>
      </div>

      {editing && (
        <div className="bg-card rounded-2xl border border-border p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-foreground">{editing.id ? "Edit Partner" : "New Partner"}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">College/Institution Name *</label>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="IIT Delhi" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Logo URL</label>
              <Input value={editing.logo_url} onChange={e => setEditing({ ...editing, logo_url: e.target.value })} placeholder="https://..." className="rounded-xl" />
              <ImageHint preset="partnerLogo" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">College Slug (for linking)</label>
              <Input value={editing.college_slug} onChange={e => setEditing({ ...editing, college_slug: e.target.value })} placeholder="iit-delhi" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Order</label>
              <Input type="number" value={editing.display_order} onChange={e => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} className="rounded-xl" />
            </div>
          </div>
          {editing.logo_url && (
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <img src={editing.logo_url} alt="Preview" className="w-12 h-12 rounded-lg object-contain" />
              <span className="text-sm text-foreground">{editing.name}</span>
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

      {isLoading ? (
        <div className="text-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : (partners ?? []).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No Partners Yet</h3>
          <p className="text-sm text-muted-foreground">Add institutions that will display on the homepage carousel</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(partners ?? []).map(p => (
            <div key={p.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} className="w-12 h-12 rounded-lg object-contain flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm truncate">{p.name}</h4>
                <p className="text-xs text-muted-foreground">{p.is_active ? "Active" : "Inactive"} • Order: {p.display_order}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)} className="rounded-lg text-xs h-8 px-2">Edit</Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)} className="rounded-lg text-xs h-8 px-2 text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
