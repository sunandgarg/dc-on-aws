import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useStudySubject, useStudyChapters, useStudyResources, useAllSubjectResources } from "@/hooks/useStudyMaterial";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileDown, Sparkles, Package, ArrowUp, BookOpen, Lightbulb, NotebookPen, CalendarDays } from "lucide-react";
import { DownloadGate } from "@/components/study/DownloadGate";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { SubjectNewsSection } from "@/components/study/SubjectNewsSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function StudySubject() {
  const { classSlug, boardSlug, subjectSlug, chapterSlug } = useParams<{ classSlug: string; boardSlug: string; subjectSlug: string; chapterSlug?: string }>();
  const classNum = Number((classSlug || "").replace(/\D/g, ""));
  const { data: subject } = useStudySubject(classNum, boardSlug, subjectSlug);
  const { data: chapters = [] } = useStudyChapters(subject?.id);
  const { data: subjectResources = [] } = useStudyResources({ subjectId: subject?.id });
  const { data: allSubjectResources = [] } = useAllSubjectResources(subject?.id);

  const [gate, setGate] = useState<{ url: string; name: string; src: string; meta: any } | null>(null);
  const [progress, setProgress] = useState(0);
  const [yearFilter, setYearFilter] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll to chapter when ?chapter slug is in URL
  useEffect(() => {
    if (!chapterSlug || !chapters.length) return;
    const id = `chapter-${chapterSlug}`;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [chapterSlug, chapters.length]);

  // Always gate downloads (mandatory lead capture per project rules)
  const handleDownload = (url: string, name: string, src: string, meta: any) => {
    if (!url) return;
    setGate({ url, name, src, meta });
  };

  const combinedPack = subjectResources.find((r: any) => r.resource_type === "combined_10yr");
  const tricks = allSubjectResources.filter((r: any) => r.resource_type === "tricks");
  const easyNotes = allSubjectResources.filter((r: any) => r.resource_type === "easy_notes");
  const pyqAll = allSubjectResources.filter((r: any) => r.resource_type === "pyq" && r.year);
  const years = Array.from(new Set(pyqAll.map((r: any) => String(r.year)))).sort((a, b) => Number(b) - Number(a));
  const pyqsForYear = yearFilter ? pyqAll.filter((r: any) => String(r.year) === yearFilter) : [];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Class ${classNum} ${subject?.name || "Subject"} - Chapter Notes & PYQs | DekhoCampus`}
        description={`Class ${classNum} ${subject?.name || ""} chapter-wise notes and last 10 year question papers - download free.`}
        canonical={`/study-material/class-${classNum}/${boardSlug}/${subjectSlug}`}
      />
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <Navbar />
      <main className="pb-16">
        <div className="border-b border-border bg-muted/30">
          <div className="container py-4 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <Link to="/study-material" className="hover:text-foreground">Study Material</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/study-material/class-${classNum}`} className="hover:text-foreground">Class {classNum}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium uppercase">{boardSlug}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{subject?.name || subjectSlug}</span>
          </div>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-accent/5 to-background">
          <div className="container py-10 md:py-14 relative">
            <div className="flex items-start gap-4 md:gap-6 max-w-3xl">
              <div className="text-6xl md:text-7xl drop-shadow-sm">{subject?.icon_emoji || "📖"}</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Class {classNum} • {boardSlug?.toUpperCase()}</p>
                <h1 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">{subject?.name || subjectSlug}</h1>
                <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">{subject?.description || "Chapter-wise notes and previous year question papers - download free."}</p>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-card border border-border rounded-full px-3 py-1"><BookOpen className="w-3.5 h-3.5 text-primary" />{chapters.length} chapters</span>
                  {combinedPack && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary rounded-full px-3 py-1"><Package className="w-3.5 h-3.5" />10-Year PYQ pack</span>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-8 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {combinedPack && (
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/30 rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground flex items-center gap-2">
                      Last 10 Years PYQ - Combined Pack <Sparkles className="w-4 h-4 text-primary" />
                    </p>
                    <p className="text-xs text-muted-foreground">All previous year papers in a single PDF</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(combinedPack.file_url, `${subject?.slug}-10yr-pack.pdf`, `study_combined_${classNum}_${boardSlug}_${subjectSlug}`, { resource_id: combinedPack.id })}
                  className="rounded-xl bg-primary text-primary-foreground"
                >
                  <FileDown className="w-4 h-4 mr-2" /> Download Pack
                </Button>
              </div>
            )}

            {/* Year-wise Previous Year Papers (chips like exam page) */}
            {years.length > 0 && (
              <section className="bg-card border border-border rounded-2xl p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Year-wise Question Papers</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Pick a year to see all papers from that exam session.</p>
                <div className="flex flex-wrap gap-2">
                  {years.map(y => (
                    <button
                      key={y}
                      onClick={() => setYearFilter(yearFilter === y ? null : y)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                        yearFilter === y
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
                {yearFilter && (
                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    {pyqsForYear.map((r: any) => (
                      <button
                        key={r.id}
                        onClick={() => handleDownload(r.file_url, `${r.title}.pdf`, `study_pyq_${classNum}_${boardSlug}_${subjectSlug}_${r.year}`, { resource_id: r.id, year: r.year })}
                        className="flex items-center justify-between gap-3 bg-muted/40 hover:bg-primary/5 border border-border hover:border-primary/40 rounded-xl p-3 text-left transition"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground">PYQ · {r.year}</p>
                        </div>
                        <FileDown className="w-4 h-4 text-primary shrink-0" />
                      </button>
                    ))}
                    {pyqsForYear.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2">No papers for this year yet.</p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Special Tricks */}
            {tricks.length > 0 && (
              <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 md:p-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                    <h2 className="text-lg font-bold text-foreground">Special Tricks</h2>
                  </div>
                  <Link to={`/news/tag/${subjectSlug}-tricks`} className="text-xs font-semibold text-primary hover:underline">
                    Read all on News →
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {tricks.map((r: any) => (
                    <article key={r.id} className="bg-card rounded-xl border border-border p-3">
                      <p className="font-semibold text-foreground text-sm">{r.title}</p>
                      {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                      {r.file_url && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(r.file_url, `${r.title}.pdf`, `study_tricks_${subjectSlug}`, { resource_id: r.id })} className="mt-2 rounded-lg h-8 text-xs">
                          <FileDown className="w-3 h-3 mr-1" /> Download
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Easy Hand-written Notes */}
            {easyNotes.length > 0 && (
              <section className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 md:p-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <NotebookPen className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-foreground">Easy Hand-written Notes</h2>
                  </div>
                  <Link to={`/news/tag/${subjectSlug}-notes`} className="text-xs font-semibold text-primary hover:underline">
                    Read all on News →
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {easyNotes.map((r: any) => (
                    <article key={r.id} className="bg-card rounded-xl border border-border p-3">
                      <p className="font-semibold text-foreground text-sm">{r.title}</p>
                      {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                      {r.file_url && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(r.file_url, `${r.title}.pdf`, `study_notes_${subjectSlug}`, { resource_id: r.id })} className="mt-2 rounded-lg h-8 text-xs">
                          <FileDown className="w-3 h-3 mr-1" /> Download
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <h2 id="chapters" className="text-lg font-bold text-foreground">Chapters</h2>
            {chapters.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-2xl text-muted-foreground">No chapters added yet.</div>
            ) : (
              <div className="space-y-3">
                {chapters.map((ch: any, i: number) => (
                  <ChapterRow key={ch.id} index={i + 1} chapter={ch} classNum={classNum} boardSlug={boardSlug!} subjectSlug={subjectSlug!} onDownload={handleDownload} />
                ))}
              </div>
            )}

            <SubjectNewsSection subjectSlug={subjectSlug!} subjectName={subject?.name} subjectId={subject?.id} />
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-20 space-y-4">
              {chapters.length > 0 && (
                <nav className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Jump to chapter</p>
                  <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                    {chapters.map((ch: any, i: number) => (
                      <li key={ch.id}>
                        <a href={`#chapter-${ch.id}`} className="text-sm text-foreground/80 hover:text-primary transition flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{ch.chapter_number || i + 1}</span>
                          <span className="line-clamp-1">{ch.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <LeadCaptureForm variant="card" title="Need study help?" subtitle="Free guidance from mentors" source={`study_${classNum}_${subjectSlug}`} />
            </div>
          </aside>
        </section>
      </main>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-24 right-5 z-40 rounded-full bg-primary text-primary-foreground shadow-lg w-11 h-11 flex items-center justify-center transition ${progress > 15 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
      <Footer />
      {gate && (
        <DownloadGate
          open={!!gate}
          onOpenChange={(o) => !o && setGate(null)}
          fileUrl={gate.url}
          fileName={gate.name}
          source={gate.src}
          meta={gate.meta}
        />
      )}
    </div>
  );
}

function ChapterRow({ chapter, index, classNum, boardSlug, subjectSlug, onDownload }: any) {
  const { data: resources = [] } = useStudyResources({ chapterId: chapter.id });
  const [open, setOpen] = useState(false);
  const years = resources.filter((r: any) => r.resource_type === "pyq");
  const combined = resources.find((r: any) => r.resource_type === "combined_10yr");
  const extras = resources.filter((r: any) => !["pyq", "combined_10yr"].includes(r.resource_type));

  return (
    <div id={`chapter-${chapter.slug}`} data-chapter-id={chapter.id} className="bg-card border border-border rounded-2xl overflow-hidden scroll-mt-20">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition">
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
            {chapter.chapter_number || index}
          </div>
          <div>
            <p className="font-semibold text-foreground">{chapter.name}</p>
            <p className="text-xs text-muted-foreground">{years.length} year papers{combined ? " • 10-year pack" : ""}{extras.length ? ` • ${extras.length} more` : ""}</p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border p-4 bg-muted/30 space-y-3">
          {combined && combined.file_url && (
            <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-primary/30">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Last 10 Years Combined Pack</span>
              </div>
              <Button size="sm" onClick={() => onDownload(combined.file_url, `${chapter.slug}-10yr.pdf`, `study_combined_${classNum}_${boardSlug}_${subjectSlug}_${chapter.slug}`, { resource_id: combined.id })} className="rounded-lg">
                <FileDown className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </div>
          )}
          {years.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {years.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => onDownload(r.file_url, `${chapter.slug}-${r.year}.pdf`, `study_pyq_${classNum}_${boardSlug}_${subjectSlug}_${chapter.slug}_${r.year}`, { resource_id: r.id, year: r.year })}
                  className="bg-card border border-border rounded-xl p-3 hover:border-primary/50 hover:shadow-sm transition group"
                >
                  <FileDown className="w-4 h-4 text-primary mb-1 mx-auto" />
                  <p className="text-sm font-bold text-foreground">{r.year}</p>
                  <p className="text-[10px] text-muted-foreground">PYQ</p>
                </button>
              ))}
            </div>
          )}
          {extras.map((r: any) => (
            <article key={r.id} className="bg-card rounded-xl border border-border p-4 md:p-5">
              <header className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-border/60">
                <div className="min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide mb-1.5">{r.resource_type}</span>
                  <h4 className="font-bold text-foreground text-base leading-snug">{r.title}</h4>
                  {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                </div>
                {r.file_url && (
                  <Button size="sm" variant="outline" onClick={() => onDownload(r.file_url, `${r.title}.pdf`, `study_${r.resource_type}_${classNum}_${boardSlug}_${subjectSlug}_${chapter.slug}`, { resource_id: r.id })} className="rounded-lg shrink-0">
                    <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                )}
              </header>
              {r.content_html && (
                <div
                  className="prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-headings:font-bold prose-strong:text-foreground prose-a:text-primary prose-li:my-0.5 prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: r.content_html }}
                />
              )}
              {r.content_images?.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                  {r.content_images.map((img: string, i: number) => (
                    <img key={i} src={img} alt={`${r.title} ${i + 1}`} loading="lazy" className="rounded-lg border border-border w-full h-auto object-cover" />
                  ))}
                </div>
              )}
            </article>
          ))}
          {years.length === 0 && !combined && extras.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">No resources uploaded yet.</p>
          )}
          <ChapterArticles chapterId={chapter.id} chapterSlug={chapter.slug} />
        </div>
      )}
    </div>
  );
}

function ChapterArticles({ chapterId, chapterSlug }: { chapterId: string; chapterSlug: string }) {
  const { data: articles = [] } = useQuery({
    queryKey: ["chapter-articles", chapterId, chapterSlug],
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [linkRes, tagRes] = await Promise.all([
        (supabase as any)
          .from("article_links")
          .select("article_id, articles!inner(id,slug,title,description,featured_image,is_active)")
          .eq("entity_type", "study_chapter")
          .eq("entity_slug", chapterId),
        supabase
          .from("articles")
          .select("id,slug,title,description,featured_image,is_active")
          .eq("is_active", true)
          .overlaps("tags", [chapterSlug, `${chapterSlug}-notes`])
          .limit(20),
      ]);
      const merged = [
        ...(((linkRes as any).data || []).map((r: any) => r.articles).filter((a: any) => a?.is_active)),
        ...((tagRes.data as any[]) || []),
      ];
      const seen = new Set<string>();
      return merged.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true))).slice(0, 6);
    },
  });
  if (!articles.length) return null;
  return (
    <div className="bg-gradient-to-br from-primary/5 to-background rounded-2xl border border-primary/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Related Articles & Notes</p>
        </div>
        <span className="text-[10px] text-muted-foreground">{articles.length} {articles.length === 1 ? "result" : "results"}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {articles.map((a: any) => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-3 hover:border-primary/40 hover:shadow-sm transition group">
            <div className="flex items-start gap-2.5 mb-2.5">
              {a.featured_image ? (
                <img src={a.featured_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary/60" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition">{a.title}</p>
                {a.description && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{a.description}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/articles/${a.slug}`}
                className="inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition"
              >
                <BookOpen className="w-3 h-3" /> Read Article
              </Link>
              <Link
                to={`/articles/${a.slug}#download`}
                className="inline-flex items-center justify-center gap-1 h-8 rounded-lg border border-primary/40 text-primary text-[11px] font-semibold hover:bg-primary/10 transition"
              >
                <FileDown className="w-3 h-3" /> Download PDF
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
