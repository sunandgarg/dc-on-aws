import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { FileDown, ExternalLink, BookOpen } from "lucide-react";
import { useCollegeProgram, useCollegeUniversity, useCollegeSubject, useCollegeResources } from "@/hooks/useCollegeStudy";

const TYPE_META: Record<string, { label: string; emoji: string }> = {
  notes: { label: "Notes", emoji: "📓" },
  pyq: { label: "Previous Year Papers", emoji: "📝" },
  "lab-manual": { label: "Lab Manual", emoji: "🧪" },
  "important-questions": { label: "Important Questions", emoji: "⭐" },
  "model-papers": { label: "Model Papers", emoji: "📄" },
  "viva-questions": { label: "Viva Questions", emoji: "🎤" },
  "reference-books": { label: "Reference Books", emoji: "📚" },
  "video-lectures": { label: "Video Lectures", emoji: "▶️" },
  syllabus: { label: "Syllabus", emoji: "📘" },
};

export default function CollegeSubject() {
  const { programSlug, universitySlug, semSlug, subjectSlug } = useParams<{
    programSlug: string; universitySlug: string; semSlug: string; subjectSlug: string;
  }>();
  const semNum = Number(semSlug?.match(/semester-(\d+)/)?.[1]);

  const { data: program } = useCollegeProgram(programSlug);
  const { data: uni } = useCollegeUniversity(programSlug, universitySlug);
  const { data: subject } = useCollegeSubject(programSlug, universitySlug, semNum, subjectSlug);
  const { data: resources = [], isLoading } = useCollegeResources(subject?.id);

  const grouped = resources.reduce<Record<string, any[]>>((acc, r) => {
    const k = r.resource_type || "notes";
    (acc[k] = acc[k] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${subject?.name || "Subject"} - ${uni?.short_name || ""} ${program?.name || ""} Sem ${semNum} Notes & PYQs | DekhoCampus`}
        description={`${subject?.name || ""} (${subject?.code || ""}) for ${uni?.short_name || ""} ${program?.name || ""} Semester ${semNum}. Download notes, previous year papers, lab manuals, important questions and reference books - all free.`}
        canonical={`/college-study-material/${programSlug}/${universitySlug}/semester-${semNum}/${subjectSlug}`}
      />
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
          <div className="container py-6 md:py-10">
            <nav className="text-xs text-muted-foreground mb-3">
              <Link to="/college-study-material" className="hover:text-primary">Study Material</Link>
              <span className="mx-1">/</span>
              <Link to={`/college-study-material/${programSlug}`} className="hover:text-primary">{program?.name}</Link>
              <span className="mx-1">/</span>
              <Link to={`/college-study-material/${programSlug}/${universitySlug}`} className="hover:text-primary">{uni?.short_name || uni?.name}</Link>
              <span className="mx-1">/</span>
              <Link to={`/college-study-material/${programSlug}/${universitySlug}/semester-${semNum}`} className="hover:text-primary">Semester {semNum}</Link>
              <span className="mx-1">/</span>
              <span className="text-foreground">{subject?.name}</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{subject?.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {subject?.code && <span>{subject.code} • </span>}
              {subject?.branch !== "common" ? subject?.branch?.toUpperCase() : "Common"} • Sem {semNum} • {uni?.short_name}
            </p>
            {subject?.description && <p className="text-sm text-foreground mt-3 max-w-3xl">{subject.description}</p>}
          </div>
        </section>

        <section className="container py-8">
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-2xl">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
              Resources for this subject will be added soon.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type] || { label: type, emoji: "📄" };
                return (
                  <div key={type}>
                    <h2 className="text-lg font-bold text-foreground mb-3 inline-flex items-center gap-2">
                      <span>{meta.emoji}</span>{meta.label}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((r) => (
                        <a
                          key={r.id}
                          href={r.file_url || r.external_url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-start gap-3 bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            {r.external_url && !r.file_url ? <ExternalLink className="w-5 h-5" /> : <FileDown className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground line-clamp-2">{r.title}</p>
                            {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                            {r.year && <p className="text-xs text-primary mt-1 font-medium">Year {r.year}</p>}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
