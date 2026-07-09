import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Download, Sparkles, Flame, Snowflake, Activity, GraduationCap } from "lucide-react";

interface ScoreRow {
  id: string;
  subject_type: string;
  subject_id: string;
  score: number;
  category: string;
  top_college_slug: string | null;
  top_course_slug: string | null;
  event_count: number;
  last_event_type: string | null;
  last_event_at: string | null;
  updated_at: string;
}

const CAT_STYLE: Record<string, { label: string; cls: string; icon: any }> = {
  cold:             { label: "Cold",             cls: "bg-slate-100 text-slate-700",  icon: Snowflake },
  warm:             { label: "Warm",             cls: "bg-amber-100 text-amber-800",  icon: Activity },
  hot:              { label: "Hot",              cls: "bg-orange-100 text-orange-800",icon: Flame },
  admission_ready:  { label: "Admission Ready",  cls: "bg-green-100 text-green-800",  icon: GraduationCap },
};

export default function AdminLeadIntelligence() {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [enrich, setEnrich] = useState<Record<string, { name?: string; email?: string; phone?: string; city?: string; state?: string; course?: string; source?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, cold: 0, warm: 0, hot: 0, admission_ready: 0 });
  const [filters, setFilters] = useState({ category: "all", college: "", course: "", state: "", city: "", min: "", max: "", from: "", to: "", q: "" });
  const [selected, setSelected] = useState<ScoreRow | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("intent_lead_scores").select("*").order("score", { ascending: false }).limit(500);
    if (filters.category !== "all") q = q.eq("category", filters.category);
    if (filters.college) q = q.eq("top_college_slug", filters.college);
    if (filters.course)  q = q.eq("top_course_slug",  filters.course);
    if (filters.min)     q = q.gte("score", Number(filters.min));
    if (filters.max)     q = q.lte("score", Number(filters.max));
    if (filters.from)    q = q.gte("updated_at", filters.from);
    if (filters.to)      q = q.lte("updated_at", filters.to);
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    const list = (data as any) || [];
    setRows(list);

    // Enrich with name/email/mobile/state/city/course by joining profiles + leads
    const userIds = list.filter((r: ScoreRow) => r.subject_type === "user").map((r: ScoreRow) => r.subject_id);
    const visitorIds = list.filter((r: ScoreRow) => r.subject_type === "visitor").map((r: ScoreRow) => r.subject_id);
    const map: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,display_name,email,phone,city,state").in("user_id", userIds);
      for (const p of profs || []) {
        map[`user:${p.user_id}`] = { name: p.display_name, email: p.email, phone: p.phone, city: p.city, state: p.state };
      }
      // overlay with latest lead row by phone match (best-effort)
      const { data: ulds } = await supabase.from("leads").select("name,email,phone,city,state,interested_course_slug,source,created_at").in("phone", (profs||[]).map((p:any)=>p.phone).filter(Boolean)).order("created_at",{ascending:false}).limit(500);
      for (const l of ulds || []) {
        const owner = (profs||[]).find((p:any)=> p.phone && p.phone === l.phone);
        if (owner) {
          const k = `user:${owner.user_id}`;
          map[k] = { ...map[k], name: map[k]?.name || l.name, email: map[k]?.email || l.email, city: map[k]?.city || l.city, state: map[k]?.state || l.state, course: l.interested_course_slug, source: l.source };
        }
      }
    }
    if (visitorIds.length) {
      // visitors: try to find a lead via intent_events join (best-effort: latest event with phone via leads)
      for (const vid of visitorIds) map[`visitor:${vid}`] = {};
    }
    setEnrich(map);

    const { data: all } = await supabase.from("intent_lead_scores").select("category");
    const s = { total: 0, cold: 0, warm: 0, hot: 0, admission_ready: 0 };
    for (const r of (all as any[]) || []) {
      s.total++;
      (s as any)[r.category] = ((s as any)[r.category] || 0) + 1;
    }
    setStats(s);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filteredRows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const cityF = filters.city.trim().toLowerCase();
    const stateF = filters.state.trim().toLowerCase();
    return rows.filter((r) => {
      const e = enrich[`${r.subject_type}:${r.subject_id}`] || {};
      if (cityF && !String(e.city || "").toLowerCase().includes(cityF)) return false;
      if (stateF && !String(e.state || "").toLowerCase().includes(stateF)) return false;
      if (q) {
        const hay = [e.name, e.email, e.phone, e.city, e.state, e.course, r.top_college_slug, r.top_course_slug]
          .filter(Boolean).map((v: any) => String(v).toLowerCase());
        if (!hay.some((v) => v.includes(q))) return false;
      }
      return true;
    });
  }, [rows, enrich, filters.q, filters.city, filters.state]);


  const openLead = async (row: ScoreRow) => {
    setSelected(row);
    setPrediction(null);
    const col = row.subject_type === "user" ? "user_id" : "visitor_id";
    const { data } = await supabase.from("intent_events")
      .select("occurred_at,event_type,college_slug,course_slug,page_url")
      .eq(col, row.subject_id)
      .order("occurred_at", { ascending: false })
      .limit(100);
    setTimeline(data || []);
    // Heuristic prediction (instant)
    runPrediction(row.id, "heuristic");
  };

  const runPrediction = async (id: string, mode: "heuristic" | "ai") => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-lead-intent", { body: { lead_score_id: id, mode } });
      if (error) throw error;
      setPrediction(data);
    } catch (e: any) {
      toast({ title: "Prediction failed", description: e?.message, variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  const exportCsv = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intent-export-csv`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ ...filters, format: "csv" }),
      });
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `dekhocampus-leads-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    }
  };

  const statCard = (label: string, value: number, key: keyof typeof CAT_STYLE | "total") => (
    <Card className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => { setFilters(f => ({ ...f, category: key === "total" ? "all" : key })); setTimeout(load, 0); }}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );

  return (
    <AdminLayout title="Lead Intelligence">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Lead Intelligence</h1>
            <p className="text-sm text-muted-foreground">Real-time behavioral scoring across DekhoCampus.</p>
          </div>
          <Button onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {statCard("Total leads", stats.total, "total")}
          {statCard("Cold", stats.cold, "cold")}
          {statCard("Warm", stats.warm, "warm")}
          {statCard("Hot", stats.hot, "hot")}
          {statCard("Admission Ready", stats.admission_ready, "admission_ready")}
        </div>

        <Card className="p-3 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input className="md:col-span-2" placeholder="Search name, email, phone, city…" value={filters.q} onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))} />
            <Select value={filters.category} onValueChange={(v) => setFilters(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="admission_ready">Admission Ready</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="College slug" value={filters.college} onChange={(e) => setFilters(f => ({ ...f, college: e.target.value }))} />
            <Input placeholder="Course slug" value={filters.course} onChange={(e) => setFilters(f => ({ ...f, course: e.target.value }))} />
            <Input placeholder="City" value={filters.city} onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))} />
            <Input placeholder="State" value={filters.state} onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))} />
            <Input placeholder="Min score" type="number" value={filters.min} onChange={(e) => setFilters(f => ({ ...f, min: e.target.value }))} />
            <Input type="date" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} />
            <Input type="date" value={filters.to}   onChange={(e) => setFilters(f => ({ ...f, to:   e.target.value }))} />
          </div>
          <div className="mt-2"><Button size="sm" onClick={load}>Apply filters</Button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">City / State</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Top College</th>
                  <th className="p-3">Events</th>
                  <th className="p-3">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={11} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">No leads match these filters yet.</td></tr>
                )}
                {!loading && filteredRows.map((r) => {
                  const c = CAT_STYLE[r.category] || CAT_STYLE.cold;
                  const Icon = c.icon;
                  const e = enrich[`${r.subject_type}:${r.subject_id}`] || {};
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer odd:bg-muted/10" onClick={() => openLead(r)}>
                      <td className="p-3">
                        <div className="font-medium">{e.name || <span className="text-muted-foreground font-mono text-xs">{r.subject_type}:{r.subject_id.slice(0,8)}</span>}</div>
                      </td>
                      <td className="p-3 font-mono text-xs">{e.phone || "-"}</td>
                      <td className="p-3 text-xs">{e.email || "-"}</td>
                      <td className="p-3 text-xs">{[e.city, e.state].filter(Boolean).join(", ") || "-"}</td>
                      <td className="p-3 text-xs">{e.course || r.top_course_slug || "-"}</td>
                      <td className="p-3 text-xs">{e.source || "-"}</td>
                      <td className="p-3 font-bold">{r.score}</td>
                      <td className="p-3"><Badge className={c.cls}><Icon className="h-3 w-3 mr-1" />{c.label}</Badge></td>
                      <td className="p-3 text-xs">{r.top_college_slug || "-"}</td>
                      <td className="p-3">{r.event_count}</td>
                      <td className="p-3 text-xs text-muted-foreground">{r.last_event_type} · {r.last_event_at ? new Date(r.last_event_at).toLocaleString() : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader><SheetTitle>Lead timeline & prediction</SheetTitle></SheetHeader>
            {selected && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={(CAT_STYLE[selected.category] || CAT_STYLE.cold).cls}>{selected.category}</Badge>
                  <span className="font-bold text-xl">{selected.score}</span>
                  <span className="text-xs text-muted-foreground">/ 150+</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">AI Intent Prediction</h3>
                    <Button size="sm" variant="outline" onClick={() => runPrediction(selected.id, "ai")} disabled={aiLoading}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />{aiLoading ? "…" : "Deep analyze (AI)"}
                    </Button>
                  </div>
                  {prediction ? (
                    <Card className="p-3 text-sm space-y-1">
                      <div>Admission probability: <b>{prediction.admission_probability ?? prediction.heuristic?.admission_probability}%</b></div>
                      <div>Fee sensitivity: <b>{prediction.fee_sensitivity ?? prediction.heuristic?.fee_sensitivity}%</b></div>
                      <div>Scholarship sensitivity: <b>{prediction.scholarship_sensitivity ?? prediction.heuristic?.scholarship_sensitivity}%</b></div>
                      <div>Top colleges: {(prediction.top_colleges ?? prediction.heuristic?.top_colleges ?? []).map((t: any) => `${t.value} (${t.confidence}%)`).join(", ") || "-"}</div>
                      <div>Top courses: {(prediction.top_courses ?? prediction.heuristic?.top_courses ?? []).map((t: any) => `${t.value} (${t.confidence}%)`).join(", ") || "-"}</div>
                      {prediction.ai && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs font-semibold text-primary mb-1">AI analysis</div>
                          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(prediction.ai, null, 2)}</pre>
                        </div>
                      )}
                    </Card>
                  ) : <Skeleton className="h-24" />}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Activity timeline</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {timeline.map((e: any, i: number) => (
                      <div key={i} className="text-sm border-l-2 border-primary/40 pl-3">
                        <div className="font-medium">{e.event_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(e.occurred_at).toLocaleString()}
                          {e.college_slug && <> · {e.college_slug}</>}
                          {e.course_slug && <> · {e.course_slug}</>}
                        </div>
                      </div>
                    ))}
                    {timeline.length === 0 && <p className="text-sm text-muted-foreground">No events captured yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
