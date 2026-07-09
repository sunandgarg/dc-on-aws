import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

type Row = { event_type: string; metadata: any; created_at: string };
const EVENTS = ["lp_popup_open", "lp_popup_dismiss", "lp_popup_submit"] as const;

export default function AdminPopupAnalytics() {
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ["popup-analytics", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await (supabase as any)
        .from("user_events")
        .select("event_type, metadata, created_at")
        .in("event_type", EVENTS as any)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
  });

  const summary = useMemo(() => {
    const bySource: Record<string, { open: number; dismiss: number; submit: number }> = {};
    const totals = { open: 0, dismiss: 0, submit: 0 };
    (data ?? []).forEach((r) => {
      const src = (r.metadata?.source as string) || "unknown";
      bySource[src] ??= { open: 0, dismiss: 0, submit: 0 };
      if (r.event_type === "lp_popup_open") { bySource[src].open++; totals.open++; }
      if (r.event_type === "lp_popup_dismiss") { bySource[src].dismiss++; totals.dismiss++; }
      if (r.event_type === "lp_popup_submit") { bySource[src].submit++; totals.submit++; }
    });
    const rows = Object.entries(bySource)
      .map(([source, v]) => ({
        source,
        ...v,
        conv: v.open ? ((v.submit / v.open) * 100).toFixed(1) + "%" : "-",
        dismissRate: v.open ? ((v.dismiss / v.open) * 100).toFixed(1) + "%" : "-",
      }))
      .sort((a, b) => b.open - a.open);
    return { rows, totals };
  }, [data]);

  return (
    <AdminLayout title="Lead Popup Analytics">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Counts of <code>lp_popup_open</code>, <code>lp_popup_dismiss</code>, <code>lp_popup_submit</code> by <strong>source</strong>. Use this to tune the popup delay schedule.</p>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="h-10 px-3 rounded-xl border border-border bg-background text-sm">
          <option value={1}>Last 24h</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Opens" value={summary.totals.open} />
        <Stat label="Dismisses" value={summary.totals.dismiss} />
        <Stat label="Submits" value={summary.totals.submit} />
        <Stat label="Conversion" value={summary.totals.open ? `${((summary.totals.submit / summary.totals.open) * 100).toFixed(1)}%` : "-"} />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["Source","Opens","Dismisses","Submits","Conv.","Dismiss Rate"].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : summary.rows.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No events yet in this window.</td></tr>
            ) : summary.rows.map((r) => (
              <tr key={r.source} className="border-t border-border">
                <td className="p-3 font-medium text-foreground">{r.source}</td>
                <td className="p-3">{r.open}</td>
                <td className="p-3">{r.dismiss}</td>
                <td className="p-3">{r.submit}</td>
                <td className="p-3">{r.conv}</td>
                <td className="p-3">{r.dismissRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
