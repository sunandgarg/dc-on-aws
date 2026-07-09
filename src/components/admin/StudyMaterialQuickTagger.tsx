import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GraduationCap, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { currentYear } from "@/lib/currentYear";

const CLASSES = [8, 9, 10, 11, 12];
const FALLBACK_BOARDS = [
  { slug: "cbse", name: "CBSE" },
  { slug: "icse", name: "ICSE" },
  { slug: "state", name: "State Board" },
  { slug: "ib", name: "IB" },
  { slug: "igcse", name: "IGCSE" },
];
// 4 primary quick-link dropdowns the user asked for
const QUICK_LINKS = [
  { slug: "syllabus", name: "Syllabus", emoji: "📋" },
  { slug: "sample-papers", name: "Sample Paper", emoji: "📝" },
  { slug: "date-sheet", name: "Date Sheet", emoji: "📅" },
  { slug: "result", name: "Result Update", emoji: "🏆" },
];
// 13 supporting resources
const RESOURCES = [
  { slug: "previous-papers", name: "Previous Year Papers", emoji: "📚" },
  { slug: "notes", name: "Chapter Notes", emoji: "📖" },
  { slug: "preparation-tips", name: "Preparation Tips", emoji: "💡" },
  { slug: "tips-tricks", name: "Tips & Tricks", emoji: "✨" },
  { slug: "answer-key", name: "Answer Key", emoji: "🔑" },
  { slug: "compartment-date-sheet", name: "Compartment Date Sheet", emoji: "📅" },
  { slug: "compartment-result", name: "Compartment Result", emoji: "🏆" },
  { slug: "admit-card", name: "Admit Card", emoji: "🎫" },
  { slug: "marksheet", name: "Marksheet", emoji: "📜" },
  { slug: "grading-system", name: "Grading System", emoji: "💯" },
  { slug: "exam-pattern", name: "Exam Pattern", emoji: "🧩" },
  { slug: "board", name: "Board Overview", emoji: "🏛️" },
  { slug: "revision-notes", name: "Revision Notes", emoji: "🗒️" },
];

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** When provided we also persist subject/chapter links into article_links. */
  articleId?: string;
}

/**
 * Multi-select study-material tagger:
 *   Class → Board → (multi quick-links + multi resources + multi subject→chapters)
 *   Single "Apply" writes tags + article_links rows in one shot.
 */
export function StudyMaterialQuickTagger({ tags, onChange, articleId }: Props) {
  const [enabled, setEnabled] = useState(tags.some(t => /^class-\d+/.test(t)) || tags.includes("study-material"));
  const [classNum, setClassNum] = useState<number>(12);
  const [board, setBoard] = useState("cbse");

  const [boards, setBoards] = useState(FALLBACK_BOARDS);
  const [subjects, setSubjects] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, { id: string; slug: string; name: string }[]>>({});
  const [busy, setBusy] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // multi-select state
  const [selSections, setSelSections] = useState<Set<string>>(new Set());
  const [selSubjects, setSelSubjects] = useState<Set<string>>(new Set());
  const [selChapters, setSelChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    (supabase as any).from("study_boards").select("slug,name").eq("is_active", true).order("display_order")
      .then(({ data }: any) => { if (data?.length) setBoards(data); });
  }, []);

  // Preload existing subject/chapter links for this article so they appear pre-selected on re-edit
  useEffect(() => {
    if (!articleId) return;
    setPreloading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("article_links")
          .select("entity_type, entity_slug")
          .eq("article_id", articleId)
          .in("entity_type", ["study_subject", "study_chapter"]);
        if (error) throw error;
        if (!data?.length) return;
        const subs = new Set<string>();
        const chs = new Set<string>();
        (data as any[]).forEach(r => {
          if (r.entity_type === "study_subject") subs.add(r.entity_slug);
          else if (r.entity_type === "study_chapter") chs.add(r.entity_slug);
        });
        setSelSubjects(subs);
        setSelChapters(chs);
        if (subs.size) {
          const { data: subjRow, error: subjErr } = await (supabase as any)
            .from("study_subjects")
            .select("class_num, board_slug")
            .eq("id", Array.from(subs)[0])
            .maybeSingle();
          if (subjErr) throw subjErr;
          if (subjRow) {
            setClassNum(subjRow.class_num);
            setBoard(subjRow.board_slug);
          }
        }
      } catch (e: any) {
        setErrorMsg(`Could not preload saved links: ${e?.message || e}`);
      } finally {
        setPreloading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  useEffect(() => {
    setChaptersBySubject({});
    (supabase as any).from("study_subjects")
      .select("id,slug,name")
      .eq("class_num", classNum).eq("board_slug", board).eq("is_active", true)
      .order("display_order")
      .then(({ data }: any) => setSubjects(data || []));
  }, [classNum, board]);

  // Load chapters for any newly selected subject
  useEffect(() => {
    const missing = Array.from(selSubjects).filter(id => !chaptersBySubject[id]);
    if (!missing.length) return;
    (async () => {
      const { data } = await (supabase as any).from("study_chapters")
        .select("id,slug,name,subject_id")
        .in("subject_id", missing).eq("is_active", true).order("chapter_number");
      const next = { ...chaptersBySubject };
      missing.forEach(id => { next[id] = (data || []).filter((c: any) => c.subject_id === id); });
      setChaptersBySubject(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selSubjects]);

  const yr = currentYear();
  const ALL_SECTIONS = useMemo(() => [...QUICK_LINKS, ...RESOURCES], []);

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, key: string) => {
    const n = new Set(set); n.has(key) ? n.delete(key) : n.add(key); setSet(n);
  };

  const apply = async () => {
    if (!enabled) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const newTags = new Set(tags || []);
      newTags.add("study-material");
      newTags.add(`class-${classNum}`);
      newTags.add(`class-${classNum}-${board}`);
      // section tags
      selSections.forEach(s => {
        newTags.add(`class-${classNum}-${board}-${s}`);
        newTags.add(`class-${classNum}-${board}-${s}-${yr}`);
      });
      // subject/chapter tags
      selSubjects.forEach(sid => {
        const subj = subjects.find(s => s.id === sid);
        if (!subj) return;
        newTags.add(`class-${classNum}-${board}-${subj.slug}`);
      });
      selChapters.forEach(cid => {
        for (const sid of selSubjects) {
          const chap = (chaptersBySubject[sid] || []).find(c => c.id === cid);
          const subj = subjects.find(s => s.id === sid);
          if (chap && subj) newTags.add(`class-${classNum}-${board}-${subj.slug}-${chap.slug}`);
        }
      });
      onChange(Array.from(newTags));

      if (articleId && (selSubjects.size || selChapters.size)) {
        const { data: existing, error: readErr } = await (supabase as any)
          .from("article_links")
          .select("entity_type, entity_slug")
          .eq("article_id", articleId)
          .in("entity_type", ["study_subject", "study_chapter"]);
        if (readErr) throw readErr;
        const existingKeys = new Set((existing || []).map((r: any) => `${r.entity_type}:${r.entity_slug}`));
        const rows: any[] = [];
        selSubjects.forEach(id => {
          const k = `study_subject:${id}`;
          if (!existingKeys.has(k)) rows.push({ article_id: articleId, entity_type: "study_subject", entity_slug: id });
        });
        selChapters.forEach(id => {
          const k = `study_chapter:${id}`;
          if (!existingKeys.has(k)) rows.push({ article_id: articleId, entity_type: "study_chapter", entity_slug: id });
        });
        if (rows.length) {
          const { error } = await (supabase as any).from("article_links").insert(rows);
          if (error && !String(error.message).toLowerCase().includes("duplicate")) {
            throw error;
          }
        }
      }
      const total = selSections.size + selSubjects.size + selChapters.size;
      toast.success(total ? `Tagged ${total} item(s) for Class ${classNum} ${board.toUpperCase()}` : "Tagged class & board");
      setSelSections(new Set());
    } catch (e: any) {
      const msg = e?.message || String(e);
      setErrorMsg(`Could not save study links: ${msg}`);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  const removeTag = (t: string) => onChange(tags.filter(x => x !== t));
  const studyTags = (tags || []).filter(t => t === "study-material" || /^class-\d+/.test(t));

  const Chip = ({ active, onClick, children }: any) => (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition inline-flex items-center gap-1 ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>
      {active && <Check className="w-3 h-3" />} {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
        <GraduationCap className="w-4 h-4 text-primary" />
        Tag as Study Material - multi-select Class · Board · Quick Links · Resources · Subject → Chapter
      </label>
      {enabled && (
        <>
          {preloading && (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading saved subject/chapter links…
            </div>
          )}
          {errorMsg && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start justify-between gap-2">
              <span className="flex-1">{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="hover:underline">Dismiss</button>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Class</p>
            <div className="flex flex-wrap gap-1.5">
              {CLASSES.map(c => (
                <Chip key={c} active={classNum === c} onClick={() => setClassNum(c)}>Class {c}</Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Board</p>
            <div className="flex flex-wrap gap-1.5">
              {boards.map(b => (
                <Chip key={b.slug} active={board === b.slug} onClick={() => setBoard(b.slug)}>{b.name}</Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Quick Links (multi-select)</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LINKS.map(s => (
                <Chip key={s.slug} active={selSections.has(s.slug)} onClick={() => toggle(selSections, setSelSections, s.slug)}>
                  {s.emoji} {s.name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Resources (multi-select · {RESOURCES.length})</p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {RESOURCES.map(s => (
                <Chip key={s.slug} active={selSections.has(s.slug)} onClick={() => toggle(selSections, setSelSections, s.slug)}>
                  {s.emoji} {s.name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Subjects (multi-select)</p>
            {subjects.length ? (
              <div className="flex flex-wrap gap-1.5">
                {subjects.map(s => (
                  <Chip key={s.id} active={selSubjects.has(s.id)} onClick={() => toggle(selSubjects, setSelSubjects, s.id)}>
                    {s.name}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No subjects for this class+board yet.</p>
            )}
          </div>

          {Array.from(selSubjects).map(sid => {
            const subj = subjects.find(s => s.id === sid);
            const chs = chaptersBySubject[sid] || [];
            return (
              <div key={sid} className="pl-2 border-l-2 border-primary/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Chapters · {subj?.name} {chs.length ? `(${chs.length})` : ""}
                </p>
                {chs.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {chs.map(c => (
                      <Chip key={c.id} active={selChapters.has(c.id)} onClick={() => toggle(selChapters, setSelChapters, c.id)}>
                        Ch.{(c as any).chapter_number ?? ""} {c.name}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Loading / no chapters.</p>
                )}
              </div>
            );
          })}

          <Button type="button" size="sm" onClick={apply} disabled={busy || preloading} className="rounded-lg gap-1 w-full sm:w-auto">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {busy ? "Saving…" : `Apply tags (${selSections.size + selSubjects.size + selChapters.size} selected)`}
          </Button>
          {!articleId && (selSubjects.size > 0 || selChapters.size > 0) && (
            <p className="text-[11px] text-muted-foreground">💡 Save the article first so subject/chapter links can be persisted.</p>
          )}

          {studyTags.length > 0 && (
            <div className="pt-1 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Currently tagged</p>
              <div className="flex flex-wrap gap-1.5">
                {studyTags.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="ml-0.5 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
