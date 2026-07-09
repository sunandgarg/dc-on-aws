import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

function LogsConsole() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [fn, setFn] = useState("all");
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);

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
      .channel("explain_system_logs_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_logs" },
        (payload) => setLogs((prev) => [payload.new as any, ...prev].slice(0, 1000)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [live]);

  const functions = useMemo(() => Array.from(new Set(logs.map((l) => l.function_name))).sort(), [logs]);

  const filtered = useMemo(() => logs.filter((l) => {
    if (level !== "all" && l.level !== level) return false;
    if (fn !== "all" && l.function_name !== fn) return false;
    if (search) {
      const q = search.toLowerCase();
      const blob = `${l.function_name} ${l.flow ?? ""} ${l.method ?? ""} ${l.message} ${JSON.stringify(l.context ?? {})}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }), [logs, level, fn, search]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-3 flex flex-wrap gap-2 items-center border-b border-border bg-muted/30">
        <Input
          placeholder="🔎 Command bar — search any method, class, flow, message, context…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[280px]"
        />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fn} onValueChange={setFn}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Function" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All functions</SelectItem>
            {functions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        <Button size="sm" variant={live ? "default" : "outline"} onClick={() => setLive((v) => !v)}>
          {live ? "● Live" : "Live OFF"}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} / {logs.length}</span>
      </div>
      <ScrollArea className="h-[520px]">
        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No logs match. Trigger a backend action (send OTP, AI chat, save lead) — they appear here live.
            </div>
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
  );
}

function DeveloperView() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">🏗️ Architecture Overview</h3>
        <ul className="list-disc pl-5 space-y-1.5 text-foreground/80">
          <li><b>Frontend:</b> React 18 + Vite + Tailwind + shadcn/ui. Routing via react-router-dom. State via TanStack Query + Context.</li>
          <li><b>Backend:</b> Lovable Cloud (Supabase) — Postgres + RLS + Edge Functions (Deno).</li>
          <li><b>Auth:</b> Mobile-only OTP via <code>send-otp</code> / <code>study-otp</code> edge functions; provider abstraction in <code>ai_providers</code> / <code>otp_providers</code> tables.</li>
          <li><b>AI:</b> <code>ai-counselor</code> edge function → routes through admin-configured provider (Lovable AI Gateway by default) with college-priority context injected per request.</li>
          <li><b>Logging:</b> Shared <code>Logger</code> class (<code>supabase/functions/_shared/logger.ts</code>) writes to console + <code>public.system_logs</code> table. Realtime channel pushes new rows to admin UI.</li>
        </ul>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">🔑 Key Boundaries & Data Flow</h3>
        <ol className="list-decimal pl-5 space-y-1.5 text-foreground/80">
          <li><b>Lead capture →</b> <code>LeadCaptureForm</code> / <code>AILeadForm</code> → <code>save-lead</code> edge fn → <code>leads</code> table → <code>lp-dispatch-lead</code> for partner push.</li>
          <li><b>OTP →</b> <code>useAuth</code> → <code>send-otp</code> (provider chosen from <code>otp_providers</code> active row) → SMS/WhatsApp gateway → verify on submit.</li>
          <li><b>AI chat →</b> <code>AIChatFullScreen</code> → POST <code>/ai-counselor</code> with full message history → SSE stream → markdown render.</li>
          <li><b>Eligibility / Predictor →</b> Page form → <code>check-eligibility</code> / <code>predict-colleges</code> → returns ranked colleges from DB + general-knowledge fallback.</li>
          <li><b>Intent tracking →</b> <code>intentTracking.ts</code> writes to <code>user_intent_events</code>; <code>predict-lead-intent</code> scores nightly.</li>
        </ol>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">🧱 Tables Worth Knowing</h3>
        <p className="text-foreground/80"><code>colleges, courses, exams, articles, leads, user_roles, ai_providers, otp_providers, system_logs, user_intent_events, featured_colleges, promoted_programs, hero_banners, also_check_modules, ads, popup_events</code> — all under RLS. Admin = security-definer <code>has_role()</code> check.</p>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">⚙️ Edge Functions (20+)</h3>
        <p className="text-foreground/80 font-mono text-xs">
          ai-counselor · send-otp · study-otp · save-lead · bootstrap · check-eligibility · predict-colleges ·
          process-lead · process-queue · receive-lead · push-receive-lead · lp-dispatch-lead · lp-multi-push ·
          lp-process-batch · lp-receive-lead · lp-test-api · lp-utm · dispatch-intent-alert · predict-lead-intent ·
          summarize-user-session · send-email · google-reviews · admin-ai-generate · admin-invite-user ·
          purge-university-cache · intent-export-csv · get-egress-ip · test-api
        </p>
      </Card>
    </div>
  );
}

function LaymanView() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">🎓 What is DekhoCampus, really?</h3>
        <p className="text-foreground/80">
          Think of it as a <b>matchmaker between students and colleges</b>. A student lands on the site, tells us a bit about themselves,
          and we instantly show colleges, courses, and exams that fit — plus help them apply.
        </p>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">🚪 How a student moves through the site</h3>
        <ol className="list-decimal pl-5 space-y-1.5 text-foreground/80">
          <li><b>Lands</b> on homepage → sees trending colleges, scholarships, exam news.</li>
          <li><b>Asks something</b> (search bar / AI chat) → we politely ask name + course + city → store as a <i>lead</i>.</li>
          <li><b>Gets answers</b> — AI gives a short universal explanation, then shows options from the internet, then highlights <b>our</b> recommended colleges with a one-click "Apply".</li>
          <li><b>Applies</b> → application saved + sent to partner colleges via "Lead Push".</li>
          <li><b>Returns</b> → we remember them, send relevant updates and counsellor calls.</li>
        </ol>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">🧰 What runs in the background</h3>
        <ul className="list-disc pl-5 space-y-1.5 text-foreground/80">
          <li><b>OTP</b> verifies the student's phone (we pick whichever SMS provider you've turned ON in admin).</li>
          <li><b>AI counselor</b> answers in plain English. Admin chooses the AI brain (Gemini / GPT) from <i>AI Providers</i>.</li>
          <li><b>Lead Push</b> automatically forwards leads to college CRMs based on rules you configured.</li>
          <li><b>Logs console</b> below shows every backend action live — like a CCTV for the system.</li>
          <li><b>Featured & Priority</b> lists decide which colleges always show up first.</li>
        </ul>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold text-base mb-2">🧠 The "human psychology" answer pattern</h3>
        <p className="text-foreground/80">
          On every AI / search answer the student sees: <b>(1)</b> a one-line plain-English context so they don't feel lost,{" "}
          <b>(2)</b> up to 10 known options from across the internet ranked by relevance with a 2-3 word pro each,{" "}
          <b>(3)</b> a clearly highlighted "Apply directly here" block of our own colleges. This builds trust first, then converts.
        </p>
      </Card>
    </div>
  );
}

export default function AdminExplainSystem() {
  return (
    <AdminLayout title="Explain System">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Explain System</h1>
          <p className="text-sm text-muted-foreground">
            How DekhoCampus works — for developers, for humans, and a live command bar that shows every backend event.
          </p>
        </div>

        <Tabs defaultValue="layman">
          <TabsList>
            <TabsTrigger value="layman">👤 Layman View</TabsTrigger>
            <TabsTrigger value="developer">🛠️ Developer View</TabsTrigger>
            <TabsTrigger value="logs">📡 Live Command Bar (Logs)</TabsTrigger>
          </TabsList>
          <TabsContent value="layman" className="mt-4"><LaymanView /></TabsContent>
          <TabsContent value="developer" className="mt-4"><DeveloperView /></TabsContent>
          <TabsContent value="logs" className="mt-4">
            <div className="text-xs text-muted-foreground mb-2">
              Captures every <code>logger.debug / info / warn / error</code> from every edge function, method, flow, and request boundary.
              Streams live via Realtime.
            </div>
            <LogsConsole />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
