import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { GraduationCap, ArrowRight, BookOpen, FileDown, ShieldCheck, FileText, Search } from "lucide-react";
import { useStudyBoards } from "@/hooks/useStudyMaterial";

const CLASSES = [8, 9, 10, 11, 12];

const QUICK_RESOURCES = [
  { type: "pyq", label: "Last 10 Year Papers", icon: FileDown, color: "from-orange-500/10 to-orange-500/5" },
  { type: "ncert", label: "NCERT Solutions", icon: BookOpen, color: "from-blue-500/10 to-blue-500/5" },
  { type: "notes", label: "Revision Notes", icon: FileText, color: "from-emerald-500/10 to-emerald-500/5" },
  { type: "sample", label: "Sample Papers", icon: FileDown, color: "from-purple-500/10 to-purple-500/5" },
];

export default function StudyMaterial() {
  const { data: boards = [] } = useStudyBoards();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Boards & Study Material - CBSE, ICSE, State Board Notes & PYQs | DekhoCampus"
        description="Free Class 8 to 12 study material across CBSE, ICSE & State boards. Chapter-wise notes, NCERT solutions, sample papers and last 10 years' question papers."
        canonical="/study-material"
      />
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
          <div className="container py-10 md:py-14 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% FREE • Verified PDFs • Updated {new Date().getFullYear()}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
              Boards &amp; <span className="text-primary">Study Material</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pick your board, then your class. Chapter-wise notes, NCERT solutions, sample papers and last 10 years' PYQs - all in one place.
            </p>
            <Link to="/resources" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
              <Search className="w-4 h-4" /> Browse all resources
            </Link>
          </div>
        </section>

        {/* Boards directory */}
        <section className="container py-8 md:py-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Choose your board</h2>
              <p className="text-sm text-muted-foreground">Curriculum-specific notes & papers</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(boards as any[]).map((b) => (
              <Link key={b.slug} to={`/study-material/class-10?board=${b.slug}`}
                className="group bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                <div className="text-4xl mb-2">{b.icon_emoji}</div>
                <p className="text-lg font-bold text-foreground">{b.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
                <p className="text-xs text-primary mt-3 inline-flex items-center gap-1">
                  Explore syllabus <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Class grid */}
        <section className="container pb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Browse by class</h2>
              <p className="text-sm text-muted-foreground">Subjects, chapters & papers Class 8-12</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {CLASSES.map((c) => (
              <Link
                key={c}
                to={`/study-material/class-${c}`}
                className="group relative bg-card border border-border rounded-2xl p-5 md:p-6 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Class</p>
                <p className="text-3xl md:text-4xl font-bold text-foreground">{c}</p>
                <p className="text-xs text-primary mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  Explore <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick resource shortcuts */}
        <section className="container pb-12">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Popular resource types</h2>
              <p className="text-sm text-muted-foreground">Jump straight to what you need</p>
            </div>
            <Link to="/resources" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_RESOURCES.map(r => (
              <Link key={r.type} to={`/resources?type=${r.type}`}
                className={`group bg-gradient-to-br ${r.color} border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                <r.icon className="w-7 h-7 text-primary mb-2" />
                <p className="font-semibold text-foreground">{r.label}</p>
                <p className="text-xs text-primary mt-2 flex items-center gap-1">Browse <ArrowRight className="w-3 h-3" /></p>
              </Link>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-8">
            {[
              { icon: BookOpen, title: "Chapter-wise Notes", desc: "Organized by board → subject → chapter" },
              { icon: FileDown, title: "Last 10 Year PYQs", desc: "Year-wise + combined 10-year pack" },
              { icon: ShieldCheck, title: "Verified & Free", desc: "First download free, 1 OTP for the rest" },
            ].map(f => (
              <div key={f.title} className="bg-card border border-border rounded-2xl p-5">
                <f.icon className="w-6 h-6 text-primary mb-2" />
                <p className="font-semibold text-foreground">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
