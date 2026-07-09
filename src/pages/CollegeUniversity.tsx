import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { ArrowRight, BookOpen, Trophy, ExternalLink } from "lucide-react";
import {
  useCollegeProgram,
  useCollegeUniversity,
  useCollegeSemesters,
  useCollegeSubjects,
  useCollegeQuickLinks,
  useCollegeFewLinks,
  useCollegeToppers,
} from "@/hooks/useCollegeStudy";

export default function CollegeUniversity() {
  const { programSlug, universitySlug, semSlug } = useParams<{ programSlug: string; universitySlug: string; semSlug?: string }>();
  const navigate = useNavigate();

  const { data: program } = useCollegeProgram(programSlug);
  const { data: uni } = useCollegeUniversity(programSlug, universitySlug);
  const { data: semesters = [] } = useCollegeSemesters(programSlug, universitySlug);
  const { data: quickLinks = [] } = useCollegeQuickLinks(programSlug, universitySlug);
  const { data: fewLinks = [] } = useCollegeFewLinks(programSlug, universitySlug);
  const { data: toppers = [] } = useCollegeToppers(programSlug, universitySlug);

  const initialSem = semSlug?.match(/semester-(\d+)/)?.[1];
  const [activeSem, setActiveSem] = useState<number | null>(initialSem ? Number(initialSem) : null);

  useEffect(() => {
    if (initialSem) setActiveSem(Number(initialSem));
  }, [initialSem]);

  const { data: subjects = [], isLoading: subjectsLoading } = useCollegeSubjects(programSlug, universitySlug, activeSem ?? undefined);
  const { data: semQuickLinks = [] } = useCollegeQuickLinks(programSlug, universitySlug, activeSem ?? undefined);

  const handleSem = (n: number) => {
    setActiveSem(n);
    navigate(`/college-study-material/${programSlug}/${universitySlug}/semester-${n}`, { replace: false });
    setTimeout(() => document.getElementById("subjects")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${uni?.short_name || uni?.name || "University"} ${program?.name || ""} Notes, Syllabus & PYQs | DekhoCampus`}
        description={`${uni?.name || ""} ${program?.name || ""} semester-wise study material - syllabus PDFs, previous year question papers, important questions and reference books. Free downloads.`}
        canonical={`/college-study-material/${programSlug}/${universitySlug}`}
      />
      <Navbar />
      <main>
        {/* Header */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
          <div className="container py-6 md:py-10">
            <nav className="text-xs text-muted-foreground mb-3">
              <Link to="/college-study-material" className="hover:text-primary">College Study Material</Link>
              <span className="mx-1">/</span>
              <Link to={`/college-study-material/${programSlug}`} className="hover:text-primary">{program?.name}</Link>
              <span className="mx-1">/</span>
              <span className="text-foreground">{uni?.short_name || uni?.name}</span>
            </nav>
            <div className="flex items-start gap-3">
              {uni?.logo && <img src={uni.logo} alt={uni.name} className="w-14 h-14 rounded-xl object-contain bg-card p-1 border border-border" />}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {uni?.short_name || uni?.name} <span className="text-primary">{program?.name}</span> Study Material
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{uni?.name}{uni?.state ? ` • ${uni.state}` : ""}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Toppers */}
        {toppers.length > 0 && (
          <section className="container py-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-lg md:text-xl font-bold text-foreground">University Toppers</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x">
              {toppers.map((t) => (
                <div key={t.id} className="snap-start shrink-0 w-56 bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    {t.photo ? (
                      <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{t.name?.[0]}</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground line-clamp-1">{t.name}</p>
                      <p className="text-xs text-muted-foreground">Rank #{t.rank} • {t.year}</p>
                    </div>
                  </div>
                  {t.branch && <p className="text-xs text-foreground mt-2">{t.branch}</p>}
                  {t.percentage && <p className="text-xs text-primary font-semibold mt-1">{t.percentage}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Links (university-level: semester_num is null) */}
        {quickLinks.length > 0 && (
          <section className="container py-6">
            <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickLinks.map((q) => (
                <a
                  key={q.id}
                  href={q.url || "#"}
                  target={q.url?.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="text-2xl mb-2">{q.icon_emoji}</div>
                  <p className="font-semibold text-foreground text-sm">{q.title}</p>
                  {q.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.description}</p>}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Few Links chip strip */}
        {fewLinks.length > 0 && (
          <section className="container pb-2">
            <div className="flex flex-wrap gap-2">
              {fewLinks.map((f) => (
                <a
                  key={f.id}
                  href={f.url || "#"}
                  target={f.url?.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <span>{f.icon_emoji}</span>{f.title}
                  {f.url?.startsWith("http") && <ExternalLink className="w-3 h-3" />}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Semesters grid */}
        <section className="container py-6">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">All Semesters</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
            {semesters.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSem(s.semester_num)}
                className={`group relative rounded-2xl border p-4 text-center transition-all ${
                  activeSem === s.semester_num
                    ? "bg-primary text-primary-foreground border-primary shadow-lg"
                    : "bg-card border-border hover:border-primary/40 hover:-translate-y-0.5"
                }`}
              >
                <p className={`text-[10px] uppercase tracking-wide ${activeSem === s.semester_num ? "opacity-90" : "text-muted-foreground"}`}>Semester</p>
                <p className="text-2xl md:text-3xl font-extrabold leading-tight">{s.semester_num}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Subjects (inline) */}
        {activeSem && (
          <section id="subjects" className="container py-6">
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground">Semester {activeSem} Subjects</h2>
                <p className="text-xs text-muted-foreground">Tap a subject to see notes, PYQs, lab manuals & more</p>
              </div>
            </div>

            {/* Semester-scoped quick links */}
            {semQuickLinks.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {semQuickLinks.map((q) => (
                  <a
                    key={q.id}
                    href={q.url || "#"}
                    target={q.url?.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="bg-muted/50 hover:bg-primary/10 border border-border rounded-xl p-3 text-xs font-medium text-foreground inline-flex items-center gap-2"
                  >
                    <span>{q.icon_emoji}</span>{q.title}
                  </a>
                ))}
              </div>
            )}

            {subjectsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Subjects for Semester {activeSem} will be added soon.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    to={`/college-study-material/${programSlug}/${universitySlug}/semester-${activeSem}/${s.slug}`}
                    className="group bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground line-clamp-2">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.code && <span>{s.code} • </span>}
                          {s.branch !== "common" ? s.branch.toUpperCase() : "Common"}
                          {s.credits ? ` • ${s.credits} credits` : ""}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <AlsoCheckSection />
      <Footer />
    </div>
  );
}
