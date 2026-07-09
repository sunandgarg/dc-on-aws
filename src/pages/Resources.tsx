import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Search, FileDown, BookOpen, FileText, GraduationCap, Filter } from "lucide-react";
import { useAllResources, useDistinctSubjects } from "@/hooks/useResourcesBrowse";
import { useStudyBoards } from "@/hooks/useStudyMaterial";

const TYPES = [
  { value: "", label: "All Types", icon: BookOpen },
  { value: "pyq", label: "PYQs", icon: FileDown },
  { value: "ncert", label: "NCERT Solutions", icon: FileText },
  { value: "notes", label: "Revision Notes", icon: BookOpen },
  { value: "sample", label: "Sample Papers", icon: FileDown },
];

const CLASSES = [8, 9, 10, 11, 12];
const PAGE_SIZE = 12;

/**
 * Parses SEO sub-slugs like:
 *   cbse-class-12-physics-pyq
 *   icse-class-10-sample-papers
 *   class-11-chemistry-notes
 * Returns { board, classNum, subject, type } where present.
 */
function parseResourceSlug(slug?: string) {
  if (!slug) return {} as { board?: string; classNum?: number; subject?: string; type?: string };
  const s = slug.toLowerCase();
  const out: any = {};
  const boards = ["cbse", "icse", "isc", "state-board", "ib", "cambridge"];
  const board = boards.find(b => s.includes(b));
  if (board) out.board = board;
  const cm = s.match(/class-(\d{1,2})/);
  if (cm) out.classNum = Number(cm[1]);
  if (s.endsWith("-pyq") || s.includes("-pyq-") || s.includes("question-paper")) out.type = "pyq";
  else if (s.includes("ncert")) out.type = "ncert";
  else if (s.includes("notes")) out.type = "notes";
  else if (s.includes("sample")) out.type = "sample";
  // remainder treated as subject if alpha
  const subjects = ["physics","chemistry","biology","maths","mathematics","english","hindi","sanskrit","accountancy","economics","business-studies","computer-science","political-science","history","geography"];
  const sub = subjects.find(x => s.includes(x));
  if (sub) out.subject = sub === "mathematics" ? "maths" : sub;
  return out;
}

export default function Resources() {
  const { slug } = useParams<{ slug?: string }>();
  const preset = useMemo(() => parseResourceSlug(slug), [slug]);

  const { data: resources = [], isLoading } = useAllResources();
  const { data: subjects = [] } = useDistinctSubjects();
  const { data: boards = [] } = useStudyBoards();

  const [classNum, setClassNum] = useState<number | null>(preset.classNum ?? null);
  const [board, setBoard] = useState<string | null>(preset.board ?? null);
  const [subject, setSubject] = useState<string | null>(preset.subject ?? null);
  const [type, setType] = useState<string>(preset.type || "");
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Re-apply when slug changes
  useEffect(() => {
    setClassNum(preset.classNum ?? null);
    setBoard(preset.board ?? null);
    setSubject(preset.subject ?? null);
    setType(preset.type || "");
    setVisible(PAGE_SIZE);
  }, [slug, preset.classNum, preset.board, preset.subject, preset.type]);

  const filteredSubjects = useMemo(
    () =>
      subjects.filter(
        (s: any) =>
          (!classNum || s.class_num === classNum) && (!board || s.board_slug === board)
      ),
    [subjects, classNum, board]
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return resources.filter((r: any) => {
      const sub = r.study_subjects;
      if (classNum && sub?.class_num !== classNum) return false;
      if (board && sub?.board_slug !== board) return false;
      if (subject && sub?.slug !== subject) return false;
      if (type && r.resource_type !== type) return false;
      if (ql && !(r.title?.toLowerCase().includes(ql) || sub?.name?.toLowerCase().includes(ql))) return false;
      return true;
    });
  }, [resources, classNum, board, subject, type, q]);

  const reset = () => {
    setClassNum(null); setBoard(null); setSubject(null); setType(""); setQ(""); setVisible(PAGE_SIZE);
  };

  const items = filtered.slice(0, visible);

  // Dynamic SEO title built from active filters or slug
  const titleParts = [
    board?.toUpperCase(),
    classNum ? `Class ${classNum}` : null,
    subject ? subject.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : null,
    type ? TYPES.find(t => t.value === type)?.label : null,
  ].filter(Boolean);
  const dynamicTitle = titleParts.length
    ? `${titleParts.join(" ")} - Free Download | DekhoCampus`
    : "Free Study Resources - PYQs, NCERT Solutions, Notes & Sample Papers | DekhoCampus";
  const canonical = slug ? `/resources/${slug}` : "/resources";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={dynamicTitle}
        description={titleParts.length
          ? `Download free ${titleParts.join(" ")} - verified PDFs, last-10-year question papers, revision notes and sample papers.`
          : "Browse 200+ free study resources for Class 8-12: NCERT solutions, last 10-year question papers, revision notes & sample papers across CBSE, ICSE & State boards."}
        canonical={canonical} />
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
          <div className="container py-8 md:py-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              📚 Free Study Resources
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
              {titleParts.length
                ? <>{titleParts.join(" ")} <span className="text-primary">- Free Download</span></>
                : <>Find <span className="text-primary">PYQs, Notes & Sample Papers</span> in seconds</>}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              Filter by class, board, subject and resource type. All PDFs verified & free to download.
            </p>
          </div>
        </section>

        <div className="container pt-4"><AlsoCheckSection variant="strip" /></div>

        <section className="container py-6 md:py-8">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setVisible(PAGE_SIZE); }}
                placeholder="Search resources by title or subject..." className="pl-10 rounded-xl h-11" />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Class</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => { setClassNum(null); setSubject(null); setVisible(PAGE_SIZE); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border ${!classNum ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>All</button>
                  {CLASSES.map(c => (
                    <button key={c} onClick={() => { setClassNum(c); setSubject(null); setVisible(PAGE_SIZE); }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${classNum === c ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>{c}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Board</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => { setBoard(null); setSubject(null); setVisible(PAGE_SIZE); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border ${!board ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>All</button>
                  {boards.map((b: any) => (
                    <button key={b.slug} onClick={() => { setBoard(b.slug); setSubject(null); setVisible(PAGE_SIZE); }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${board === b.slug ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>{b.icon_emoji} {b.name}</button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Subject</p>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  <button onClick={() => { setSubject(null); setVisible(PAGE_SIZE); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border ${!subject ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>All</button>
                  {filteredSubjects.slice(0, 30).map((s: any) => (
                    <button key={`${s.slug}-${s.class_num}-${s.board_slug}`}
                      onClick={() => { setSubject(s.slug); setVisible(PAGE_SIZE); }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${subject === s.slug ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"}`}>
                      {s.icon_emoji} {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {TYPES.map(t => (
                <button key={t.value} onClick={() => { setType(t.value); setVisible(PAGE_SIZE); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${type === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70"}`}>
                  <t.icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
              {(classNum || board || subject || type || q) && (
                <button onClick={reset} className="ml-auto text-xs text-primary font-semibold hover:underline">Clear all</button>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Showing <span className="font-semibold text-foreground">{items.length}</span> of <span className="font-semibold text-foreground">{filtered.length}</span> resources
          </p>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-semibold text-foreground">No resources found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((r: any) => {
                  const sub = r.study_subjects;
                  return (
                    <Link key={r.id}
                      to={sub ? `/study-material/class-${sub.class_num}/${sub.board_slug}/${sub.slug}` : "#"}
                      className="group bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{sub?.icon_emoji || "📄"}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">{r.resource_type}</span>
                      </div>
                      <p className="font-semibold text-foreground line-clamp-2 text-sm">{r.title}</p>
                      {sub && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Class {sub.class_num} · {sub.board_slug.toUpperCase()} · {sub.name}
                          {r.year ? ` · ${r.year}` : ""}
                        </p>
                      )}
                      <p className="text-xs text-primary mt-3 flex items-center gap-1">
                        Open <FileDown className="w-3 h-3" />
                      </p>
                    </Link>
                  );
                })}
              </div>

              {visible < filtered.length && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => setVisible(v => v + PAGE_SIZE)}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
                    Load more ({filtered.length - visible} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
