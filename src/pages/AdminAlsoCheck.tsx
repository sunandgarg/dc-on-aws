import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, GripVertical } from "lucide-react";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";

type Module = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  url: string;
  icon: string | null;
  sort_order: number;
  enabled: boolean;
};

const ICON_HINTS = ["Calendar", "CheckCircle2", "GraduationCap", "BookOpen", "FileText", "Award", "Sparkles", "Target", "TrendingUp", "Compass"];

export default function AdminAlsoCheck() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Partial<Module>>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<Module>>({ key: "", title: "", description: "", url: "", icon: "Sparkles", sort_order: 0, enabled: true });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-also-check"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("also_check_modules").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Module[];
    },
  });

  const updateM = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Module> }) => {
      const { error } = await (supabase as any).from("also_check_modules").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-also-check"] });
      qc.invalidateQueries({ queryKey: ["also-check-modules"] });
      toast.success("Saved");
      setEdits({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createM = useMutation({
    mutationFn: async (row: Partial<Module>) => {
      const { error } = await (supabase as any).from("also_check_modules").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-also-check"] });
      qc.invalidateQueries({ queryKey: ["also-check-modules"] });
      toast.success("Module added");
      setShowAdd(false);
      setNewRow({ key: "", title: "", description: "", url: "", icon: "Sparkles", sort_order: 0, enabled: true });
    },
    onError: (e: Error) => toast.error("Add failed: " + e.message),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("also_check_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-also-check"] });
      qc.invalidateQueries({ queryKey: ["also-check-modules"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getField = (m: Module, k: keyof Module) => edits[m.id]?.[k] ?? m[k];
  const setField = (id: string, k: keyof Module, v: any) => setEdits((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));
  const hasEdit = (id: string) => edits[id] && Object.keys(edits[id]).length > 0;

  return (
    <AdminLayout title="Also Check Modules">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Also Check Modules</h1>
            <p className="text-sm text-muted-foreground mt-1">
              These modules appear in the "Also Check" section at the bottom of every detail page (colleges, courses, exams, articles, careers, scholarships, jobs).
            </p>
          </div>
          <Button onClick={() => setShowAdd((s) => !s)}><Plus className="w-4 h-4 mr-2" />Add Module</Button>
        </div>

        {showAdd && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground">New Module</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Key (unique)</Label><Input value={newRow.key || ""} onChange={(e) => setNewRow({ ...newRow, key: e.target.value })} placeholder="exam_calendar_2026" /></div>
              <div><Label>Title</Label><Input value={newRow.title || ""} onChange={(e) => setNewRow({ ...newRow, title: e.target.value })} placeholder="Exam Calendar 2026" /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={newRow.description || ""} onChange={(e) => setNewRow({ ...newRow, description: e.target.value })} rows={2} /></div>
              <div className="md:col-span-2"><Label>URL (internal /path or external https://)</Label><Input value={newRow.url || ""} onChange={(e) => setNewRow({ ...newRow, url: e.target.value })} placeholder="/exam-calendar-2026" /></div>
              <div><Label>Icon (lucide name)</Label><Input value={newRow.icon || ""} onChange={(e) => setNewRow({ ...newRow, icon: e.target.value })} placeholder="Calendar" list="icon-hints" /></div>
              <div><Label>Sort Order</Label><Input type="number" value={newRow.sort_order ?? 0} onChange={(e) => setNewRow({ ...newRow, sort_order: parseInt(e.target.value || "0") })} /></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={!!newRow.enabled} onCheckedChange={(v) => setNewRow({ ...newRow, enabled: v })} /><span className="text-sm">Enabled</span></div>
            <div className="flex gap-2">
              <Button onClick={() => createM.mutate(newRow)} disabled={!newRow.key || !newRow.title || !newRow.url || createM.isPending}>
                {createM.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Add
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <datalist id="icon-hints">{ICON_HINTS.map((i) => <option key={i} value={i} />)}</datalist>

        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {rows.map((m) => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-2" />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Key</Label><Input value={getField(m, "key") as string} onChange={(e) => setField(m.id, "key", e.target.value)} /></div>
                    <div><Label className="text-xs">Title</Label><Input value={getField(m, "title") as string} onChange={(e) => setField(m.id, "title", e.target.value)} /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={2} value={(getField(m, "description") as string) || ""} onChange={(e) => setField(m.id, "description", e.target.value)} /></div>
                    <div className="md:col-span-2"><Label className="text-xs">URL</Label><Input value={getField(m, "url") as string} onChange={(e) => setField(m.id, "url", e.target.value)} /></div>
                    <div><Label className="text-xs">Icon</Label><Input value={(getField(m, "icon") as string) || ""} onChange={(e) => setField(m.id, "icon", e.target.value)} list="icon-hints" /></div>
                    <div><Label className="text-xs">Sort Order</Label><Input type="number" value={(getField(m, "sort_order") as number) ?? 0} onChange={(e) => setField(m.id, "sort_order", parseInt(e.target.value || "0"))} /></div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!getField(m, "enabled")} onCheckedChange={(v) => { setField(m.id, "enabled", v); updateM.mutate({ id: m.id, updates: { enabled: v } }); }} />
                    <span className="text-sm">{getField(m, "enabled") ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={!hasEdit(m.id) || updateM.isPending} onClick={() => updateM.mutate({ id: m.id, updates: edits[m.id] })}>
                      <Save className="w-4 h-4 mr-1" />Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this module?")) deleteM.mutate(m.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!rows.length && <div className="text-center text-muted-foreground p-8">No modules yet. Add one above.</div>}
          </div>
        )}

        <div className="pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Live Preview (as shown on detail pages)</h3>
          <AlsoCheckSection />
        </div>
      </div>
    </AdminLayout>
  );
}
