import { PermGate } from "@/components/PermGate";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAllApprovalBodies, useSaveApprovalBody, useDeleteApprovalBody, type ApprovalBody } from "@/hooks/useApprovalBodies";
import { AdminFormSection } from "@/components/AdminFormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { UploadOrUrlField } from "@/components/UploadOrUrlField";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
const empty: Partial<ApprovalBody> = { code: "", name: "", logo_url: "", description: "", display_order: 0, is_active: true };

export default function AdminApprovalBodies() {
  const { data: bodies = [], isLoading } = useAllApprovalBodies();
  const save = useSaveApprovalBody();
  const remove = useDeleteApprovalBody();
  const [editing, setEditing] = useDraftState<Partial<ApprovalBody> | null>('admin.approval-bodies.editing.v1', null);

  const update = (k: string, v: any) => setEditing((p) => p ? { ...p, [k]: v } : p);

  const handleSave = () => {
    if (!editing?.code || !editing?.name) { toast.error("Code and Name required"); return; }
    save.mutate(editing as any, { onSuccess: () => setEditing(null) });
  };

  return (
    <AdminLayout title="Approval Bodies Library">
      <div className="mb-3"><AIGenerateDialog entityType="approval_bodies" table="approval_bodies" upsertKey="code" /></div>
      <div className="mb-4">
        <CSVTools table="approval_bodies" filename="approval_bodies.csv" columns="*" upsertKey="code" />
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Upload each approval/accreditation body's logo once (AICTE, UGC, NAAC, NBA, BCI…). Then in any college's form just tick the bodies that approve it - the logo auto-renders on the public page.
      </p>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setEditing({ ...empty })} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Body
        </Button>
      </div>

      {isLoading ? <p className="text-muted-foreground py-8 text-center">Loading…</p> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {bodies.map((b) => (
            <div key={b.id} className="bg-card rounded-xl border border-border p-3 flex flex-col">
              <div className="bg-muted/30 rounded-lg h-20 flex items-center justify-center mb-2">
                {b.logo_url ? <img src={b.logo_url} alt={b.name} className="max-h-14 max-w-full object-contain" /> : <Award className="w-8 h-8 text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">{b.code}</Badge>
                {!b.is_active && <Badge variant="destructive" className="text-[10px]">Off</Badge>}
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-2">{b.name}</p>
              <div className="flex gap-1 mt-2">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditing({ ...b })}><Pencil className="w-3.5 h-3.5" /></Button>
                <PermGate module="colleges" action="delete">
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => { if (confirm("Delete this body?")) remove.mutate(b.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </PermGate>
              </div>
            </div>
          ))}
          {bodies.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No bodies yet.</p>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Award className="w-5 h-5" /> {editing?.id ? "Edit" : "Add"} Approval Body</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Code *</label><Input value={editing.code || ""} onChange={(e) => update("code", e.target.value.toUpperCase())} placeholder="AICTE" className="rounded-lg h-9 text-sm uppercase" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Display Order</label><Input type="number" value={editing.display_order ?? 0} onChange={(e) => update("display_order", parseInt(e.target.value) || 0)} className="rounded-lg h-9 text-sm" /></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Full Name *</label><Input value={editing.name || ""} onChange={(e) => update("name", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
              <UploadOrUrlField label="Logo (PNG/SVG, transparent bg)" value={editing.logo_url || ""} onChange={(v) => update("logo_url", v)} kind="image" preset="logo" folder="approval-bodies" />
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><Input value={editing.description || ""} onChange={(e) => update("description", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => update("is_active", e.target.checked)} />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
