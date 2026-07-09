import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MousePointerClick, Users, Sparkles, Download, Info, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import { CSVTools } from "@/components/CSVTools";
type Row = {
  id: string;
  page: string;
  cta: string;
  entity_slug: string | null;
  session_id: string | null;
  path: string | null;
  utm_source: string | null;
  created_at: string;
};

type Range = "24h" | "7d" | "30d" | "all";

const RANGE_HOURS: Record<Range, number | null> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "all": null,
};

export default function AdminCtaConversions() {
  const { isAdmin, loading: authLoading } = useAuth() as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("7d");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = (supabase as any)
        .from("cta_events")
        .select("id,page,cta,entity_slug,session_id,path,utm_source,created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      const hours = RANGE_HOURS[range];
      if (hours) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        q = q.gte("created_at", since);
      }
      const { data, error } = await q;
      if (!cancelled) {
        if (error) console.error(error);
        setRows((data as Row[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range, isAdmin]);

  // Defense-in-depth: even though the route is admin-guarded and RLS blocks
  // non-admins, render an explicit denial UI so it's obvious in the page itself.
  if (!authLoading && !isAdmin) {
    return (
      <AdminLayout title="CTA Conversions">
      <div className="mb-4">
        <CSVTools table="cta_events" filename="cta_events.csv" columns="*" upsertKey="id" />
      </div>

        <div className="max-w-md mx-auto mt-20 p-8 text-center">
          <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-xl font-bold mb-1">Admin only</h2>
          <p className="text-sm text-muted-foreground">
            CTA conversion data is restricted to administrators. Ask a workspace admin to grant you access.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (pageFilter !== "all" && r.page !== pageFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(r.cta?.toLowerCase().includes(q) || r.entity_slug?.toLowerCase().includes(q) || r.path?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [rows, pageFilter, query]);

  const stats = useMemo(() => {
    const totalClicks = filtered.length;
    const uniqueSessions = new Set(filtered.map((r) => r.session_id || "anon")).size;
    const byPage = new Map<string, number>();
    const byCta = new Map<string, number>();
    const byEntity = new Map<string, number>();
    for (const r of filtered) {
      byPage.set(r.page, (byPage.get(r.page) || 0) + 1);
      byCta.set(r.cta, (byCta.get(r.cta) || 0) + 1);
      const key = `${r.page}:${r.entity_slug || "-"}`;
      byEntity.set(key, (byEntity.get(key) || 0) + 1);
    }
    return { totalClicks, uniqueSessions, byPage, byCta, byEntity };
  }, [filtered]);

  const topPages = useMemo(() => [...stats.byPage.entries()].sort((a, b) => b[1] - a[1]), [stats]);
  const topCtas = useMemo(() => [...stats.byCta.entries()].sort((a, b) => b[1] - a[1]), [stats]);
  const topEntities = useMemo(() => [...stats.byEntity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20), [stats]);

  // Filter-aware CSV export with optional column picker.
  const ALL_COLS = ["created_at","page","cta","entity_slug","session_id","path","utm_source"] as const;
  const [exportOpen, setExportOpen] = useState(false);
  const [exportCols, setExportCols] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cta_export_cols") || "null") || [...ALL_COLS]; } catch { return [...ALL_COLS]; }
  });
  useEffect(() => { try { localStorage.setItem("cta_export_cols", JSON.stringify(exportCols)); } catch {} }, [exportCols]);

  const exportCsv = () => {
    const cols = exportCols.length ? exportCols : [...ALL_COLS];
    const header = cols.join(",");
    const body = filtered.map((r: any) =>
      cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const parts = [range, pageFilter !== "all" ? pageFilter : null, query ? `q-${query.slice(0, 12)}` : null].filter(Boolean).join("_");
    a.download = `cta-conversions_${parts}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  // Conversion KPIs
  const kpis = useMemo(() => {
    const clicksPerSession = stats.uniqueSessions ? stats.totalClicks / stats.uniqueSessions : 0;
    const topPageEntry = [...stats.byPage.entries()].sort((a, b) => b[1] - a[1])[0];
    const topPage = topPageEntry ? topPageEntry[0] : "-";
    const topPageClicks = topPageEntry ? topPageEntry[1] : 0;
    const topPageSessions = new Set(filtered.filter((r) => r.page === topPage).map((r) => r.session_id || "anon")).size || 1;
    const topPageRate = topPageSessions ? topPageClicks / topPageSessions : 0;
    return { clicksPerSession, topPage, topPageRate };
  }, [stats, filtered]);

  return (
    <AdminLayout title="CTA Conversions">
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-start md:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> CTA Conversions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Apply / Talk / Download click events across College, Course, Exam and Premium pages.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["24h", "7d", "30d", "all"] as Range[]).map((r) => (
              <Button key={r} variant={range === r ? "default" : "outline"} size="sm" onClick={() => setRange(r)}>
                {r}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={MousePointerClick} label="Total Clicks" value={loading ? null : stats.totalClicks} hint="All CTA click events in range" />
          <StatCard icon={Users} label="Unique Sessions" value={loading ? null : stats.uniqueSessions} hint="Distinct browser sessions" />
          <StatCard icon={Sparkles} label="Pages Tracked" value={loading ? null : stats.byPage.size} hint="Distinct page categories" />
          <StatCard icon={BarChart3} label="CTA Variants" value={loading ? null : stats.byCta.size} hint="Distinct CTA labels" />
          <StatCard icon={MousePointerClick} label="Clicks / Session" value={loading ? null : Number(kpis.clicksPerSession.toFixed(2))} hint="Avg CTAs per unique session" />
          <StatCard icon={Sparkles} label={`Top: ${kpis.topPage}`} value={loading ? null : Number((kpis.topPageRate * 100).toFixed(0))} suffix="%" hint="Clicks ÷ sessions on top page" />
        </div>

        <details className="rounded-lg border bg-muted/30 px-4 py-2 text-xs">
          <summary className="cursor-pointer font-medium flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> KPI definitions
          </summary>
          <ul className="mt-2 space-y-1 text-muted-foreground leading-relaxed">
            <li><b>Total Clicks</b> - Count of every CTA click event saved in <code>cta_events</code> within the selected range and filters.</li>
            <li><b>Unique Sessions</b> - Distinct <code>session_id</code> values among clicks (one per browser session).</li>
            <li><b>Pages Tracked</b> - Distinct values of <code>page</code> (e.g. <i>college, course, exam, premium</i>).</li>
            <li><b>CTA Variants</b> - Distinct <code>cta</code> labels (e.g. <i>Apply Now, Talk to Counselor, Download Syllabus</i>).</li>
            <li><b>Clicks / Session</b> - Total Clicks ÷ Unique Sessions. Higher = more engaged visitors.</li>
            <li><b>Top-page conversion</b> - Clicks ÷ sessions on the single highest-traffic page. Proxy for click-through rate on the strongest funnel.</li>
          </ul>
        </details>

        {exportOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setExportOpen(false)}>
            <Card className="max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold mb-1">Export filtered CSV</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {filtered.length} rows · range <b>{range}</b>{pageFilter !== "all" ? <> · page <b>{pageFilter}</b></> : null}{query ? <> · search <b>{query}</b></> : null}
              </p>
              <div className="space-y-1.5 mb-4">
                <p className="text-xs font-medium">Columns to include</p>
                {ALL_COLS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportCols.includes(c)}
                      onChange={(e) => setExportCols((cols) => e.target.checked ? Array.from(new Set([...cols, c])) : cols.filter((x) => x !== c))}
                    />
                    <code className="text-xs">{c}</code>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
                <Button onClick={exportCsv} disabled={exportCols.length === 0}>Download</Button>
              </div>
            </Card>
          </div>
        )}

        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {["all", "college", "course", "exam", "premium"].map((p) => (
              <Badge
                key={p}
                onClick={() => setPageFilter(p)}
                className={`cursor-pointer ${pageFilter === p ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}
              >
                {p}
              </Badge>
            ))}
            <Input
              placeholder="Filter by CTA, slug or path…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs h-9 ml-auto"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <BreakdownList title="Clicks by Page" rows={topPages} loading={loading} />
            <BreakdownList title="Clicks by CTA Label" rows={topCtas} loading={loading} />
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold mb-3">Top 20 Entities</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : topEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No CTA clicks in this range yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                    <th className="py-2">Page</th>
                    <th className="py-2">Entity Slug</th>
                    <th className="py-2 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {topEntities.map(([k, v]) => {
                    const [page, slug] = k.split(":");
                    return (
                      <tr key={k} className="border-b last:border-0">
                        <td className="py-2"><Badge variant="secondary">{page}</Badge></td>
                        <td className="py-2 font-mono text-xs">{slug}</td>
                        <td className="py-2 text-right font-bold">{v}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-bold mb-3">Recent Events ({filtered.length})</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events match the current filters.</p>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left uppercase text-muted-foreground border-b">
                    <th className="py-2">When</th>
                    <th className="py-2">Page</th>
                    <th className="py-2">CTA</th>
                    <th className="py-2">Slug</th>
                    <th className="py-2">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-1.5 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="py-1.5"><Badge variant="secondary" className="text-[10px]">{r.page}</Badge></td>
                      <td className="py-1.5 font-medium">{r.cta}</td>
                      <td className="py-1.5 font-mono">{r.entity_slug || "-"}</td>
                      <td className="py-1.5 font-mono text-muted-foreground truncate max-w-[200px]">{r.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, hint, suffix }: { icon: any; label: string; value: number | null; hint?: string; suffix?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      {value === null ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl md:text-3xl font-bold text-primary">{value.toLocaleString()}{suffix || ""}</p>}
      {hint && <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{hint}</p>}
    </Card>
  );
}

function BreakdownList({ title, rows, loading }: { title: string; rows: [string, number][]; loading: boolean }) {
  const max = rows[0]?.[1] || 1;
  return (
    <div>
      <h4 className="font-bold mb-2 text-sm">{title}</h4>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.slice(0, 8).map(([label, count]) => (
            <div key={label} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="font-medium truncate">{label}</span>
                <span className="font-bold tabular-nums">{count}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
