import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { useCollegePrograms } from "@/hooks/useCollegeStudy";

export default function CollegeStudyMaterial() {
  const { data: programs = [], isLoading } = useCollegePrograms();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="College Study Material - BTech, BCA, MBA Notes, PYQs & Syllabus | DekhoCampus"
        description="Free university-wise notes, syllabus PDFs, previous year papers and important questions for BTech, BCA, MBA, M.Tech and more. AKTU, VTU, RGPV, GTU and Anna University covered."
        canonical="/college-study-material"
      />
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
          <div className="container py-10 md:py-14 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% FREE • University-wise PDFs
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
              College <span className="text-primary">Study Material</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pick your program, then your university. Semester-wise notes, syllabus, PYQs and important questions - verified and free.
            </p>
          </div>
        </section>

        <section className="container py-8 md:py-10">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">Choose your program</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {programs.map((p) => (
                <Link
                  key={p.slug}
                  to={`/college-study-material/${p.slug}`}
                  className="group bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all"
                >
                  <div className="text-4xl mb-2">{p.icon_emoji || "🎓"}</div>
                  <p className="text-lg font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.short_description}</p>
                  <p className="text-xs text-primary mt-3 inline-flex items-center gap-1">
                    {p.total_semesters} semesters <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
