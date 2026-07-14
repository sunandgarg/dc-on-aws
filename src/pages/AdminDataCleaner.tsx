import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Check, CheckCheck, CirclePause, CirclePlay, Clock3, DatabaseZap, ExternalLink, Eye, Loader2, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ENTITY_OPTIONS = [
  { id: "colleges", label: "Colleges", table: "colleges", name: "name" },
  { id: "courses", label: "Courses", table: "courses", name: "name" },
  { id: "exams", label: "Exams", table: "exams", name: "name" },
  { id: "careers", label: "Careers", table: "career_profiles", name: "name" },
  { id: "scholarships", label: "Scholarships", table: "scholarships", name: "title" },
  { id: "articles", label: "Articles", table: "articles", name: "title" },
  { id: "study_material", label: "Study Material", table: "study_subjects", name: "name" },
  { id: "college_study", label: "College Study", table: "college_universities", name: "name" },
  { id: "cat_universe", label: "CAT Universe", table: "cat_universe_modules", name: "title" },
] as const;

const terminalStatuses = new Set(["completed", "cancelled", "failed"]);

async function invokeCleaner(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-data-cleaner", { body });
  if (error) {
    let message = error.message;
    try {
      const response = (error as any).context as Response | undefined;
      if (response) message = (await response.clone().json())?.error || message;
    } catch { /* keep SDK message */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Calculating...";
  if (seconds < 60) return `${Math.ceil(seconds)} sec`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} hr`;
}

export default function AdminDataCleaner() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedTypes = (searchParams.get("types") || "").split(",").filter((id) => ENTITY_OPTIONS.some((option) => option.id === id));
  const [selectedTypes, setSelectedTypes] = useState<string[]>(requestedTypes.length ? requestedTypes : ["colleges"]);
  const [batchSize, setBatchSize] = useState(100);
  const [maxRecords, setMaxRecords] = useState(100);
  const [autoApply, setAutoApply] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [excludeType, setExcludeType] = useState("colleges");
  const [excludeSearch, setExcludeSearch] = useState("");
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  const counts = useQuery({
    queryKey: ["data-cleaner-counts"],
    queryFn: async () => {
      const pairs = await Promise.all(ENTITY_OPTIONS.map(async (entity) => {
        const { count } = await (supabase as any).from(entity.table).select("id", { count: "exact", head: true });
        return [entity.id, count || 0] as const;
      }));
      return Object.fromEntries(pairs) as Record<string, number>;
    },
    staleTime: 5 * 60_000,
  });

  const jobs = useQuery({
    queryKey: ["data-cleaning-jobs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("data_cleaning_jobs").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: (query) => (query.state.data || []).some((job: any) => !terminalStatuses.has(job.status) && job.status !== "paused") ? 3000 : false,
  });

  const activeJob = useMemo(() => {
    const rows = jobs.data || [];
    return rows.find((job: any) => job.id === selectedJob) || rows[0] || null;
  }, [jobs.data, selectedJob]);

  const items = useQuery({
    queryKey: ["data-cleaning-items", activeJob?.id],
    enabled: !!activeJob?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("data_cleaning_items").select("*").eq("job_id", activeJob.id).order("updated_at", { ascending: false }).limit(150);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: activeJob && !terminalStatuses.has(activeJob.status) && activeJob.status !== "paused" ? 3000 : false,
  });

  const exclusions = useQuery({
    queryKey: ["data-cleaning-exclusions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("data_cleaning_exclusions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const exclusionResults = useQuery({
    queryKey: ["data-cleaner-exclusion-search", excludeType, excludeSearch],
    enabled: excludeSearch.trim().length >= 2,
    queryFn: async () => {
      const entity = ENTITY_OPTIONS.find((option) => option.id === excludeType)!;
      const { data, error } = await (supabase as any).from(entity.table).select(`id,slug,${entity.name}`).ilike(entity.name, `%${excludeSearch.trim()}%`).limit(20);
      if (error) throw error;
      return (data || []).map((row: any) => ({ ...row, entity_name: row[entity.name] }));
    },
  });

  const action = useMutation({
    mutationFn: invokeCleaner,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["data-cleaning-jobs"] }),
        qc.invalidateQueries({ queryKey: ["data-cleaning-items"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const start = async () => {
    if (!selectedTypes.length) return toast.error("Select at least one content type");
    try {
      const data = await action.mutateAsync({
        action: "start", entity_types: selectedTypes, batch_size: batchSize,
        max_records: maxRecords > 0 ? maxRecords : null, apply_mode: autoApply ? "auto_apply" : "review",
      });
      setSelectedJob(data.job_id);
      toast.success("Official-source cleaning job started");
    } catch { /* mutation already reports */ }
  };

  const addExclusion = async (row: any) => {
    const { error } = await (supabase as any).from("data_cleaning_exclusions").upsert({
      entity_type: excludeType, entity_id: String(row.id), entity_slug: row.slug,
      entity_name: row.entity_name, reason: "Excluded in Clean Data admin",
    }, { onConflict: "entity_type,entity_id" });
    if (error) return toast.error(error.message);
    setExcludeSearch("");
    await qc.invalidateQueries({ queryKey: ["data-cleaning-exclusions"] });
    toast.success(`${row.entity_name} excluded`);
  };

  const removeExclusion = async (id: string) => {
    const { error } = await (supabase as any).from("data_cleaning_exclusions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["data-cleaning-exclusions"] });
  };

  const progress = activeJob?.total_items ? Math.round((activeJob.processed_items / activeJob.total_items) * 100) : 0;
  const elapsedSeconds = activeJob?.started_at ? Math.max(1, (Date.now() - new Date(activeJob.started_at).getTime()) / 1000) : 0;
  const rate = activeJob?.processed_items ? elapsedSeconds / activeJob.processed_items : 45;
  const remainingSeconds = Math.max(0, (activeJob?.total_items - activeJob?.processed_items) * rate);
  const currentBatch = activeJob ? Math.min(Math.ceil(Math.max(1, activeJob.processed_items + 1) / activeJob.batch_size), Math.max(1, Math.ceil(activeJob.total_items / activeJob.batch_size))) : 1;
  const totalBatches = activeJob ? Math.max(1, Math.ceil(activeJob.total_items / activeJob.batch_size)) : 1;

  return (
    <AdminLayout title="Clean Data - Official Source AI">
      <div className="space-y-5">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-primary p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold"><ShieldCheck className="h-4 w-4" /> Official sources only</div>
              <h1 className="text-2xl font-black md:text-3xl">Clean, verify and modernise your content database</h1>
              <p className="mt-2 text-sm leading-6 text-blue-100/80">Claude researches current first-party sources, validates every proposed field, repairs formats, and creates SEO/GEO/AEO-ready copy. Third-party college directories are blocked.</p>
            </div>
            <Button onClick={start} disabled={action.isPending || !selectedTypes.length} size="lg" className="h-12 rounded-2xl bg-white text-slate-950 hover:bg-blue-50">
              {action.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />} Start cleaning
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <Card className="rounded-3xl">
            <CardHeader><CardTitle>1. Choose content</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {ENTITY_OPTIONS.map((entity) => {
                  const checked = selectedTypes.includes(entity.id);
                  return (
                    <button key={entity.id} type="button" onClick={() => setSelectedTypes((current) => checked ? current.filter((id) => id !== entity.id) : [...current, entity.id])}
                      className={`rounded-2xl border p-4 text-left transition ${checked ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-border hover:border-primary/30"}`}>
                      <div className="flex items-center justify-between"><span className="font-bold">{entity.label}</span><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checked ? "border-primary bg-primary text-white" : "border-border"}`}>{checked && <Check className="h-3 w-3" />}</span></div>
                      <p className="mt-1 text-xs text-muted-foreground">{(counts.data?.[entity.id] || 0).toLocaleString("en-IN")} records</p>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div><Label>Queue batch size</Label><Input type="number" min={1} max={500} value={batchSize} onChange={(e) => setBatchSize(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} /><p className="mt-1 text-[11px] text-muted-foreground">Recommended: 100</p></div>
                <div><Label>Maximum records this run</Label><Input type="number" min={0} value={maxRecords} onChange={(e) => setMaxRecords(Math.max(0, Number(e.target.value) || 0))} /><p className="mt-1 text-[11px] text-muted-foreground">0 means all selected records</p></div>
                <div className="rounded-2xl border p-3"><div className="flex items-center justify-between gap-3"><div><Label>Auto-apply verified changes</Label><p className="text-[11px] text-muted-foreground">Off keeps changes for review</p></div><Switch checked={autoApply} onCheckedChange={setAutoApply} /></div></div>
              </div>
              {autoApply && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Only changes with at least 95% evidence confidence and matching official-domain citations are applied. Uncertain facts stay unchanged and are highlighted in red. Identity, slugs, ratings, reviews and commercial priority fields remain protected.</div>}
              <p className="text-xs text-muted-foreground">Cost guardrail: begin with 100 records in review mode. Each record can use up to five Claude web searches plus generation tokens, so processing all 13,000+ records is intentionally never started automatically.</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader><CardTitle>2. Exclude records</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-[130px_1fr] gap-2">
                <select value={excludeType} onChange={(e) => setExcludeType(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm">
                  {ENTITY_OPTIONS.map((entity) => <option key={entity.id} value={entity.id}>{entity.label}</option>)}
                </select>
                <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={excludeSearch} onChange={(e) => setExcludeSearch(e.target.value)} placeholder="Search to exclude..." className="pl-9" /></div>
              </div>
              {!!exclusionResults.data?.length && <div className="max-h-48 overflow-y-auto rounded-xl border bg-background p-1">{exclusionResults.data.map((row: any) => <button key={row.id} type="button" onClick={() => addExclusion(row)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"><span className="font-medium">{row.entity_name}</span><span className="ml-2 text-xs text-muted-foreground">{row.slug}</span></button>)}</div>}
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {(exclusions.data || []).map((row: any) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{row.entity_name}</p><p className="text-[10px] uppercase text-muted-foreground">{row.entity_type}</p></div><Button size="icon" variant="ghost" onClick={() => removeExclusion(row.id)}><Trash2 className="h-4 w-4" /></Button></div>)}
                {!exclusions.data?.length && <p className="py-6 text-center text-xs text-muted-foreground">No exclusions - all selected records are eligible.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {activeJob && <Card className="rounded-3xl overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><div className="flex items-center gap-2"><CardTitle>Live cleaning progress</CardTitle><Badge variant={activeJob.status === "completed" ? "default" : "secondary"}>{activeJob.status}</Badge><Badge variant="outline">Batch {currentBatch} of {totalBatches}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{activeJob.message}{activeJob.current_name ? ` - ${activeJob.current_name}` : ""}</p></div>
              <div className="flex flex-wrap gap-2">
                {activeJob.status === "paused" ? <Button variant="outline" onClick={() => action.mutate({ action: "resume", job_id: activeJob.id })}><CirclePlay className="mr-2 h-4 w-4" />Resume</Button> : !terminalStatuses.has(activeJob.status) && <Button variant="outline" onClick={() => action.mutate({ action: "pause", job_id: activeJob.id })}><CirclePause className="mr-2 h-4 w-4" />Pause</Button>}
                {!terminalStatuses.has(activeJob.status) && <Button variant="outline" className="text-destructive" onClick={() => action.mutate({ action: "cancel", job_id: activeJob.id })}><X className="mr-2 h-4 w-4" />Cancel</Button>}
                <select value={activeJob.id} onChange={(e) => setSelectedJob(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm">{(jobs.data || []).map((job: any) => <option key={job.id} value={job.id}>{new Date(job.created_at).toLocaleString()} - {job.status}</option>)}</select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div><div className="mb-2 flex justify-between text-sm"><span>{activeJob.processed_items.toLocaleString()} of {activeJob.total_items.toLocaleString()}</span><span className="font-bold">{progress}%</span></div><Progress value={progress} className="h-3" /></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {[['Updated',activeJob.updated_items,'text-emerald-600'],['Review',activeJob.review_items,'text-blue-600'],['Skipped',activeJob.skipped_items,'text-amber-600'],['Failed',activeJob.failed_items,'text-red-600'],['Remaining',Math.max(0,activeJob.total_items-activeJob.processed_items),'text-slate-700'],['ETA',formatDuration(remainingSeconds),'text-primary']].map(([label,value,color]) => <div key={String(label)} className="rounded-2xl border p-3"><p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-black ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p></div>)}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Latest record results</h3><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />Updates every 3 seconds</span></div>{activeJob.review_items > 0 && <Button onClick={() => action.mutate({ action: "approve_all", job_id: activeJob.id })} disabled={action.isPending}><CheckCheck className="mr-2 h-4 w-4" />Approve all verified ({activeJob.review_items})</Button>}</div>
              {(items.data || []).map((item: any) => <div key={item.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{item.entity_name}</p><Badge variant="outline">{item.entity_type}</Badge><Badge variant={item.status === 'updated' ? 'default' : item.status === 'failed' || (item.status === 'skipped' && item.error_message) ? 'destructive' : 'secondary'}>{item.status}</Badge>{item.confidence != null && <span className={`text-xs font-semibold ${Number(item.confidence) < .95 ? 'text-red-600' : 'text-emerald-600'}`}>{Math.round(Number(item.confidence)*100)}% evidence confidence</span>}</div><p className={`mt-1 text-xs ${item.error_message ? 'text-red-600' : 'text-muted-foreground'}`}>{item.changed_fields?.length ? `${item.changed_fields.length} fields: ${item.changed_fields.join(', ')}` : item.error_message || 'Researching official sources...'}</p>{item.official_url && <a href={item.official_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Official source <ExternalLink className="h-3 w-3" /></a>}</div>
                  {item.status === "review" && <div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setPreviewItem(item)}><Eye className="mr-1 h-3 w-3" />Page preview</Button><Button size="sm" onClick={() => action.mutate({ action: "approve", item_id: item.id })}><Check className="mr-1 h-3 w-3" />Approve</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ action: "reject", item_id: item.id })}>Reject</Button></div>}
                </div>
                {item.status === "review" && item.proposed_data && <details className="mt-3 rounded-xl bg-muted/50 p-3"><summary className="cursor-pointer text-xs font-bold">Review proposed values</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-[11px]">{JSON.stringify(item.proposed_data, null, 2)}</pre></details>}
              </div>)}
              {!items.data?.length && <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">Waiting for the first record...</div>}
            </div>
          </CardContent>
        </Card>}
      </div>
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Verified page preview - {previewItem?.entity_name}</DialogTitle></DialogHeader>{previewItem && <div className="space-y-5"><div className="overflow-hidden rounded-3xl border bg-background"><div className="relative h-52 bg-gradient-to-br from-blue-950 to-primary">{(previewItem.proposed_data?.image || previewItem.before_data?.image) && <img src={previewItem.proposed_data?.image || previewItem.before_data?.image} alt="" className="h-full w-full object-cover opacity-55" />}<div className="absolute inset-0 flex items-end p-6"><div><Badge className="mb-2 bg-emerald-600">Officially sourced</Badge><h2 className="text-3xl font-black text-white">{previewItem.proposed_data?.name || previewItem.proposed_data?.title || previewItem.entity_name}</h2><p className="text-blue-100">{[previewItem.proposed_data?.city, previewItem.proposed_data?.state].filter(Boolean).join(', ')}</p></div></div></div><div className="grid gap-4 p-6 md:grid-cols-2">{Object.entries(previewItem.proposed_data || {}).filter(([key]) => !['image','logo','carousel_images','gallery_images'].includes(key)).map(([key, value]) => <div key={key} className="rounded-2xl border p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{key.replace(/_/g, ' ')}</p><div className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-sm">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</div></div>)}</div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"><strong>Evidence:</strong> {(previewItem.source_urls || []).map((url: string) => <a key={url} href={url} target="_blank" rel="noreferrer" className="ml-2 underline">{new URL(url).hostname}</a>)}</div></div>}</DialogContent></Dialog>
    </AdminLayout>
  );
}
