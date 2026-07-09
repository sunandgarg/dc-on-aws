import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import {
  useCollegePrograms,
  useCollegeUniversities,
  useCollegeSemesters,
  useCollegeSubjects,
} from "@/hooks/useCollegeStudy";

type Props = { articleId: string; onDone?: () => void };
type Linked = { id: string; entity_type: string; entity_slug: string };

type Step = 1 | 2 | 3 | 4;

export function CollegeStudyTagger({ articleId, onDone }: Props) {
  const qc = useQueryClient();
  const [program, setProgram] = useState<string>("");
  const [university, setUniversity] = useState<string>("");
  const [activeSem, setActiveSem] = useState<number | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: programs = [] } = useCollegePrograms();
  const { data: unis = [] } = useCollegeUniversities(program || undefined);
  const { data: semesters = [] } = useCollegeSemesters(program || undefined, university || undefined);
  const { data: subjects = [] } = useCollegeSubjects(program || undefined, university || undefined, activeSem ?? undefined);

  const { data: links = [] } = useQuery({
    queryKey: ["article-college-links", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_links")
        .select("*")
        .eq("article_id", articleId)
        .in("entity_type", ["college_program", "college_university", "college_semester", "college_subject"]);
      if (error) throw error;
      return (data || []) as Linked[];
    },
  });

  useEffect(() => { setUniversity(""); setActiveSem(null); }, [program]);
  useEffect(() => { setActiveSem(null); }, [university]);

  const key = (t: string, s: string) => `${t}::${s}`;
  const isLinked = (type: string, slug: string) => links.some((l) => l.entity_type === type && l.entity_slug === slug);
  const isPending = (type: string, slug: string) => pending.has(key(type, slug));

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["article-college-links", articleId] });
    qc.invalidateQueries({ queryKey: ["article-links-summary", articleId] });
  };

  const toggle = async (entity_type: string, entity_slug: string) => {
    const k = key(entity_type, entity_slug);
    if (pending.has(k)) return;
    setError(null);
    setPending((p) => new Set(p).add(k));
    const existing = links.find((l) => l.entity_type === entity_type && l.entity_slug === entity_slug);
    try {
      if (existing) {
        const { error } = await supabase.from("article_links").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("article_links").insert({ article_id: articleId, entity_type, entity_slug });
        if (error) throw error;
      }
      await refresh();
    } catch (e: any) {
      const msg = e?.message || "Save failed. Your previous selection is unchanged.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(k); return n; });
    }
  };

  const bulkLink = async (entity_type: string, slugs: string[], label: string) => {
    if (!slugs.length) return;
    setError(null);
    setBulkBusy(entity_type);
    try {
      const toInsert = slugs
        .filter((s) => !isLinked(entity_type, s))
        .map((entity_slug) => ({ article_id: articleId, entity_type, entity_slug }));
      if (toInsert.length === 0) {
        toast.message(`All ${label} already linked.`);
      } else {
        const { error } = await supabase.from("article_links").insert(toInsert);
        if (error) throw error;
        toast.success(`Linked all ${label} (${toInsert.length})`);
        await refresh();
      }
    } catch (e: any) {
      const msg = e?.message || "Bulk link failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBulkBusy(null);
    }
  };

  const bulkUnlink = async (entity_type: string, slugs: string[], label: string) => {
    if (!slugs.length) return;
    setError(null);
    setBulkBusy(entity_type);
    try {
      const ids = links
        .filter((l) => l.entity_type === entity_type && slugs.includes(l.entity_slug))
        .map((l) => l.id);
      if (ids.length === 0) {
        toast.message(`No linked ${label} to remove.`);
      } else {
        const { error } = await supabase.from("article_links").delete().in("id", ids);
        if (error) throw error;
        toast.success(`Unlinked all ${label} (${ids.length})`);
        await refresh();
      }
    } catch (e: any) {
      const msg = e?.message || "Bulk unlink failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBulkBusy(null);
    }
  };

  const handleDone = () => {
    if (pending.size > 0 || bulkBusy) {
      toast.message("Waiting for pending saves…");
      return;
    }
    toast.success(`Done. ${links.length} link${links.length === 1 ? "" : "s"} saved.`);
    onDone?.();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.size, bulkBusy, links.length, onDone]);

  const currentStep: Step = !program ? 1 : !university ? 2 : !activeSem ? 3 : 4;

  // Counts of linked items for current scope
  const linkedUnisOfProgram = useMemo(
    () => unis.filter((u) => isLinked("college_university", u.slug)).length,
    [unis, links]
  );
  const allUniSlugs = unis.map((u) => u.slug);
  const semSlugs = useMemo(
    () => semesters.map((s) => `${program}/${university}/semester-${s.semester_num}`),
    [semesters, program, university]
  );
  const subjectSlugs = useMemo(
    () => subjects.map((s) => `${program}/${university}/semester-${activeSem}/${s.slug}`),
    [subjects, program, university, activeSem]
  );

  const Chip = ({ active, busy, onClick, children }: { active: boolean; busy: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      disabled={busy || !!bulkBusy}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs border transition-all inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed ${active ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border hover:border-primary/40"}`}
    >
      {busy && <Loader2 className="w-3 h-3 animate-spin" />}
      {children}
      {active && !busy && <Check className="w-3 h-3 ml-0.5" />}
    </button>
  );

  const StepHeader = ({ n, label, value, onReset }: { n: Step; label: string; value?: string; onReset?: () => void }) => (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</span>
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {value && <Badge variant="secondary" className="text-[10px] h-5">{value}</Badge>}
      </div>
      {value && onReset && (
        <button onClick={onReset} className="text-[10px] text-muted-foreground hover:text-foreground">Change</button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb / progress */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground overflow-x-auto pb-1">
        <span className={currentStep >= 1 ? "text-foreground font-semibold" : ""}>Program</span>
        <ChevronRight className="w-3 h-3" />
        <span className={currentStep >= 2 ? "text-foreground font-semibold" : ""}>University</span>
        <ChevronRight className="w-3 h-3" />
        <span className={currentStep >= 3 ? "text-foreground font-semibold" : ""}>Semester</span>
        <ChevronRight className="w-3 h-3" />
        <span className={currentStep >= 4 ? "text-foreground font-semibold" : ""}>Subjects</span>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-foreground">
        ✓ Auto-saves instantly. Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">⌘/Ctrl + Enter</kbd> or click <strong>Done</strong> when finished.
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start justify-between gap-2">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-70" aria-label="Dismiss error"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="bg-muted/30 rounded-xl p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Currently linked ({links.length})</p>
        <div className="flex flex-wrap gap-1.5">
          {links.length === 0 && <span className="text-xs text-muted-foreground">Nothing linked yet.</span>}
          {links.map((l) => (
            <Badge key={l.id} variant="secondary" className="text-[10px] gap-1">
              {l.entity_type.replace("college_", "")}: {l.entity_slug}
              <button
                disabled={isPending(l.entity_type, l.entity_slug) || !!bulkBusy}
                onClick={() => toggle(l.entity_type, l.entity_slug)}
                className="hover:text-destructive disabled:opacity-50"
                aria-label={`Remove ${l.entity_slug}`}
              >
                {isPending(l.entity_type, l.entity_slug) ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Step 1 - Program */}
      <div className="rounded-xl border border-border p-3">
        <StepHeader n={1} label="Pick Program / Course" value={program || undefined} onReset={program ? () => setProgram("") : undefined} />
        {!program ? (
          <div className="flex flex-wrap gap-1.5">
            {programs.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setProgram(p.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all hover:border-primary/40 ${isLinked("college_program", p.slug) ? "bg-primary/10 border-primary/40 text-foreground" : "bg-card border-border"}`}
              >
                {p.icon_emoji} {p.name}
                {isLinked("college_program", p.slug) && <Check className="w-3 h-3 inline ml-1 text-primary" />}
              </button>
            ))}
          </div>
        ) : (
          <Button size="sm" variant={isLinked("college_program", program) ? "secondary" : "outline"} className="h-7 text-xs" disabled={isPending("college_program", program)} onClick={() => toggle("college_program", program)}>
            {isPending("college_program", program) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {isLinked("college_program", program) ? "✓ Program linked - click to unlink" : `Link program "${program}"`}
          </Button>
        )}
      </div>

      {/* Step 2 - University */}
      {program && (
        <div className="rounded-xl border border-border p-3">
          <StepHeader n={2} label="Pick University" value={university || undefined} onReset={university ? () => setUniversity("") : undefined} />

          {unis.length > 0 && (
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-[11px] text-muted-foreground">{linkedUnisOfProgram} of {unis.length} linked</p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!!bulkBusy} onClick={() => bulkLink("college_university", allUniSlugs, "universities")}>
                  {bulkBusy === "college_university" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Link all universities
                </Button>
                {linkedUnisOfProgram > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={!!bulkBusy} onClick={() => bulkUnlink("college_university", allUniSlugs, "universities")}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {unis.map((u) => (
              <div key={u.slug} className="inline-flex rounded-lg overflow-hidden border border-border">
                <button
                  type="button"
                  disabled={isPending("college_university", u.slug) || !!bulkBusy}
                  onClick={() => toggle("college_university", u.slug)}
                  className={`px-3 py-1.5 text-xs inline-flex items-center gap-1 transition-all disabled:opacity-60 ${isLinked("college_university", u.slug) ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                >
                  {isPending("college_university", u.slug) && <Loader2 className="w-3 h-3 animate-spin" />}
                  {u.short_name || u.name}
                  {isLinked("college_university", u.slug) && !isPending("college_university", u.slug) && <Check className="w-3 h-3 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setUniversity(u.slug)}
                  className={`px-2 text-[10px] border-l border-border transition-all ${university === u.slug ? "bg-primary/15 text-primary" : "bg-card hover:bg-muted text-muted-foreground"}`}
                  title="Drill into semesters"
                >
                  Browse →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 - Semesters */}
      {program && university && (
        <div className="rounded-xl border border-border p-3">
          <StepHeader n={3} label={`Pick Semesters · ${university}`} value={activeSem ? `Sem ${activeSem}` : undefined} onReset={activeSem ? () => setActiveSem(null) : undefined} />

          {semesters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No semesters configured for this university.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-[11px] text-muted-foreground">{semSlugs.filter((s) => isLinked("college_semester", s)).length} of {semSlugs.length} linked</p>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!!bulkBusy} onClick={() => bulkLink("college_semester", semSlugs, "semesters")}>
                  {bulkBusy === "college_semester" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Link all semesters
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {semesters.map((s) => {
                  const slug = `${program}/${university}/semester-${s.semester_num}`;
                  const busy = isPending("college_semester", slug);
                  return (
                    <div key={s.id} className="inline-flex rounded-lg overflow-hidden border border-border">
                      <button
                        type="button"
                        disabled={busy || !!bulkBusy}
                        onClick={() => toggle("college_semester", slug)}
                        className={`px-3 py-1.5 text-xs inline-flex items-center gap-1 transition-all disabled:opacity-60 ${isLinked("college_semester", slug) ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                      >
                        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                        Sem {s.semester_num}
                        {isLinked("college_semester", slug) && !busy && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSem(s.semester_num)}
                        className={`px-2 text-[10px] border-l border-border transition-all ${activeSem === s.semester_num ? "bg-primary/15 text-primary" : "bg-card hover:bg-muted text-muted-foreground"}`}
                      >
                        Browse →
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4 - Subjects */}
      {program && university && activeSem && (
        <div className="rounded-xl border border-border p-3">
          <StepHeader n={4} label={`Pick Subjects · Sem ${activeSem}`} />
          {subjects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No subjects added for this semester yet.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-[11px] text-muted-foreground">{subjectSlugs.filter((s) => isLinked("college_subject", s)).length} of {subjectSlugs.length} linked</p>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!!bulkBusy} onClick={() => bulkLink("college_subject", subjectSlugs, "subjects")}>
                  {bulkBusy === "college_subject" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Link all subjects
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => {
                  const slug = `${program}/${university}/semester-${activeSem}/${s.slug}`;
                  return (
                    <Chip
                      key={s.id}
                      active={isLinked("college_subject", slug)}
                      busy={isPending("college_subject", slug)}
                      onClick={() => toggle("college_subject", slug)}
                    >
                      {s.name}{s.code ? ` (${s.code})` : ""}
                    </Chip>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 px-1 pt-3 pb-1 bg-gradient-to-t from-card via-card to-transparent border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{links.length}</span> link{links.length === 1 ? "" : "s"} saved
            {(pending.size > 0 || bulkBusy) && <span className="ml-2 inline-flex items-center gap-1 text-primary"><Loader2 className="w-3 h-3 animate-spin" /> saving…</span>}
          </p>
          <Button type="button" size="sm" className="rounded-lg" disabled={pending.size > 0 || !!bulkBusy} onClick={handleDone}>
            {(pending.size > 0 || bulkBusy) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
