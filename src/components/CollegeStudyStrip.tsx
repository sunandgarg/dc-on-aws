import { Link } from "react-router-dom";
import { ArrowRight, Building2, GraduationCap } from "lucide-react";
import { useCollegePrograms } from "@/hooks/useCollegeStudy";

export function CollegeStudyStrip() {
  const { data: programs = [] } = useCollegePrograms();
  if (programs.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="bg-card rounded-3xl border border-border p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-2">
              <Building2 className="w-3 h-3" /> University-wise • Free PDFs
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">College Study Material</h2>
            <p className="text-sm text-muted-foreground mt-1">
              BTech, BCA, MBA & more - semester-wise notes, syllabus and PYQs from AKTU, VTU, RGPV & top universities.
            </p>
          </div>
          <Link to="/college-study-material" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
          {programs.slice(0, 8).map((p) => (
            <Link
              key={p.slug}
              to={`/college-study-material/${p.slug}`}
              className="snap-start shrink-0 basis-[calc(50%-0.375rem)] md:basis-[calc(25%-0.5625rem)] group bg-gradient-to-br from-primary/5 to-background hover:from-primary/10 border border-border hover:border-primary/40 rounded-2xl p-5 text-center transition-all"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform text-3xl">
                {p.icon_emoji || <GraduationCap className="w-8 h-8 text-primary" />}
              </div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Program</p>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">{p.name}</p>
              <p className="text-[11px] text-primary mt-2 inline-flex items-center gap-1 opacity-80">
                Universities & PYQs <ArrowRight className="w-3 h-3" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
