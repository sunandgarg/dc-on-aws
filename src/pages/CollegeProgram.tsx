import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { ArrowRight, Search, Building2 } from "lucide-react";
import { useCollegeProgram, useCollegeUniversities } from "@/hooks/useCollegeStudy";

export default function CollegeProgram() {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { data: program } = useCollegeProgram(programSlug);
  const { data: universities = [], isLoading } = useCollegeUniversities(programSlug);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return universities;
    return universities.filter(
      (u) => u.name?.toLowerCase().includes(term) || u.short_name?.toLowerCase().includes(term) || u.state?.toLowerCase().includes(term)
    );
  }, [q, universities]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${program?.name || "Program"} Study Material - Universities, Syllabus & Notes | DekhoCampus`}
        description={`${program?.name || "Program"} university-wise notes, syllabus, previous year question papers and important questions. Free PDF downloads, updated for current academic year.`}
        canonical={`/college-study-material/${programSlug}`}
      />
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
          <div className="container py-8 md:py-12">
            <nav className="text-xs text-muted-foreground mb-3">
              <Link to="/college-study-material" className="hover:text-primary">College Study Material</Link>
              <span className="mx-1">/</span>
              <span className="text-foreground">{program?.name}</span>
            </nav>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">
              {program?.icon_emoji} {program?.name} <span className="text-primary">Universities</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Pick your university to get semester-wise notes, syllabus PDFs, PYQs and important questions.
            </p>
            <div className="mt-4 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search university (AKTU, VTU, RGPV…)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:border-primary outline-none"
              />
            </div>
          </div>
        </section>

        <section className="container py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No universities found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {filtered.map((u) => (
                <Link
                  key={u.slug}
                  to={`/college-study-material/${programSlug}/${u.slug}`}
                  className="group bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {u.logo ? (
                      <img src={u.logo} alt={u.name} className="w-12 h-12 rounded-lg object-contain bg-muted p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground line-clamp-2">{u.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.short_name}{u.state ? ` • ${u.state}` : ""}</p>
                    </div>
                  </div>
                  <p className="text-xs text-primary mt-4 inline-flex items-center gap-1">
                    {u.total_semesters} semesters <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <AlsoCheckSection />
      <Footer />
    </div>
  );
}
