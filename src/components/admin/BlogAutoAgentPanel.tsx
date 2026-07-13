import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Clock, ExternalLink, ImageIcon, Loader2, Play, Save, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

type Settings = {
  enabled: boolean;
  interval_minutes: number;
  posts_per_run: number;
  daily_post_cap: number;
  publish_status: "Draft" | "Published";
  model_provider: string;
  word_limit: number;
  last_run_at?: string | null;
  next_run_at?: string | null;
};

type Source = { id?: string; name: string; url: string; source_type: "competitor" | "own"; is_active: boolean };
type Run = {
  id: string;
  status: "running" | "completed" | "skipped" | "failed";
  trigger_type: string;
  started_at: string;
  finished_at?: string | null;
  message: string;
  created_article_ids?: string[];
  progress?: number;
  current_step?: string;
  estimated_seconds?: number;
  selected_topics?: Array<{ title?: string }>;
};
type GeneratedArticle = { id: string; title: string; slug: string; featured_image?: string; status?: string; description?: string };

const DRAFT_KEY = "dc:admin:blog-agent:draft:v1";

const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  interval_minutes: 60,
  posts_per_run: 2,
  daily_post_cap: 12,
  publish_status: "Published",
  model_provider: "gemini",
  word_limit: 1200,
};

const DEFAULT_SOURCES: Source[] = [
  { name: "Shiksha", url: "https://www.shiksha.com/news", source_type: "competitor", is_active: true },
  { name: "Careers360", url: "https://www.careers360.com/articles", source_type: "competitor", is_active: true },
  { name: "KollegeApply", url: "https://news.kollegeapply.com", source_type: "competitor", is_active: true },
  { name: "CollegeDunia", url: "https://collegedunia.com/news", source_type: "competitor", is_active: true },
  { name: "CollegeDekho", url: "https://www.collegedekho.com/news", source_type: "competitor", is_active: true },
  { name: "PaGaLGuY", url: "https://www.pagalguy.com/mba/articles", source_type: "competitor", is_active: true },
  { name: "DekhoCampus", url: "https://www.dekhocampus.in/news", source_type: "own", is_active: true },
];

export function BlogAutoAgentPanel({ onArticlesCreated }: { onArticlesCreated?: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sources, setSources] = useState<Source[]>(DEFAULT_SOURCES);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [generatedArticles, setGeneratedArticles] = useState<GeneratedArticle[]>([]);
  const [now, setNow] = useState(Date.now());

  const load = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [{ data: settingsData }, { data: sourceData }, { data: runData }] = await Promise.all([
        (supabase as any).from("blog_auto_agent_settings").select("*").eq("id", "default").maybeSingle(),
        (supabase as any).from("blog_research_sources").select("*").order("display_order"),
        (supabase as any).from("blog_auto_agent_runs").select("*").order("started_at", { ascending: false }).limit(5),
      ]);
      if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
      if (sourceData?.length) setSources(sourceData);
      if (runData) {
        setRuns(runData);
        const ids = Array.from(new Set(runData.flatMap((run: Run) => run.created_article_ids || [])));
        if (ids.length) {
          const { data } = await (supabase as any).from("articles")
            .select("id,title,slug,featured_image,status,description")
            .in("id", ids);
          setGeneratedArticles(data || []);
        }
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true).then(() => {
      try {
        const draft = sessionStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.settings) setSettings((current) => ({ ...current, ...parsed.settings }));
          if (parsed.sources) setSources(parsed.sources);
        }
      } catch { /* ignore invalid session draft */ }
    });
  }, []);

  const activeRun = runs.find((run) => run.status === "running");

  useEffect(() => {
    if (!activeRun) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void load(false);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeRun?.id]);

  useEffect(() => {
    if (loading) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ settings, sources }));
  }, [settings, sources, loading]);

  const activeSourceCount = useMemo(() => sources.filter(s => s.is_active).length, [sources]);
  const updateSetting = (key: keyof Settings, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      const nextRun = settings.enabled && !settings.next_run_at ? new Date().toISOString() : settings.next_run_at;
      const { error } = await (supabase as any).from("blog_auto_agent_settings").upsert({ id: "default", ...settings, next_run_at: nextRun });
      if (error) throw error;
      for (const [index, source] of sources.entries()) {
        await (supabase as any).from("blog_research_sources").upsert({ ...source, display_order: (index + 1) * 10 }, { onConflict: "url" });
      }
      toast.success("Auto blog agent settings saved");
      sessionStorage.removeItem(DRAFT_KEY);
      await load(false);
    } catch (error: any) {
      toast.error(error.message || "Could not save blog agent settings");
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const invocation = supabase.functions.invoke("admin-blog-agent", { body: { trigger_type: "manual" } });
      // The run row is created immediately. Start polling it while the long AI
      // request continues, and keep that state recoverable after navigation.
      window.setTimeout(() => { void load(false); }, 800);
      const { data, error } = await invocation;
      if (error || data?.error) throw error || new Error(data.error);
      toast.success(`Created ${data.created_article_ids?.length || 0} blog article(s)`);
      await load(false);
      onArticlesCreated?.();
    } catch (error: any) {
      toast.error(error.message || "Blog agent run failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="rounded-2xl border p-4 text-sm text-muted-foreground">Loading blog automation...</div>;

  return (
    <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Auto Blog Agent</h3>
            <Badge variant={settings.enabled ? "default" : "secondary"}>{settings.enabled ? "Running" : "Paused"}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Researches competitors plus DekhoCampus, uses Claude for original SEO/GEO/AEO articles, tags entities, generates branded OpenAI WebP covers, and publishes on schedule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={save} disabled={busy} className="gap-2 rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
          <Button onClick={runNow} disabled={busy || !!activeRun || activeSourceCount < 2} className="gap-2 rounded-xl">
            {busy || activeRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {activeRun ? "Agent running" : "Run now"}
          </Button>
        </div>
      </div>

      {activeRun && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-orange-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Blog agent is working</div>
              <p className="mt-1 text-sm text-muted-foreground">{activeRun.current_step || "Preparing your articles"}</p>
            </div>
            <Badge variant="outline" className="gap-1 bg-background/80"><Timer className="h-3.5 w-3.5" /> {(() => {
              const elapsed = Math.max(0, Math.round((now - new Date(activeRun.started_at).getTime()) / 1000));
              const remaining = Math.max(0, Number(activeRun.estimated_seconds || 180) - elapsed);
              return remaining > 0 ? `About ${Math.max(1, Math.ceil(remaining / 60))} min left` : "Finishing now";
            })()}</Badge>
          </div>
          <Progress value={Math.max(2, activeRun.progress || 2)} className="mt-4 h-3" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{activeRun.progress || 2}% complete</span><span>You can safely switch tabs - this status will remain</span></div>
          {!!activeRun.selected_topics?.length && <div className="mt-3 flex flex-wrap gap-2">{activeRun.selected_topics.map((topic, index) => <Badge key={`${topic.title}-${index}`} variant="secondary">{topic.title}</Badge>)}</div>}
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <div className="rounded-xl border p-3">
          <Label className="text-xs">Enable auto push</Label>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm">{settings.enabled ? "Auto publishing on" : "Manual only"}</span>
            <Switch checked={settings.enabled} onCheckedChange={(value) => updateSetting("enabled", value)} />
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <Label className="text-xs">Frequency</Label>
          <div className="mt-3 flex gap-2">
            {[30, 60].map(minutes => <Button key={minutes} size="sm" variant={settings.interval_minutes === minutes ? "default" : "outline"} onClick={() => updateSetting("interval_minutes", minutes)}>{minutes === 30 ? "30 min" : "1 hour"}</Button>)}
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <Label className="text-xs">Articles per run</Label>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3].map(count => <Button key={count} size="sm" variant={settings.posts_per_run === count ? "default" : "outline"} onClick={() => updateSetting("posts_per_run", count)}>{count}</Button>)}
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <Label className="text-xs">Publish mode</Label>
          <div className="mt-3 flex gap-2">
            {(["Published", "Draft"] as const).map(status => <Button key={status} size="sm" variant={settings.publish_status === status ? "default" : "outline"} onClick={() => updateSetting("publish_status", status)}>{status}</Button>)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div>
          <Label className="text-xs">Daily cap</Label>
          <Input type="number" min={1} max={48} value={settings.daily_post_cap} onChange={e => updateSetting("daily_post_cap", Number(e.target.value || 12))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Blog AI providers</Label>
          <div className="mt-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">Claude text + OpenAI image</div>
        </div>
        <div>
          <Label className="text-xs">Word limit</Label>
          <div className="mt-1 flex gap-2">
            {[800, 1200, 1800].map(limit => <Button key={limit} size="sm" variant={settings.word_limit === limit ? "default" : "outline"} onClick={() => updateSetting("word_limit", limit)}>{limit}</Button>)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> Research sources visible to the agent</div>
        <div className="grid gap-2 md:grid-cols-2">
          {sources.map((source, index) => (
            <label key={source.url} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
              <Switch checked={source.is_active} onCheckedChange={(value) => setSources(prev => prev.map((item, i) => i === index ? { ...item, is_active: value } : item))} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{source.name} <Badge variant="outline" className="ml-1 text-[10px]">{source.source_type}</Badge></span>
                <span className="block truncate text-xs text-muted-foreground">{source.url}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Last: {settings.last_run_at ? new Date(settings.last_run_at).toLocaleString() : "Not run yet"}</span>
          <span>Next: {settings.next_run_at ? new Date(settings.next_run_at).toLocaleString() : "After saving enabled schedule"}</span>
        </div>
        {runs.length > 0 && <div className="mt-2 space-y-1">{runs.map(run => <div key={run.id}>• {new Date(run.started_at).toLocaleString()} - {run.status} - {run.message || `${run.created_article_ids?.length || 0} articles`}</div>)}</div>}
      </div>

      {generatedArticles.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Recently generated articles</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {generatedArticles.map((article) => (
              <a key={article.id} href={`/articles/${article.slug}`} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="aspect-[16/9] bg-muted">
                  {article.featured_image ? <img src={article.featured_image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2"><h4 className="line-clamp-2 text-sm font-semibold">{article.title}</h4><ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" /></div>
                  <div className="mt-2"><Badge variant={article.status === "Published" ? "default" : "secondary"}>{article.status || "Draft"}</Badge></div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
