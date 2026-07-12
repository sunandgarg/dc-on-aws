import { useEffect, useMemo, useState } from "react";
import { Bot, Clock, Loader2, Play, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
type Run = { id: string; status: string; trigger_type: string; started_at: string; message: string; created_article_ids?: string[] };

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

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: settingsData }, { data: sourceData }, { data: runData }] = await Promise.all([
        (supabase as any).from("blog_auto_agent_settings").select("*").eq("id", "default").maybeSingle(),
        (supabase as any).from("blog_research_sources").select("*").order("display_order"),
        (supabase as any).from("blog_auto_agent_runs").select("*").order("started_at", { ascending: false }).limit(5),
      ]);
      if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
      if (sourceData?.length) setSources(sourceData);
      if (runData) setRuns(runData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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
      await load();
    } catch (error: any) {
      toast.error(error.message || "Could not save blog agent settings");
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-blog-agent", { body: { trigger_type: "manual" } });
      if (error || data?.error) throw error || new Error(data.error);
      toast.success(`Created ${data.created_article_ids?.length || 0} blog article(s)`);
      await load();
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
            Researches competitors plus DekhoCampus, selects 2-3 original topics, creates SEO/GEO/AEO articles, tags entities, generates SVG covers, and publishes on schedule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={save} disabled={busy} className="gap-2 rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
          <Button onClick={runNow} disabled={busy || activeSourceCount < 2} className="gap-2 rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run now
          </Button>
        </div>
      </div>

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
          <Label className="text-xs">Model provider</Label>
          <Input value={settings.model_provider} onChange={e => updateSetting("model_provider", e.target.value)} className="mt-1" placeholder="gemini, openai, anthropic..." />
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
    </div>
  );
}
