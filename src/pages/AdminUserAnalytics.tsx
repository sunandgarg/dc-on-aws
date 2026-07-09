import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Monitor, Smartphone, Tablet, Clock, MousePointer, Eye, Download, User, Phone, Mail, Filter as FilterIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

function downloadCsv(filename: string, rows: any[]) {
  if (!rows.length) return toast.error("Nothing to export");
  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map(r => headers.map(h => r[h]))]
    .map(r => r.map((v: any) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function AdminUserAnalytics() {
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "leads" | "users" | "anon">("all");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["admin-user-sessions"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_sessions")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    refetchInterval: 30_000,
  });

  // Backfill identity from leads where session row missing it
  const { data: leadIndex = {} } = useQuery({
    queryKey: ["admin-recent-leads-map"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("leads")
        .select("name, phone, email, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      const map: Record<string, any> = {};
      (data || []).forEach((l: any) => {
        if (l.phone) map[l.phone] = l;
        if (l.email) map[l.email.toLowerCase()] = l;
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sessions as any[]).filter((s) => {
      if (filter === "leads" && !(s.lead_phone || s.lead_email || s.lead_name)) return false;
      if (filter === "users" && !s.user_id) return false;
      if (filter === "anon" && (s.user_id || s.lead_phone)) return false;
      if (!q) return true;
      return (
        (s.lead_name || "").toLowerCase().includes(q) ||
        (s.lead_email || "").toLowerCase().includes(q) ||
        (s.lead_phone || "").toLowerCase().includes(q) ||
        (s.last_path || "").toLowerCase().includes(q) ||
        (s.session_id || "").toLowerCase().includes(q)
      );
    });
  }, [sessions, search, filter]);

  const { data: events = [] } = useQuery({
    queryKey: ["admin-session-events", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_events")
        .select("*")
        .eq("session_id", selected)
        .order("created_at", { ascending: true })
        .limit(1000);
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-tracking-stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const [s1, s2, s3, s4] = await Promise.all([
        (supabase as any).from("user_sessions").select("*", { count: "exact", head: true }).gte("started_at", since),
        (supabase as any).from("user_events").select("*", { count: "exact", head: true }).gte("created_at", since),
        (supabase as any).from("user_sessions").select("*", { count: "exact", head: true }).not("user_id", "is", null),
        (supabase as any).from("user_sessions").select("*", { count: "exact", head: true }).not("lead_phone", "is", null),
      ]);
      return { sessionsToday: s1.count ?? 0, eventsToday: s2.count ?? 0, loggedIn: s3.count ?? 0, withLead: s4.count ?? 0 };
    },
  });

  const summarize = async (sid: string) => {
    setLoadingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-user-session", { body: { session_id: sid } });
      if (error) throw error;
      setSummary((s) => ({ ...s, [sid]: (data as any)?.summary || "(no summary)" }));
      toast.success("AI summary generated");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingSummary(false); }
  };

  const Device = ({ d }: { d: string }) => {
    const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
    return <Icon className="w-3.5 h-3.5 inline" />;
  };

  const identityFor = (s: any) => {
    let name = s.lead_name, phone = s.lead_phone, email = s.lead_email;
    if (!phone && !email && leadIndex && Object.keys(leadIndex).length) {
      // best-effort: skip - only show what we have
    }
    return { name, phone, email };
  };

  const exportSessions = () => {
    downloadCsv(`sessions-${Date.now()}.csv`, filtered.map((s: any) => ({
      session_id: s.session_id, name: s.lead_name, phone: s.lead_phone, email: s.lead_email,
      device: s.device, last_path: s.last_path, entry_path: s.entry_path,
      started_at: s.started_at, last_seen_at: s.last_seen_at,
      utm_source: s.utm?.utm_source, utm_campaign: s.utm?.utm_campaign,
      country: s.country, city: s.city, language: s.language, timezone: s.timezone,
    })));
  };
  const exportTimeline = () => {
    if (!selected) return;
    downloadCsv(`timeline-${selected}.csv`, (events as any[]).map((e) => ({
      time: e.created_at, type: e.event_type, path: e.path, element: e.element,
      x: e.x, y: e.y, metadata: JSON.stringify(e.metadata || {}),
    })));
  };

  return (
    <AdminLayout title="User Analytics & Tracking">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Sessions (24h)", value: stats?.sessionsToday, icon: Eye },
          { label: "Events (24h)", value: stats?.eventsToday, icon: MousePointer },
          { label: "Logged-in", value: stats?.loggedIn, icon: User },
          { label: "With lead", value: stats?.withLead, icon: Phone },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </div>
            <div className="text-2xl font-bold">{s.value ?? "-"}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm font-semibold flex-1">Recent sessions</div>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={exportSessions}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
          </div>
          <div className="flex gap-2 mb-2">
            <Input placeholder="Search name / phone / email / path…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex gap-1 mb-2 text-xs">
            {(["all","leads","users","anon"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded-md ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {f}
              </button>
            ))}
          </div>
          <ScrollArea className="h-[65vh]">
            <div className="space-y-1.5">
              {isLoading && <div className="text-xs text-muted-foreground p-2">Loading…</div>}
              {filtered.map((s: any) => {
                const id = identityFor(s);
                return (
                  <button
                    key={s.session_id}
                    onClick={() => setSelected(s.session_id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                      selected === s.session_id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">
                        {id.name || id.phone || id.email || (s.user_id ? "Logged-in user" : "Anonymous")}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0">
                        <Device d={s.device} /> {s.device}
                      </Badge>
                    </div>
                    {(id.phone || id.email) && (
                      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                        {id.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{id.phone}</span>}
                        {id.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{id.email}</span>}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground truncate">{s.last_path || "-"}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      {s.user_id && <Badge className="bg-primary/10 text-primary border-0 text-[10px] py-0 px-1.5">user</Badge>}
                      {s.lead_phone && !s.user_id && <Badge className="bg-success/10 text-success border-0 text-[10px] py-0 px-1.5">lead</Badge>}
                      {formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true })}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-3 p-4">
          {!selected && (
            <div className="text-sm text-muted-foreground text-center py-12">
              Select a session to view its event timeline.
            </div>
          )}
          {selected && (
            <>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Session</div>
                  <div className="font-mono text-xs truncate">{selected}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={exportTimeline}>
                    <Download className="w-3.5 h-3.5" /> CSV
                  </Button>
                  <Button size="sm" onClick={() => summarize(selected)} disabled={loadingSummary} className="gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Summary
                  </Button>
                </div>
              </div>

              {summary[selected] && (
                <Card className="p-3 mb-3 bg-primary/5 border-primary/30">
                  <div className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI summary
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{summary[selected]}</div>
                </Card>
              )}

              <ScrollArea className="h-[60vh]">
                <div className="space-y-1">
                  {events.map((e: any) => (
                    <div key={e.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">{e.event_type}</Badge>
                        <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="mt-0.5">
                        <span className="font-mono text-[11px]">{e.path}</span>
                        {e.element && <span className="text-muted-foreground"> · {e.element}</span>}
                      </div>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <div className="text-[10px] text-muted-foreground truncate">{JSON.stringify(e.metadata)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
