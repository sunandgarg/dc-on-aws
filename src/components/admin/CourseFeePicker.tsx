import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { CSVTools } from "@/components/CSVTools";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  collegeSlug: string;
}

interface CourseLite { slug: string; name: string; full_name: string; category: string; }
interface FeeRow { id?: string; college_slug: string; course_slug: string; course_name: string; fee_amount: number; fee_type: string; year: string; }

const FEE_TYPES = ["Annual", "Semester", "Total Course", "Monthly"];

export function CourseFeePicker({ collegeSlug }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<FeeRow | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    if (!collegeSlug) return;
    setLoading(true);
    const { data } = await (supabase as any).from("course_fees").select("*").eq("college_slug", collegeSlug).order("course_name");
    setRows(data || []);
    setLoading(false);
    qc.invalidateQueries({ queryKey: ["college_fees", collegeSlug] });
  };

  useEffect(() => { reload(); }, [collegeSlug]);

  useEffect(() => {
    (supabase as any).from("courses").select("slug,name,full_name,category").eq("is_active", true).order("name").limit(500).then(({ data }: any) => setCourses(data || []));
  }, []);

  const matches = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    const used = new Set(rows.map(r => r.course_slug));
    return courses
      .filter(c => !used.has(c.slug))
      .filter(c => c.name.toLowerCase().includes(q) || c.full_name.toLowerCase().includes(q) || c.slug.includes(q))
      .slice(0, 8);
  }, [search, courses, rows]);

  const addFromCourse = (c: CourseLite) => {
    setSearch("");
    setDraft({ college_slug: collegeSlug, course_slug: c.slug, course_name: c.name, fee_amount: 0, fee_type: "Annual", year: String(new Date().getFullYear()) });
  };

  const addManual = () => {
    setSearch("");
    setDraft({ college_slug: collegeSlug, course_slug: "", course_name: "", fee_amount: 0, fee_type: "Annual", year: String(new Date().getFullYear()) });
  };

  const validate = (d: FeeRow): string | null => {
    if (!d.course_name?.trim()) return "Course name is required";
    if (!d.fee_type) return "Fee type is required";
    if (d.fee_amount === null || d.fee_amount === undefined || isNaN(Number(d.fee_amount))) return "Fee amount must be a number";
    if (Number(d.fee_amount) < 0) return "Fee amount cannot be negative";
    if (Number(d.fee_amount) > 100000000) return "Fee amount looks too large (max ₹10 Cr)";
    if (d.year && !/^\d{4}$/.test(d.year)) return "Year must be a 4-digit value";
    const slug = d.course_slug || d.course_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const dup = rows.find(r => r.id !== d.id && r.course_slug === slug && (r.year || "") === (d.year || "") && (r.fee_type || "") === (d.fee_type || ""));
    if (dup) return `Duplicate: a ${d.fee_type} fee for "${d.course_name}" (${d.year || "any year"}) already exists`;
    return null;
  };

  const save = async () => {
    if (!draft) return;
    const err = validate(draft);
    if (err) { toast.error(err); return; }
    if (!draft.course_slug) draft.course_slug = draft.course_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload: any = { ...draft, fee_amount: Number(draft.fee_amount) };
    const { error } = draft.id
      ? await (supabase as any).from("course_fees").update(payload).eq("id", draft.id)
      : await (supabase as any).from("course_fees").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setDraft(null);
    reload();
  };

  const remove = async (id?: string) => {
    if (!id || !confirm("Delete this fee row?")) return;
    const { error } = await (supabase as any).from("course_fees").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  if (!collegeSlug) return <p className="text-xs text-muted-foreground italic">Save the college slug first to add course fees.</p>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search course directory (e.g. B.Tech, MBA)…"
          className="rounded-lg pl-10 h-9 text-sm"
        />
        {matches.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matches.map(c => (
              <button
                type="button"
                key={c.slug}
                onClick={() => addFromCourse(c)}
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
              >
                <span><span className="font-medium">{c.name}</span> <span className="text-xs text-muted-foreground">{c.full_name || c.slug}</span></span>
                <span className="text-[10px] text-muted-foreground">{c.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{loading ? "Loading…" : `${rows.length} fee${rows.length === 1 ? "" : "s"} added`}</span>
        <Button type="button" size="sm" variant="outline" onClick={addManual} className="rounded-lg gap-1 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add manual
        </Button>
      </div>

      <CSVTools
        table="course_fees"
        filename={`course-fees-${collegeSlug}.csv`}
        columns={["college_slug","course_slug","course_name","fee_amount","fee_type","year"]}
        typeHints={{ fee_amount: "number" }}
        upsertKey="id"
        onImported={reload}
      />

      {draft && (
        <div className="bg-muted/40 rounded-xl border border-border p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Course Name *</label>
              <Input value={draft.course_name} onChange={e => setDraft({ ...draft, course_name: e.target.value })} className="rounded-lg h-9 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Course Slug</label>
              <Input value={draft.course_slug} onChange={e => setDraft({ ...draft, course_slug: e.target.value })} placeholder="auto-generated" className="rounded-lg h-9 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Fee Amount (₹) *</label>
              <Input type="number" min={0} step="1" value={draft.fee_amount} onChange={e => setDraft({ ...draft, fee_amount: parseFloat(e.target.value) || 0 })} className="rounded-lg h-9 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Fee Type *</label>
              <select value={draft.fee_type} onChange={e => setDraft({ ...draft, fee_type: e.target.value })} className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm">
                {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Year (YYYY)</label>
              <Input value={draft.year} onChange={e => setDraft({ ...draft, year: e.target.value })} placeholder={String(new Date().getFullYear())} maxLength={4} className="rounded-lg h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)} className="h-8 text-xs gap-1"><X className="w-3 h-3" /> Cancel</Button>
            <Button type="button" size="sm" onClick={save} className="h-8 text-xs gap-1"><Save className="w-3 h-3" /> Save</Button>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-card rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{r.course_name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  ₹{Number(r.fee_amount).toLocaleString("en-IN")} · {r.fee_type} · {r.year || "-"}
                </div>
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDraft({ ...r })}><Save className="w-3 h-3 rotate-180" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
