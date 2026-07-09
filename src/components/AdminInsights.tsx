import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, GraduationCap, FileText, BookOpen, Briefcase, Activity, Megaphone, Globe } from "lucide-react";

interface Stat { label: string; value: number; icon: any; color: string; }

function CountCard({ label, value, icon: Icon, color }: Stat) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

const RANGES = [
  { key: "7", label: "7d" },
  { key: "15", label: "15d" },
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
  { key: "all", label: "All" },
  { key: "custom", label: "Custom" },
];

function useCount(table: string) {
  return useQuery({
    queryKey: [`count-${table}`],
    queryFn: async () => {
      const { count } = await supabase.from(table as any).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

export function AdminInsights() {
  const [range, setRange] = useState<string>("30");
  const [customFrom, setCustomFrom] = useState<string>(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const { days, since } = useMemo(() => {
    if (range === "all") {
      return { days: 365 * 3, since: new Date("2020-01-01").toISOString() };
    }
    if (range === "custom") {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      const d = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
      return { days: d, since: from.toISOString() };
    }
    const d = parseInt(range, 10);
    return { days: d, since: new Date(Date.now() - d * 86400000).toISOString() };
  }, [range, customFrom, customTo]);

  const colleges = useCount("colleges");
  const courses = useCount("courses");
  const exams = useCount("exams");
  const articles = useCount("articles");
  const careers = useCount("career_profiles");

  const leadsRange = useQuery({
    queryKey: ["leads-range", range, since],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("created_at,source").gte("created_at", since).limit(5000);
      return data || [];
    },
  });
  const lpLeads = useQuery({
    queryKey: ["lp-leads-range", range, since],
    queryFn: async () => {
      const { data } = await (supabase as any).from("landing_page_leads").select("created_at,landing_slug").gte("created_at", since).limit(5000);
      return data || [];
    },
  });
  const apps = useQuery({
    queryKey: ["apps-range", range, since],
    queryFn: async () => {
      const { data } = await supabase.from("college_applications").select("created_at,status").gte("created_at", since).limit(5000);
      return data || [];
    },
  });
  const signups = useQuery({
    queryKey: ["signups-range", range, since],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("created_at").gte("created_at", since).limit(5000);
      return data || [];
    },
  });
  const referrals = useQuery({
    queryKey: ["referrals-range", range, since],
    queryFn: async () => {
      const { data } = await (supabase as any).from("referrals").select("created_at,status").gte("created_at", since).limit(5000);
      return data || [];
    },
  });

  // Build daily series (cap visualization at 90 days for readability)
  const series = useMemo(() => {
    const visDays = Math.min(days, 90);
    const out: { day: string; leads: number; lp: number; apps: number; signups: number; refs: number }[] = [];
    for (let i = visDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key, leads: 0, lp: 0, apps: 0, signups: 0, refs: 0 });
    }
    const idx: Record<string, number> = {};
    out.forEach((r, i) => (idx[r.day] = i));
    (leadsRange.data || []).forEach((r: any) => { const k = r.created_at?.slice(0, 10); if (idx[k] != null) out[idx[k]].leads++; });
    (lpLeads.data || []).forEach((r: any) => { const k = r.created_at?.slice(0, 10); if (idx[k] != null) out[idx[k]].lp++; });
    (apps.data || []).forEach((r: any) => { const k = r.created_at?.slice(0, 10); if (idx[k] != null) out[idx[k]].apps++; });
    (signups.data || []).forEach((r: any) => { const k = r.created_at?.slice(0, 10); if (idx[k] != null) out[idx[k]].signups++; });
    (referrals.data || []).forEach((r: any) => { const k = r.created_at?.slice(0, 10); if (idx[k] != null) out[idx[k]].refs++; });
    return out;
  }, [leadsRange.data, lpLeads.data, apps.data, signups.data, referrals.data, days]);

  const max = Math.max(1, ...series.map((s) => s.leads + s.lp + s.apps + s.signups + s.refs));
  const totalLeads = leadsRange.data?.length ?? 0;
  const totalLp = lpLeads.data?.length ?? 0;
  const totalApps = apps.data?.length ?? 0;
  const totalSignups = signups.data?.length ?? 0;
  const totalRefs = referrals.data?.length ?? 0;

  const leadsBySource = useMemo(() => {
    const m: Record<string, number> = {};
    (leadsRange.data || []).forEach((r: any) => { m[r.source || "unknown"] = (m[r.source || "unknown"] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [leadsRange.data]);
  const lpMax = Math.max(1, ...leadsBySource.map(([, v]) => v));

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5"><Activity className="w-4 h-4" />Content Library</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-muted rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)} className={`px-3 py-1 text-xs rounded-md transition ${range === r.key ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}>{r.label}</button>
            ))}
          </div>
          {range === "custom" && (
            <div className="inline-flex items-center gap-1 text-xs">
              <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="px-2 py-1 rounded-md border border-border bg-background" />
              <span className="text-muted-foreground">→</span>
              <input type="date" value={customTo} min={customFrom} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setCustomTo(e.target.value)} className="px-2 py-1 rounded-md border border-border bg-background" />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <CountCard label="Colleges" value={colleges.data ?? 0} icon={GraduationCap} color="bg-primary/10 text-primary" />
        <CountCard label="Courses" value={courses.data ?? 0} icon={BookOpen} color="bg-blue-100 text-blue-600" />
        <CountCard label="Exams" value={exams.data ?? 0} icon={FileText} color="bg-amber-100 text-amber-600" />
        <CountCard label="Articles" value={articles.data ?? 0} icon={FileText} color="bg-violet-100 text-violet-600" />
        <CountCard label="Careers" value={careers.data ?? 0} icon={Briefcase} color="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <CountCard label={`Leads (${range === "all" ? "all" : range === "custom" ? "custom" : range + "d"})`} value={totalLeads} icon={Users} color="bg-emerald-100 text-emerald-600" />
        <CountCard label={`LP Leads (${range === "all" ? "all" : range === "custom" ? "custom" : range + "d"})`} value={totalLp} icon={Globe} color="bg-orange-100 text-orange-600" />
        <CountCard label={`Applications (${range === "all" ? "all" : range === "custom" ? "custom" : range + "d"})`} value={totalApps} icon={Megaphone} color="bg-blue-100 text-blue-600" />
        <CountCard label={`Signups (${range === "all" ? "all" : range === "custom" ? "custom" : range + "d"})`} value={totalSignups} icon={Users} color="bg-violet-100 text-violet-600" />
        <CountCard label={`Referrals (${range === "all" ? "all" : range === "custom" ? "custom" : range + "d"})`} value={totalRefs} icon={TrendingUp} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" />Daily activity</h3>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary" />Leads</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500" />LP</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" />Apps</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-500" />Signups</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" />Refs</span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-40 overflow-x-auto">
            {series.map((s) => {
              const total = s.leads + s.lp + s.apps + s.signups + s.refs;
              return (
                <div key={s.day} className="flex-1 min-w-[8px] flex flex-col-reverse" title={`${s.day}: leads ${s.leads} • lp ${s.lp} • apps ${s.apps} • signups ${s.signups} • refs ${s.refs}`}>
                  <div className="bg-primary" style={{ height: `${(s.leads / max) * 100}%` }} />
                  <div className="bg-orange-500" style={{ height: `${(s.lp / max) * 100}%` }} />
                  <div className="bg-blue-500" style={{ height: `${(s.apps / max) * 100}%` }} />
                  <div className="bg-violet-500" style={{ height: `${(s.signups / max) * 100}%` }} />
                  <div className="bg-amber-500" style={{ height: `${(s.refs / max) * 100}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{series[0]?.day.slice(5)}</span>
            <span>{series[series.length - 1]?.day.slice(5)}</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold flex items-center gap-1.5 mb-3"><Users className="w-4 h-4 text-emerald-600" />Leads by Source</h3>
          {!leadsBySource.length ? (
            <p className="text-sm text-muted-foreground">No leads in this range.</p>
          ) : (
            <div className="space-y-1.5">
              {leadsBySource.map(([src, v]) => (
                <div key={src}>
                  <div className="flex justify-between text-xs mb-0.5"><span className="text-muted-foreground capitalize">{src}</span><span className="font-medium">{v}</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(v / lpMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
