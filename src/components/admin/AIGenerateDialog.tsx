import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CheckCircle2, PlusCircle, RefreshCw, ShieldCheck, Cpu, Search, ImageIcon, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";

type EntityType = "colleges" | "courses" | "exams" | "scholarships" | "careers" | "articles"
  | "promoted_programs" | "companies" | "approval_bodies" | "faqs" | "landing_pages"
  | "study_subjects" | "study_chapters" | "study_resources" | "study_boards";

interface Props {
  entityType: EntityType;
  table: string;
  upsertKey?: string;
  onDone?: () => void;
  label?: string;
}

/** Friendly model menu. Static fallbacks (Lovable AI Gateway) + any providers the
 *  admin has saved keys for in Admin → AI Providers. When a provider with a key
 *  exists for ChatGPT / Claude / Grok / Gemini, that direct provider is used. */
type ModelOption = { value: string; label: string; hint: string; tone: string };
const STATIC_MODELS: ModelOption[] = [
  { value: "gemini",     label: "Gemini 2.5 Pro",   hint: "Best for India research · long-form HTML", tone: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-700" },
  { value: "gpt-5",      label: "ChatGPT (GPT-5)",  hint: "Sharp prose · strong structured output",   tone: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-700" },
  { value: "gpt-5-pro",  label: "GPT-5.4 Pro",      hint: "Deep reasoning · official-source audits",  tone: "from-violet-500/15 to-violet-500/5 border-violet-500/30 text-violet-700" },
  { value: "claude",     label: "Claude (gateway)", hint: "Falls back to GPT-5.4 Pro without a key",  tone: "from-orange-500/15 to-orange-500/5 border-orange-500/30 text-orange-700" },
  { value: "grok",       label: "Grok (gateway)",   hint: "Falls back to Gemini without a key",       tone: "from-zinc-500/15 to-zinc-500/5 border-zinc-500/30 text-zinc-700" },
];
const ARTICLE_RESEARCH_SOURCES = [
  "https://www.shiksha.com/news",
  "https://www.careers360.com/articles",
  "https://news.kollegeapply.com",
  "https://collegedunia.com/news",
  "https://www.collegedekho.com/news",
  "https://www.pagalguy.com/mba/articles",
  "https://www.dekhocampus.com/news",
  "https://www.dekhocampus.in/news",
];
const WORD_LIMITS = [
  { value: 900, label: "Quick", hint: "900 words" },
  { value: 1300, label: "Balanced", hint: "1,300 words" },
  { value: 1800, label: "Deep", hint: "1,800 words" },
];

type ItemRow = Record<string, any> & { _action?: "insert" | "upsert"; _key?: string };

export function AIGenerateDialog({ entityType, table, upsertKey = "slug", onDone, label }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [modelUsed, setModelUsed] = useState<string>("");
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0);
  const [mode, setMode] = useState<"all" | "insert_only" | "upsert_only">("all");

  // Brief
  const [authors, setAuthors] = useState<{ id: string; name: string; designation: string }[]>([]);
  const [authorId, setAuthorId] = useState<string>("");
  const [model, setModel] = useState<string>("gemini");
  const [tone, setTone] = useState("Authoritative-yet-friendly");
  const [audience, setAudience] = useState("Indian students & parents");
  const [depth, setDepth] = useState<"concise" | "standard" | "in-depth">("in-depth");
  const [language, setLanguage] = useState<"English" | "Hindi" | "Bilingual">("English");
  const [region, setRegion] = useState("India");
  const [status, setStatus] = useState<"Draft" | "Published">("Draft");
  const [automaticResearch, setAutomaticResearch] = useState(true);
  const [researchCompetitors, setResearchCompetitors] = useState(true);
  const [researchTrends, setResearchTrends] = useState(true);
  const [researchViral, setResearchViral] = useState(true);
  const [checkOwnNews, setCheckOwnNews] = useState(true);
  const [wordLimit, setWordLimit] = useState(1300);
  const [researchSources, setResearchSources] = useState(ARTICLE_RESEARCH_SOURCES.join("\n"));

  const [providerOptions, setProviderOptions] = useState<ModelOption[]>(STATIC_MODELS);

  useEffect(() => {
    if (!open) return;
    (supabase as any).from("authors").select("id,name,designation").eq("is_active", true).order("display_order")
      .then(({ data }: any) => setAuthors(data || []));
    // Load saved provider keys → append direct-key options at the front
    (supabase as any).from("ai_providers").select("provider_name,display_name,api_key_encrypted,default_model,icon_emoji")
      .then(({ data }: any) => {
        const live: ModelOption[] = (data || [])
          .filter((p: any) => p.api_key_encrypted && p.api_key_encrypted.length > 4)
          .map((p: any) => ({
            value: p.provider_name,
            label: `${p.icon_emoji || "🤖"} ${p.display_name}`,
            hint: `Your key · ${p.default_model}`,
            tone: "from-primary/15 to-primary/5 border-primary/40 text-primary",
          }));
        // De-dup with static by value
        const merged = [
          ...live,
          ...STATIC_MODELS.filter(s => !live.some(l => l.value === s.value)),
        ];
        setProviderOptions(merged);
      });
  }, [open]);

  const authorName = authors.find(a => a.id === authorId)?.name;
  const counts = useMemo(() => ({
    insert: items.filter(i => i._action === "insert").length,
    upsert: items.filter(i => i._action === "upsert").length,
    total: items.length,
  }), [items]);
  const visible = useMemo(() =>
    mode === "all" ? items : items.filter(i => i._action === (mode === "insert_only" ? "insert" : "upsert")),
    [items, mode]);

  const reset = () => { setTopic(""); setNames(""); setItems([]); setModelUsed(""); setDuplicatesSkipped(0); setMode("all"); };

  const generate = async () => {
    const nameList = names.split("\n").map(s => s.trim()).filter(Boolean);
    if (!topic.trim() && nameList.length === 0 && !(entityType === "articles" && automaticResearch)) {
      toast.error("Enter a topic or at least one name");
      return;
    }
    setBusy(true); setItems([]);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-generate", {
        body: {
          entity_type: entityType,
          topic: topic.trim() || undefined,
          names: nameList.length ? nameList : undefined,
          count,
          options: {
            author_id: authorId || null,
            author_name: authorName || null,
            tone, audience, depth, language, region,
            status, is_active: true,
            model,
            automatic_research: entityType === "articles" ? automaticResearch : false,
            research_competitors: entityType === "articles" ? researchCompetitors : false,
            research_trends: entityType === "articles" ? researchTrends : false,
            research_viral: entityType === "articles" ? researchViral : false,
            check_own_news: entityType === "articles" ? checkOwnNews : false,
            competitor_sources: entityType === "articles" ? researchSources.split("\n").map(s => s.trim()).filter(Boolean) : undefined,
            word_limit: entityType === "articles" ? wordLimit : undefined,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: ItemRow[] = (data?.items || []).map((r: any) => ({
        ...r,
        ...(upsertKey === "slug" ? { slug: r.slug || slugify(r.name || r.title || "") } : {}),
      }));
      setItems(list);
      setModelUsed(data?.model_used || "");
      setDuplicatesSkipped(data?.duplicate_titles_skipped?.length || 0);
      const c = data?.counts || { inserts: list.filter(i => i._action === "insert").length, upserts: list.filter(i => i._action === "upsert").length };
      if (list.length === 0) toast.info("AI returned no records - try a more specific topic");
      else toast.success(`Preflight ready · ${c.inserts} new · ${c.upserts} updates${data?.duplicate_titles_skipped?.length ? ` · ${data.duplicate_titles_skipped.length} duplicate skipped` : ""}`);
    } catch (e: any) {
      toast.error(`AI failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const uploadCover = async (row: ItemRow) => {
    return entityType === "articles" ? row.featured_image || "" : "";
  };

  const commit = async () => {
    const payload = visible.map(({ _action, _key, ...r }) => r);
    if (!payload.length) return;
    setBusy(true);
    try {
      if (entityType === "articles") {
        let written = 0;
        for (const row of payload) {
          const { entity_suggestions, research_notes, cover_svg, cover_kicker, ...articleRow } = row;
          const featuredImage = await uploadCover(row);
          const normalized = {
            ...articleRow,
            featured_image: featuredImage || articleRow.featured_image || "",
            status: articleRow.status === "published" ? "Published" : articleRow.status === "draft" ? "Draft" : articleRow.status || status,
            tags: Array.from(new Set([...(Array.isArray(articleRow.tags) ? articleRow.tags : []), automaticResearch ? "research-assisted" : "ai-assisted"])),
          };
          const { data: article, error } = await (supabase as any)
            .from(table)
            .upsert(normalized, { onConflict: upsertKey, ignoreDuplicates: false })
            .select("id")
            .single();
          if (error) throw error;
          written += 1;
          const suggestions = Array.isArray(entity_suggestions) ? entity_suggestions : [];
          for (const suggestion of suggestions) {
            if (!suggestion?.entity_type || !suggestion?.entity_slug) continue;
            await (supabase as any).from("article_links").upsert({
              article_id: article.id,
              entity_type: suggestion.entity_type,
              entity_slug: suggestion.entity_slug,
            }, { onConflict: "article_id,entity_type,entity_slug" });
          }
        }
        toast.success(`Wrote ${written} article${written === 1 ? "" : "s"} with images and entity tags`);
        setOpen(false); reset(); onDone?.();
        return;
      }
      const chunk = 50;
      let written = 0;
      for (let i = 0; i < payload.length; i += chunk) {
        const batch = payload.slice(i, i + chunk);
        const { error } = await (supabase as any).from(table).upsert(batch, { onConflict: upsertKey, ignoreDuplicates: false });
        if (error) throw error;
        written += batch.length;
      }
      toast.success(`Wrote ${written} ${entityType} (${counts.insert} new, ${counts.upsert} updated)`);
      setOpen(false); reset(); onDone?.();
    } catch (e: any) {
      toast.error(`Write failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const selectedModel = providerOptions.find(m => m.value === model) ?? providerOptions[0] ?? STATIC_MODELS[0];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-primary/40 text-primary hover:bg-primary/10 rounded-xl"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="w-4 h-4" />
        {label || "AI Generate"}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border-border/60">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur z-10">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </span>
              AI Bulk {entityType} Generator
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-medium">
                <ShieldCheck className="w-3 h-3" /> Official-source only
              </span>
              <span>·</span>
              <span>Fills every column · Auto-interlinks DB · Preflight preview</span>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {entityType === "articles" ? (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm"><b>Blog providers:</b> Claude generates text and OpenAI GPT Image generates branded WebP covers. Configure both under Admin - AI Providers.</div>
            ) : <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">AI Model</Label>
                <span className="text-xs text-muted-foreground">- pick the brain that researches & writes</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {providerOptions.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setModel(m.value)}
                    className={`text-left rounded-xl border p-2.5 transition-all bg-gradient-to-br ${m.tone} ${
                      model === m.value
                        ? "ring-2 ring-primary border-primary scale-[1.02] shadow-sm"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{m.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 leading-snug">{m.hint}</div>
                  </button>
                ))}
              </div>
            </div>}

            {/* Inputs */}
            {entityType === "articles" && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    <div>
                      <Label className="text-sm font-semibold">Automatic research</Label>
                      <p className="text-xs text-muted-foreground">Competitor and DekhoCampus signals are used for topic gaps only. Output stays original and reviewable.</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant={automaticResearch ? "default" : "outline"} onClick={() => setAutomaticResearch(v => !v)} className="rounded-xl">
                    {automaticResearch ? "Research on" : "Research off"}
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Research channels</Label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                    {[
                      ["Competitors", researchCompetitors, setResearchCompetitors],
                      ["Google Trends", researchTrends, setResearchTrends],
                      ["Viral searches", researchViral, setResearchViral],
                      ["Check our news", checkOwnNews, setCheckOwnNews],
                    ].map(([channel, enabled, setter]) => (
                      <Button
                        key={String(channel)}
                        type="button"
                        size="sm"
                        variant={enabled ? "default" : "outline"}
                        onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(value => !value)}
                        className="rounded-xl"
                      >
                        {String(channel)} · {enabled ? "on" : "off"}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Leave Topic empty to discover current education stories automatically. Existing DekhoCampus titles are excluded before preview.</p>
                </div>
                <div>
                  <Label className="text-xs">Word limit options</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {WORD_LIMITS.map(option => (
                      <Button key={option.value} type="button" size="sm" variant={wordLimit === option.value ? "default" : "outline"} onClick={() => setWordLimit(option.value)} className="rounded-xl">
                        {option.label} · {option.hint}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Research sources</Label>
                  <Textarea
                    rows={4}
                    value={researchSources}
                    onChange={(e) => setResearchSources(e.target.value)}
                    className="rounded-lg mt-1.5 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Topic (AI expands to a list)</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    placeholder="e.g. top engineering colleges in Delhi"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="rounded-lg"
                  />
                  <Input
                    type="number" min={1} max={20} value={count}
                    onChange={(e) => setCount(Number(e.target.value) || 5)}
                    className="w-20 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Explicit names (one per line)</Label>
                <Textarea
                  rows={3}
                  placeholder={`IIT Delhi\nIIT Bombay\nBITS Pilani`}
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  className="rounded-lg mt-1.5"
                />
              </div>
            </div>

            {/* Brief */}
            <details className="rounded-xl border border-border bg-muted/20 group" open>
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold flex items-center justify-between">
                Content brief
                <span className="text-xs text-muted-foreground font-normal">tone · audience · depth · author</span>
              </summary>
              <div className="px-4 pb-4 grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Content writer (author)</Label>
                  <select value={authorId} onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm">
                    <option value="">- Unassigned -</option>
                    {authors.map(a => (
                      <option key={a.id} value={a.id}>{a.name}{a.designation ? ` · ${a.designation}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Tone / Voice</Label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm">
                    {["Authoritative-yet-friendly","Professional","Conversational","Expert / Academic","Inspirational","Concise news-desk"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Target audience</Label>
                  <select value={audience} onChange={(e) => setAudience(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm">
                    {["Indian students & parents","Class 10-12 students","UG aspirants","PG aspirants","Working professionals","Counsellors / educators","NRI / Study Abroad aspirants"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Depth</Label>
                  <select value={depth} onChange={(e) => setDepth(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm">
                    <option value="concise">Concise</option>
                    <option value="standard">Standard</option>
                    <option value="in-depth">In-depth (long-form)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Language</Label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm">
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Bilingual">Bilingual (Hinglish)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Region focus</Label>
                  <Input value={region} onChange={(e) => setRegion(e.target.value)} className="h-9 rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Publish status (after write)</Label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm">
                    <option value="Draft">Draft (review before publishing)</option>
                    <option value="Published">Published immediately</option>
                  </select>
                </div>
              </div>
            </details>

            {/* Generate */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button onClick={generate} disabled={busy} className="gap-2 rounded-xl shadow-sm">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {items.length ? "Re-generate preview" : "Generate preview"}
              </Button>
              <div className="text-xs text-muted-foreground">
                Using <span className="font-semibold text-foreground">{selectedModel.label}</span>
                {modelUsed && <> · resolved to <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{modelUsed}</code></>}
              </div>
            </div>

            {/* Preflight preview */}
            {items.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex flex-wrap items-center gap-3 bg-muted/30">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Preflight · {counts.total} records
                  </div>
                  <button onClick={() => setMode("all")}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${mode === "all" ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}>
                    All {counts.total}
                  </button>
                  <button onClick={() => setMode("insert_only")}
                    className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition ${mode === "insert_only" ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"}`}>
                    <PlusCircle className="w-3 h-3" /> New {counts.insert}
                  </button>
                  <button onClick={() => setMode("upsert_only")}
                    className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition ${mode === "upsert_only" ? "bg-amber-600 text-white border-amber-600" : "border-amber-500/40 text-amber-700 hover:bg-amber-500/10"}`}>
                    <RefreshCw className="w-3 h-3" /> Update {counts.upsert}
                  </button>
                  <span className="text-[11px] text-muted-foreground ml-auto">Unique key: <code className="bg-muted px-1.5 py-0.5 rounded">{upsertKey}</code></span>
                  {duplicatesSkipped > 0 && <span className="text-[11px] text-amber-700">{duplicatesSkipped} existing topic{duplicatesSkipped === 1 ? "" : "s"} excluded</span>}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                  {visible.map((r, i) => {
                    const isInsert = r._action === "insert";
                    return (
                      <div key={i} className="px-4 py-2 flex items-center gap-3 hover:bg-muted/30">
                        <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isInsert
                            ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                        }`}>
                          {isInsert ? "+ Insert" : "↻ Update"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.name || r.title || r.question || r._key}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{r._key}</div>
                          {entityType === "articles" && Array.isArray(r.entity_suggestions) && r.entity_suggestions.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Link2 className="w-3 h-3" />
                              {r.entity_suggestions.slice(0, 4).map((s: any) => s.label || s.entity_slug).join(" · ")}
                            </div>
                          )}
                        </div>
                        {entityType === "articles" && r.featured_image && (
                          <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Image ready
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {visible.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">No records match this filter.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 sticky bottom-0">
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button onClick={commit} disabled={busy || visible.length === 0} className="rounded-xl gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Commit {visible.length || ""} to DB
              {visible.length > 0 && (
                <span className="text-[10px] opacity-80 ml-1">
                  ({visible.filter(v => v._action === "insert").length} new · {visible.filter(v => v._action === "upsert").length} update)
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
