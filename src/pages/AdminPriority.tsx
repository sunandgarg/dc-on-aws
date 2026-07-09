import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, FileText, Search, Save, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/PriorityBadge";

type Entity = "colleges" | "courses" | "exams";

const TABS: { value: Entity; label: string; icon: any }[] = [
  { value: "colleges", label: "Colleges", icon: GraduationCap },
  { value: "courses", label: "Courses", icon: BookOpen },
  { value: "exams", label: "Exams", icon: FileText },
];

export default function AdminPriority() {
  return (
    <AdminLayout title="Listing Priority">
      <div className="mb-4 bg-primary/5 border border-primary/20 rounded-2xl p-4">
        <p className="text-sm text-foreground">
          <Crown className="w-4 h-4 inline text-amber-600 mr-1" />
          Set a priority from <b>1 (top of every list)</b> upward - lower number = higher rank, like a leaderboard.
          Default is <b>50</b>. Items with priority <b>1–10</b> show a <b>Featured</b> badge in listings; <b>1–3</b> shows a <b>Top Pick</b> badge.
          Sorting in /colleges, /courses, /exams updates instantly.
        </p>
      </div>
      <Tabs defaultValue="colleges">
        <TabsList className="mb-4">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.icon className="w-3.5 h-3.5 mr-1" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(t => (
          <TabsContent key={t.value} value={t.value}>
            <PriorityTable entity={t.value} />
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
}

function PriorityTable({ entity }: { entity: Entity }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, number>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-priority", entity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(entity)
        .select("id, name, slug, priority, category, city, state, image, logo")
        .order("priority", { ascending: true, nullsFirst: false })
        .order("name")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return rows;
    return rows.filter((r: any) =>
      [r.name, r.slug, r.category, r.city, r.state]
        .filter(Boolean)
        .some((s: string) => s.toLowerCase().includes(ql))
    );
  }, [rows, q]);

  const dirtyIds = useMemo(
    () => Object.keys(draft).filter((id) => {
      const row: any = (rows as any[]).find((r: any) => r.id === id);
      return row && draft[id] !== row.priority;
    }),
    [draft, rows]
  );

  const invalidateListings = () => {
    qc.invalidateQueries({ queryKey: ["admin-priority", entity] });
    qc.invalidateQueries({ queryKey: ["db-colleges"] });
    qc.invalidateQueries({ queryKey: ["db-colleges-all"] });
    qc.invalidateQueries({ queryKey: ["db-courses"] });
    qc.invalidateQueries({ queryKey: ["db-courses-all"] });
    qc.invalidateQueries({ queryKey: ["db-exams"] });
    qc.invalidateQueries({ queryKey: ["db-exams-all"] });
  };

  const save = async (id: string) => {
    const value = draft[id];
    if (value === undefined) return;
    const safe = Math.max(1, Math.min(100, Math.round(value)));
    const { error } = await supabase.from(entity).update({ priority: safe }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Priority set to ${safe}`);
    setDraft(d => { const { [id]: _, ...rest } = d; return rest; });
    invalidateListings();
  };

  const saveAll = async () => {
    if (!dirtyIds.length) return;
    const updates = dirtyIds.map((id) => {
      const safe = Math.max(1, Math.min(100, Math.round(draft[id])));
      return supabase.from(entity).update({ priority: safe }).eq("id", id);
    });
    const results = await Promise.all(updates);
    const failed = results.filter((r) => r.error);
    if (failed.length) {
      toast.error(`${failed.length} of ${dirtyIds.length} updates failed`);
    } else {
      toast.success(`Saved priority for ${dirtyIds.length} ${entity}`);
      setDraft({});
    }
    invalidateListings();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Search ${entity}...`}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          {dirtyIds.length > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {dirtyIds.length} unsaved {dirtyIds.length === 1 ? "change" : "changes"}
            </span>
          )}
          <Button
            onClick={saveAll}
            disabled={!dirtyIds.length}
            className="rounded-lg h-9"
          >
            <Save className="w-3.5 h-3.5 mr-1" />Save All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r: any) => {
            const current = draft[r.id] ?? r.priority ?? 50;
            const dirty = draft[r.id] !== undefined && draft[r.id] !== r.priority;
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-xl p-3 grid grid-cols-1 md:grid-cols-12 items-center gap-3"
              >
                <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                  {(r.image || r.logo) && (
                    <img
                      src={r.image || r.logo}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground line-clamp-1">{r.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {[r.category, r.city, r.state].filter(Boolean).join(" · ") || r.slug}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-5 flex items-center gap-3">
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[current]}
                    onValueChange={(v) => setDraft(d => ({ ...d, [r.id]: v[0] }))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={current}
                    onChange={(e) => setDraft(d => ({ ...d, [r.id]: Number(e.target.value) }))}
                    className="w-20 h-9 rounded-lg text-center"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <PriorityBadge priority={current} />
                  <Button
                    size="sm"
                    onClick={() => save(r.id)}
                    disabled={!dirty}
                    className="rounded-lg h-9"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />Save
                  </Button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">
              No {entity} found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
