import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";

interface Step { label: string; match: (e: any) => boolean }

const DEFAULT_FUNNEL: Step[] = [
  { label: "Landing (any page view)", match: (e) => e.event_type === "page_view" },
  { label: "Visited a college page", match: (e) => e.event_type === "page_view" && /^\/colleges\//.test(e.path || "") },
  { label: "Opened lead/counselling form", match: (e) => e.event_type === "tracked_click" && /counsel|apply|brochure|contact|lead/i.test(e.element || "") },
  { label: "Submitted lead form", match: (e) => e.event_type === "form_submit" },
];

export default function AdminFunnel() {
  const [days, setDays] = useState(7);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["funnel-events", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await (supabase as any)
        .from("user_events")
        .select("session_id, event_type, path, element, created_at")
        .gte("created_at", since)
        .limit(50000);
      return data || [];
    },
  });

  // Group events by session, evaluate each step in order (sequential funnel)
  const sessions = new Map<string, any[]>();
  (events as any[]).forEach((e) => {
    const arr = sessions.get(e.session_id) || [];
    arr.push(e);
    sessions.set(e.session_id, arr);
  });

  const counts = DEFAULT_FUNNEL.map(() => 0);
  for (const arr of sessions.values()) {
    let cursor = 0;
    for (const e of arr) {
      while (cursor < DEFAULT_FUNNEL.length && DEFAULT_FUNNEL[cursor].match(e)) {
        counts[cursor] += 1;
        cursor += 1;
      }
      if (cursor >= DEFAULT_FUNNEL.length) break;
    }
  }

  const top = counts[0] || 1;

  return (
    <AdminLayout title="Conversion Funnel">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">Window (days):</span>
        <Input type="number" value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 7))} className="w-24 h-9" />
        <span className="text-xs text-muted-foreground">{(events as any[]).length.toLocaleString()} events · {sessions.size} sessions</span>
      </div>

      <Card className="p-4">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        <div className="space-y-3">
          {DEFAULT_FUNNEL.map((step, i) => {
            const pct = Math.round((counts[i] / top) * 100);
            const dropPct = i > 0 ? Math.round(((counts[i - 1] - counts[i]) / Math.max(1, counts[i - 1])) * 100) : 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{i + 1}. {step.label}</span>
                  <span className="tabular-nums">
                    <span className="font-bold">{counts[i]}</span>
                    <span className="text-muted-foreground"> · {pct}%</span>
                    {i > 0 && counts[i - 1] > 0 && (
                      <span className="text-destructive ml-2">↓ {dropPct}%</span>
                    )}
                  </span>
                </div>
                <div className="h-7 rounded-md bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Sequential funnel: each session is counted at a step only if it reached the previous step in order.
        </p>
      </Card>
    </AdminLayout>
  );
}
