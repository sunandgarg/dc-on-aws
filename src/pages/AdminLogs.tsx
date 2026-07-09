import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";

interface LogRow {
  id: string;
  created_at: string;
  function_name: string;
  level: string;
  flow: string | null;
  method: string | null;
  message: string;
  context: any;
  request_id: string | null;
}

const LEVEL_COLORS: Record<string, string> = {
  debug: "bg-muted text-muted-foreground",
  info: "bg-primary/10 text-primary",
  warn: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  error: "bg-destructive/15 text-destructive",
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [fn, setFn] = useState<string>("all");
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setLogs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!live) return;
    const ch = supabase
      .channel("system_logs_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        (payload) => setLogs((prev) => [payload.new as any, ...prev].slice(0, 1000)),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [live]);

  const functions = useMemo(() => Array.from(new Set(logs.map((l) => l.function_name))).sort(), [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (level !== "all" && l.level !== level) return false;
      if (fn !== "all" && l.function_name !== fn) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${l.function_name} ${l.flow ?? ""} ${l.method ?? ""} ${l.message} ${JSON.stringify(l.context ?? {})}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [logs, level, fn, search]);

  const clearAll = async () => {
    if (!confirm("Delete ALL system logs? This cannot be undone.")) return;
    const { error } = await supabase.from("system_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error(error.message);
    else { toast.success("Logs cleared"); load(); }
  };

  return (
    <AdminLayout title="System Logs">
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Logs Console</h1>
          <p className="text-sm text-muted-foreground">Live backend logs from edge functions. Newest first.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
          <Button variant={live ? "default" : "outline"} onClick={() => setLive((v) => !v)}>{live ? "Live: ON" : "Live: OFF"}</Button>
          <Button variant="destructive" onClick={clearAll}>Clear</Button>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search message / context / method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fn} onValueChange={setFn}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Function" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All functions</SelectItem>
            {functions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} / {logs.length} entries</div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-260px)]" ref={scrollRef as any}>
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No logs yet. Trigger a backend action (e.g. send OTP) and they will appear here live.</div>
            )}
            {filtered.map((l) => (
              <div key={l.id} className="p-3 text-sm font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                  <Badge className={LEVEL_COLORS[l.level] || ""}>{l.level}</Badge>
                  <Badge variant="outline">{l.function_name}</Badge>
                  {l.flow && <Badge variant="secondary">{l.flow}</Badge>}
                  {l.method && <span className="text-xs text-muted-foreground">·{l.method}</span>}
                  {l.request_id && <span className="text-[10px] text-muted-foreground ml-auto">req:{l.request_id.slice(0, 8)}</span>}
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words">{l.message}</div>
                {l.context && (
                  <pre className="mt-1 text-[11px] bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(l.context, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
    </AdminLayout>
  );
}
