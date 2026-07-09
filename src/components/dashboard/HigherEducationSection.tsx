import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, GraduationCap, Save } from "lucide-react";
import { toast } from "sonner";

type Level = "graduation" | "master" | "phd" | "diploma";

interface Entry {
  id?: string;
  user_id?: string;
  level: Level;
  degree?: string;
  specialization?: string;
  institution?: string;
  board_university?: string;
  start_year?: string;
  end_year?: string;
  marks_type?: string;
  percentage_cgpa?: string;
  status?: string;
}

const LEVEL_META: Record<Level, { title: string; addLabel: string; degreePlaceholder: string }> = {
  graduation: { title: "Graduation", addLabel: "Add another graduation", degreePlaceholder: "e.g. B.Tech, B.Sc, B.Com" },
  master:     { title: "Master's",   addLabel: "Add another master's",   degreePlaceholder: "e.g. M.Tech, MBA, M.Sc" },
  phd:        { title: "PhD / Doctorate", addLabel: "Add another PhD",   degreePlaceholder: "e.g. PhD in Physics" },
  diploma:    { title: "Diploma",    addLabel: "Add another diploma",    degreePlaceholder: "e.g. Diploma in Engineering" },
};

function EntryCard({ entry, onChange, onSave, onDelete, saving, deleting }: {
  entry: Entry;
  onChange: (patch: Partial<Entry>) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Degree / Course</Label>
          <Input value={entry.degree || ""} onChange={(e) => onChange({ degree: e.target.value })}
            placeholder={LEVEL_META[entry.level].degreePlaceholder} className="h-9 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs">Specialization</Label>
          <Input value={entry.specialization || ""} onChange={(e) => onChange({ specialization: e.target.value })}
            placeholder="e.g. Computer Science" className="h-9 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs">University / Board</Label>
          <Input value={entry.board_university || ""} onChange={(e) => onChange({ board_university: e.target.value })}
            className="h-9 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs">Institution / College</Label>
          <Input value={entry.institution || ""} onChange={(e) => onChange({ institution: e.target.value })}
            className="h-9 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs">Start Year</Label>
          <Input value={entry.start_year || ""} onChange={(e) => onChange({ start_year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="YYYY" className="h-9 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs">End Year</Label>
          <Input value={entry.end_year || ""} onChange={(e) => onChange({ end_year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="YYYY (or expected)" className="h-9 rounded-lg" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={entry.status || ""} onValueChange={(v) => onChange({ status: v })}>
            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Appearing">Appearing</SelectItem>
              <SelectItem value="Pursuing">Pursuing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Marks Type</Label>
          <Select value={entry.marks_type || ""} onValueChange={(v) => onChange({ marks_type: v })}>
            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Percentage">Percentage</SelectItem>
              <SelectItem value="CGPA">CGPA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Percentage / CGPA</Label>
          <Input value={entry.percentage_cgpa || ""} onChange={(e) => onChange({ percentage_cgpa: e.target.value })}
            className="h-9 rounded-lg" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Button size="sm" variant="ghost" onClick={onDelete} disabled={deleting} className="text-destructive hover:text-destructive h-8">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-1" /> Remove</>}
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving} className="h-8 rounded-lg">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" /> Save</>}
        </Button>
      </div>
    </div>
  );
}

function LevelBlock({ level }: { level: Level }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const meta = LEVEL_META[level];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["edu-entries", user?.id, level],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_education_entries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("level", level)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Entry[];
    },
  });

  const [drafts, setDrafts] = useState<Record<string, Entry>>({});
  const [newDrafts, setNewDrafts] = useState<Entry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getDraft = (e: Entry) => drafts[e.id!] ?? e;

  const patchSaved = (id: string, patch: Partial<Entry>) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? entries.find((x) => x.id === id)!), ...patch } }));

  const patchNew = (idx: number, patch: Partial<Entry>) =>
    setNewDrafts((arr) => arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const saveMutation = useMutation({
    mutationFn: async (e: Entry) => {
      const payload = { ...e, user_id: user!.id, level };
      if (e.id) {
        const { error } = await (supabase as any).from("user_education_entries").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("user_education_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edu-entries", user?.id, level] });
      toast.success(`${meta.title} saved`);
    },
    onError: (e: any) => toast.error(e?.message || "Could not save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("user_education_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edu-entries", user?.id, level] });
      toast.success("Removed");
    },
  });

  const addNew = () => setNewDrafts((arr) => [...arr, { level }]);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" /> {meta.title}
        </h3>
        <Button size="sm" variant="outline" onClick={addNew} className="rounded-lg h-8">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-3">
          {entries.length === 0 && newDrafts.length === 0 && (
            <p className="text-sm text-muted-foreground">No {meta.title.toLowerCase()} added yet. Click <span className="font-medium">Add</span> to include one.</p>
          )}

          {entries.map((e) => {
            const d = getDraft(e);
            return (
              <EntryCard
                key={e.id}
                entry={d}
                saving={saveMutation.isPending && busyId === e.id}
                deleting={deleteMutation.isPending && deletingId === e.id}
                onChange={(p) => patchSaved(e.id!, p)}
                onSave={() => { setBusyId(e.id!); saveMutation.mutate(d, { onSettled: () => setBusyId(null) }); }}
                onDelete={() => { setDeletingId(e.id!); deleteMutation.mutate(e.id!, { onSettled: () => setDeletingId(null) }); }}
              />
            );
          })}

          {newDrafts.map((e, idx) => (
            <EntryCard
              key={`new-${idx}`}
              entry={e}
              saving={saveMutation.isPending && busyId === `new-${idx}`}
              deleting={false}
              onChange={(p) => patchNew(idx, p)}
              onSave={() => {
                setBusyId(`new-${idx}`);
                saveMutation.mutate(e, {
                  onSuccess: () => setNewDrafts((arr) => arr.filter((_, i) => i !== idx)),
                  onSettled: () => setBusyId(null),
                });
              }}
              onDelete={() => setNewDrafts((arr) => arr.filter((_, i) => i !== idx))}
            />
          ))}

          {(entries.length > 0 || newDrafts.length > 0) && (
            <button type="button" onClick={addNew} className="text-xs text-primary font-medium inline-flex items-center gap-1 mt-1">
              <Plus className="w-3.5 h-3.5" /> {meta.addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HigherEducationSection() {
  return (
    <div className="space-y-6">
      <LevelBlock level="graduation" />
      <LevelBlock level="diploma" />
      <LevelBlock level="master" />
      <LevelBlock level="phd" />
    </div>
  );
}
