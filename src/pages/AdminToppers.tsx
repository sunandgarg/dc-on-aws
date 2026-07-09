import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Trophy } from "lucide-react";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
type Topper = {
  id?: string;
  class_num: number;
  board_slug: string;
  stream: "Science" | "Commerce" | "Arts";
  year: number;
  rank: number;
  name: string;
  marks: string;
  percentage: number;
  school: string;
  city: string;
  photo: string;
  is_active: boolean;
  display_order: number;
};

const empty = (overrides: Partial<Topper> = {}): Topper => ({
  class_num: 12,
  board_slug: "cbse",
  stream: "Science",
  year: new Date().getFullYear(),
  rank: 1,
  name: "",
  marks: "",
  percentage: 0,
  school: "",
  city: "",
  photo: "",
  is_active: true,
  display_order: 0,
  ...overrides,
});

export default function AdminToppers() {
  const qc = useQueryClient();
  const [classNum, setClassNum] = useState(12);
  const [boardSlug, setBoardSlug] = useState("cbse");

  const { data: boards = [] } = useQuery({
    queryKey: ["admin-study-boards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_boards").select("*").order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-toppers", classNum, boardSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_toppers" as any)
        .select("*")
        .eq("class_num", classNum)
        .eq("board_slug", boardSlug)
        .order("stream")
        .order("rank");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [drafts, setDrafts] = useState<Topper[]>([]);
  useEffect(() => { setDrafts(rows as Topper[]); }, [rows]);

  const update = (i: number, patch: Partial<Topper>) =>
    setDrafts(d => d.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  const add = (stream: Topper["stream"]) =>
    setDrafts(d => [...d, empty({ class_num: classNum, board_slug: boardSlug, stream, rank: d.filter(x => x.stream === stream).length + 1 })]);

  const remove = async (i: number) => {
    const row = drafts[i];
    if (row.id) {
      const { error } = await supabase.from("study_toppers" as any).delete().eq("id", row.id);
      if (error) return toast.error(error.message);
    }
    setDrafts(d => d.filter((_, idx) => idx !== i));
    qc.invalidateQueries({ queryKey: ["study-toppers", classNum, boardSlug] });
  };

  const saveAll = async () => {
    const toUpsert = drafts.filter(d => d.name.trim());
    const { error } = await supabase.from("study_toppers" as any).upsert(toUpsert as any);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${toUpsert.length} toppers`);
    qc.invalidateQueries({ queryKey: ["admin-toppers", classNum, boardSlug] });
    qc.invalidateQueries({ queryKey: ["study-toppers", classNum, boardSlug] });
  };

  const grouped = useMemo(() => ({
    Science: drafts.filter(d => d.stream === "Science"),
    Commerce: drafts.filter(d => d.stream === "Commerce"),
    Arts: drafts.filter(d => d.stream === "Arts"),
  }), [drafts]);

  return (
    <AdminLayout title="Board Toppers">
      <div className="mb-4">
        <CSVTools table="study_toppers" filename="study_toppers.csv" columns="*" upsertKey="id" />
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4 flex items-start gap-2">
        <Trophy className="w-4 h-4 text-amber-600 mt-0.5" />
        <p className="text-sm text-foreground">
          Add Class 10 / 12 toppers per board and stream. They show as a table on{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">/study-material/class-12</code> after a board is selected.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={String(classNum)} onValueChange={(v) => setClassNum(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[8, 9, 10, 11, 12].map(n => <SelectItem key={n} value={String(n)}>Class {n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={boardSlug} onValueChange={setBoardSlug}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {boards.map((b: any) => <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={saveAll} className="ml-auto">
          <Save className="w-4 h-4 mr-1" />Save All
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      ) : (
        (["Science", "Commerce", "Arts"] as const).map(stream => (
          <div key={stream} className="mb-6 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">{stream} Stream</h3>
              <Button size="sm" variant="outline" onClick={() => add(stream)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add Topper
              </Button>
            </div>
            <div className="divide-y divide-border">
              {grouped[stream].length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No toppers yet.</p>
              )}
              {grouped[stream].map((row) => {
                const i = drafts.indexOf(row);
                return (
                  <div key={i} className="p-3 grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
                    <Input className="md:col-span-1" type="number" placeholder="Rank" value={row.rank} onChange={e => update(i, { rank: Number(e.target.value) })} />
                    <Input className="md:col-span-1" type="number" placeholder="Year" value={row.year} onChange={e => update(i, { year: Number(e.target.value) })} />
                    <Input className="md:col-span-2" placeholder="Name" value={row.name} onChange={e => update(i, { name: e.target.value })} />
                    <Input className="md:col-span-2" placeholder="School" value={row.school} onChange={e => update(i, { school: e.target.value })} />
                    <Input className="md:col-span-1" placeholder="City" value={row.city} onChange={e => update(i, { city: e.target.value })} />
                    <Input className="md:col-span-1" placeholder="Marks" value={row.marks} onChange={e => update(i, { marks: e.target.value })} />
                    <Input className="md:col-span-1" type="number" step="0.01" placeholder="%" value={row.percentage} onChange={e => update(i, { percentage: Number(e.target.value) })} />
                    <Input className="md:col-span-2" placeholder="Photo URL" value={row.photo} onChange={e => update(i, { photo: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => remove(i)} className="md:col-span-1 justify-self-end">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </AdminLayout>
  );
}
