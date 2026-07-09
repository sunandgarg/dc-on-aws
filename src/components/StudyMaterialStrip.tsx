import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { useCarouselNav, CarouselControls } from "@/components/CarouselControls";
import gradHat from "@/assets/graduate-hat.png";

const CLASSES = [12, 11, 10, 9, 8];

export function StudyMaterialStrip() {
  const { ref: scrollRef, pages, active, canLeft, canRight, recompute, scrollByDir, goToPage } = useCarouselNav();

  return (
    <section className="py-8 md:py-10">
      <div className="bg-card rounded-3xl border border-border p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-2">
              <BookOpen className="w-3 h-3" /> 100% FREE • Verified PDFs
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Study Material</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Class 12 to 8 chapter notes & last 10 years' question papers - swipe to explore.
            </p>
          </div>
          <Link
            to="/study-material"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div
          ref={scrollRef}
          onScroll={recompute}
          role="region"
          aria-roledescription="carousel"
          aria-label="Study material classes"
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
        >
          {CLASSES.map((c) => (
            <Link
              key={c}
              to={`/study-material/class-${c}`}
              className="snap-start shrink-0 basis-[calc(50%-0.375rem)] md:basis-[calc(25%-0.5625rem)] group bg-gradient-to-br from-primary/5 to-background hover:from-primary/10 border border-border hover:border-primary/40 rounded-2xl p-5 text-center transition-all"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <img src={gradHat} alt="" className="w-8 h-8 md:w-9 md:h-9 object-contain" />
              </div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Class</p>
              <p className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">{c}</p>
              <p className="text-[11px] text-primary mt-2 inline-flex items-center gap-1 opacity-80">
                Notes & PYQs <ArrowRight className="w-3 h-3" />
              </p>
            </Link>
          ))}
        </div>

        <CarouselControls
          pages={pages}
          active={active}
          canLeft={canLeft}
          canRight={canRight}
          onPrev={() => scrollByDir("left")}
          onNext={() => scrollByDir("right")}
          onDot={goToPage}
          label="study material classes"
        />
      </div>
    </section>
  );
}
