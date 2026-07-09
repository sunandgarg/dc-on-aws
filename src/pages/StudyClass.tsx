import { useEffect, useState } from "react";
import { Link, useParams, Navigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useStudyBoards, useStudySubjects, useStudyToppers } from "@/hooks/useStudyMaterial";
import { useStudyBoardLinks } from "@/hooks/useStudyBoardLinks";
import { ArrowRight, BookOpen, ChevronRight, Trophy, FileText, CalendarDays, Award, ClipboardList, Phone, Sparkles, ExternalLink } from "lucide-react";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

export default function StudyClass() {
  const { classSlug, boardSlug: routeBoard } = useParams<{ classSlug: string; boardSlug?: string }>();
  const [search] = useSearchParams();
  const classNum = Number((classSlug || "").replace(/\D/g, ""));
  const { data: boards = [] } = useStudyBoards();
  const [boardSlug, setBoardSlug] = useState<string>(routeBoard || search.get("board") || "cbse");
  useEffect(() => { if (routeBoard && routeBoard !== boardSlug) setBoardSlug(routeBoard); }, [routeBoard]);
  const { data: subjects = [], isLoading } = useStudySubjects(classNum, boardSlug);
  const { data: toppers = [] } = useStudyToppers(classNum, boardSlug);
  const { data: boardLinks = [] } = useStudyBoardLinks(classNum, boardSlug);

  // BreadcrumbList JSON-LD for SEO
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Study Material", item: "/study-material" },
      { "@type": "ListItem", position: 2, name: `Class ${classNum}`, item: `/study-material/class-${classNum}` },
      ...(routeBoard ? [{ "@type": "ListItem", position: 3, name: boards.find((b: any) => b.slug === routeBoard)?.name || routeBoard.toUpperCase(), item: `/study-material/class-${classNum}/${routeBoard}` }] : []),
    ],
  };


  if (!classNum || classNum < 8 || classNum > 12) return <Navigate to="/study-material" />;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Class ${classNum} ${routeBoard ? boards.find((b: any) => b.slug === routeBoard)?.name + " " : ""}Study Material - Notes & Last 10 Year Papers | DekhoCampus`}
        description={`Free Class ${classNum} study material: subjects, chapter notes and last 10 years' question papers (CBSE, ICSE, State Board).`}
        canonical={routeBoard ? `/study-material/class-${classNum}/${routeBoard}` : `/study-material/class-${classNum}`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navbar />
      <main>
        <div className="border-b border-border bg-muted/30">
          <div className="container py-4 text-sm text-muted-foreground flex items-center gap-2">
            <Link to="/study-material" className="hover:text-foreground">Study Material</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Class {classNum}</span>
          </div>
        </div>

        <section className="container py-6 md:py-10">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Class {classNum} - Choose Board</h1>
              <p className="text-sm text-muted-foreground">Pick your board to view subjects & papers</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {boards.map((b: any) => (
              <button
                key={b.slug}
                onClick={() => setBoardSlug(b.slug)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  boardSlug === b.slug
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {b.image_url ? (
                  <img src={b.image_url} alt={b.name} className="inline-block w-4 h-4 mr-1.5 object-contain rounded" />
                ) : (
                  <span className="mr-1">{b.icon_emoji}</span>
                )}{b.name}
              </button>
            ))}
          </div>

          {/* Toppers Table */}
          {toppers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg md:text-xl font-bold text-foreground">
                  Class {classNum} {boards.find((b: any) => b.slug === boardSlug)?.name || ""} Toppers
                </h2>
              </div>
              {(["Science", "Commerce", "Arts"] as const).map((stream) => {
                const rows = toppers.filter((t: any) => t.stream === stream);
                if (!rows.length) return null;
                return (
                  <div key={stream} className="mb-4 bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-2 bg-primary/5 border-b border-border flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{stream} Stream</span>
                      <span className="text-xs text-muted-foreground">{rows[0]?.year}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Rank</th>
                            <th className="text-left px-3 py-2 font-medium">Name</th>
                            <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">School</th>
                            <th className="text-left px-3 py-2 font-medium">Marks</th>
                            <th className="text-right px-3 py-2 font-medium">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((t: any) => (
                            <tr key={t.id} className="border-t border-border/60">
                              <td className="px-3 py-2 font-bold text-amber-600">#{t.rank}</td>
                              <td className="px-3 py-2 font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  {t.photo ? (
                                    <img src={t.photo} alt="" className="w-7 h-7 rounded-full object-cover" loading="lazy" />
                                  ) : null}
                                  <span>{t.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                                {[t.school, t.city].filter(Boolean).join(", ")}
                              </td>
                              <td className="px-3 py-2 text-foreground">{t.marks}</td>
                              <td className="px-3 py-2 text-right font-bold text-primary">
                                {Number(t.percentage || 0).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Quick Links - collegedekho-parity board navigation */}
          <div className="mb-10">
            <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Class {classNum} {boards.find((b: any) => b.slug === boardSlug)?.name} Quick Links
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: "Syllabus", to: `/news/tag/class-${classNum}-${boardSlug}-syllabus`, color: "text-blue-600" },
                { icon: ClipboardList, label: "Sample Papers", to: `/news/tag/class-${classNum}-${boardSlug}-sample-papers`, color: "text-amber-600" },
                { icon: CalendarDays, label: "Date Sheet", to: `/news/tag/class-${classNum}-${boardSlug}-date-sheet`, color: "text-emerald-600" },
                { icon: Award, label: "Result Updates", to: `/news/tag/class-${classNum}-${boardSlug}-result`, color: "text-rose-600" },
              ].map((q) => (
                <Link
                  key={q.label}
                  to={q.to}
                  className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  <q.icon className={`w-7 h-7 ${q.color} mb-2`} />
                  <p className="font-semibold text-foreground text-sm">{q.label}</p>
                  <p className="text-xs text-primary mt-2 flex items-center gap-1">
                    Read updates <ArrowRight className="w-3 h-3" />
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Board Resources - grouped by category */}
          {boardLinks.length > 0 && (() => {
            const SECTION_META: Record<string, { title: string; icon: any; color: string; layout: "table" | "cards" | "list" }> = {
              "syllabus": { title: "Syllabus", icon: FileText, color: "text-blue-600", layout: "cards" },
              "sample-papers": { title: "Sample Papers", icon: ClipboardList, color: "text-amber-600", layout: "cards" },
              "date-sheet": { title: "Date Sheet", icon: CalendarDays, color: "text-emerald-600", layout: "table" },
              "result": { title: "Result Updates", icon: Award, color: "text-rose-600", layout: "list" },
              "previous-papers": { title: "Previous Year Papers", icon: FileText, color: "text-purple-600", layout: "cards" },
              "other": { title: "Other Resources", icon: BookOpen, color: "text-slate-600", layout: "list" },
            };
            const groups: Record<string, any[]> = boardLinks.reduce((acc: Record<string, any[]>, l: any) => {
              const k = (l.category || "other").toLowerCase();
              (acc[k] = acc[k] || []).push(l);
              return acc;
            }, {});
            return (
              <div className="mb-10 space-y-6">
                <h2 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {boards.find((b: any) => b.slug === boardSlug)?.name} Class {classNum} Resources
                </h2>
                {Object.entries(groups).map(([cat, links]: [string, any[]]) => {
                  const meta = SECTION_META[cat] || SECTION_META["other"];
                  const Icon = meta.icon;
                  return (
                    <div key={cat} className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                        <span className="font-semibold text-sm text-foreground">{meta.title}</span>
                        <span className="text-xs text-muted-foreground">({links.length})</span>
                      </div>
                      {meta.layout === "table" ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-xs text-muted-foreground">
                              <tr><th className="text-left px-4 py-2 font-medium">Title</th><th className="text-right px-4 py-2 font-medium">Link</th></tr>
                            </thead>
                            <tbody>
                              {links.map((link: any) => {
                                const ext = /^https?:\/\//i.test(link.url);
                                return (
                                  <tr key={link.id} className="border-t border-border/60 hover:bg-primary/5">
                                    <td className="px-4 py-2 font-medium text-foreground">{link.title}</td>
                                    <td className="px-4 py-2 text-right">
                                      {ext ? (
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">Open <ExternalLink className="w-3 h-3" /></a>
                                      ) : (
                                        <Link to={link.url} className="text-primary hover:underline text-xs">Open</Link>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : meta.layout === "cards" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                          {links.map((link: any) => {
                            const ext = /^https?:\/\//i.test(link.url);
                            const Body = (
                              <div className="border border-border rounded-xl p-3 hover:shadow-md hover:border-primary/40 transition-all h-full">
                                <Icon className={`w-5 h-5 ${meta.color} mb-2`} />
                                <p className="font-medium text-sm text-foreground line-clamp-2">{link.title}</p>
                                <p className="text-xs text-primary mt-2 flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></p>
                              </div>
                            );
                            return ext ? (
                              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">{Body}</a>
                            ) : (
                              <Link key={link.id} to={link.url}>{Body}</Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2">
                          {links.map((link: any, idx: number) => {
                            const ext = /^https?:\/\//i.test(link.url);
                            const cls = `flex items-center justify-between gap-2 px-4 py-3 text-sm border-b border-border/60 hover:bg-primary/5 transition-colors ${idx % 2 === 0 ? "md:border-r" : ""}`;
                            return ext ? (
                              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={cls}>
                                <span className="text-primary hover:underline font-medium">{link.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </a>
                            ) : (
                              <Link key={link.id} to={link.url} className={cls}>
                                <span className="text-primary hover:underline font-medium">{link.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Subjects */}
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Class {classNum} Subjects
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-2xl">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-foreground font-medium">No subjects yet</p>
              <p className="text-sm text-muted-foreground">Subjects for this board will be added soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {subjects.map((s: any) => (
                <Link
                  key={s.id}
                  to={`/study-material/class-${classNum}/${boardSlug}/${s.slug}`}
                  className="group bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  <div className="text-3xl mb-2">{s.icon_emoji || "📖"}</div>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  {s.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.description}</p>}
                  <p className="text-xs text-primary mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    View chapters <ArrowRight className="w-3 h-3" />
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* Free Counselling CTA - collegedekho-style pricing/CTA block */}
          <div className="mt-10 grid lg:grid-cols-5 gap-6 bg-gradient-to-br from-primary/5 via-card to-amber-50 dark:to-amber-950/10 border border-primary/20 rounded-3xl p-5 md:p-7">
            <div className="lg:col-span-3 flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide mb-3">
                <Phone className="w-3 h-3" /> 100% Free Counselling
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                Confused about Class {classNum} stream, board or career?
              </h2>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                Talk to our DekhoCampus mentors - get a personalised study plan, college shortlist and exam strategy. No fees, no spam.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Stream selection (Sci / Com / Arts)</li>
                <li className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600" /> Board switch & syllabus guidance</li>
                <li className="flex items-center gap-2"><Award className="w-4 h-4 text-rose-600" /> Top college & scholarship roadmap</li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <LeadCaptureForm
                variant="card"
                title="Get Free Mentor Call"
                subtitle="Avg. response time: under 30 mins"
                source={`study_class_${classNum}_${boardSlug}_cta`}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
