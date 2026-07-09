import { buildCollegeHref } from "@/lib/entityUrls";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, ArrowRight, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDbColleges } from "@/hooks/useCollegesData";
import { useFeaturedColleges } from "@/hooks/useFeaturedColleges";
import { useCarouselNav, CarouselControls } from "@/components/CarouselControls";
import { useEffect, useRef, useState } from "react";

export function TopRankedColleges() {
  const { data: featuredSlugs } = useFeaturedColleges();
  const { data: allColleges, isLoading } = useDbColleges();
  const { ref: scrollRef, pages, active, canLeft, canRight, recompute, scrollByDir, goToPage } = useCarouselNav();
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const colleges = (() => {
    if (!allColleges?.length) return [];
    const list = featuredSlugs?.length
      ? featuredSlugs.map((slug) => allColleges.find((c) => c.slug === slug)).filter(Boolean)
      : [...allColleges].sort((a, b) => b.rating - a.rating);
    const seen = new Set<string>();
    return list.filter((c: any) => {
      if (seen.has(c.slug)) return false;
      seen.add(c.slug);
      return true;
    }).slice(0, 8);
  })();

  // Autoplay: advance every 9s, wrap to start at the end. Pauses on hover/focus.
  useEffect(() => {
    if (!colleges.length) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByDir("right");
      }
    }, 9000);
    return () => window.clearInterval(id);
  }, [colleges.length, scrollByDir, scrollRef]);

  if (!isLoading && !colleges.length) return null;

  return (
    <section className="py-8 md:py-12 bg-background" aria-labelledby="top-colleges-heading">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-3">
              <GraduationCap className="w-4 h-4" />
              Featured Institutions
            </div>
            <h2 id="top-colleges-heading" className="text-headline font-bold text-foreground">
              <span className="text-gradient-accent">Featured</span> Colleges
            </h2>
            <p className="text-muted-foreground mt-1">Handpicked top institutions from across India</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous" className="rounded-full w-9 h-9 hidden md:inline-flex" onClick={() => scrollByDir("left")} disabled={!canLeft}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Next" className="rounded-full w-9 h-9 hidden md:inline-flex" onClick={() => scrollByDir("right")} disabled={!canRight}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Link to="/colleges">
              <Button variant="outline" className="rounded-xl border-accent/20 hover:bg-accent/5">
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          onScroll={recompute}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured colleges"
          tabIndex={0}
          className="flex gap-4 overflow-x-auto overflow-y-clip scrollbar-hide snap-x snap-proximity pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={`sk-${i}`} className="snap-start flex-shrink-0 w-[260px] sm:w-[280px]">
                  <div className="bg-card rounded-2xl border border-border overflow-hidden h-[260px] flex flex-col">
                    <div className="h-36 bg-muted animate-pulse" />
                    <div className="p-3 space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-muted rounded animate-pulse w-2/5" />
                    </div>
                  </div>
                </div>
              ))
            : colleges.map((college: any, idx: number) => (
                <div
                  key={college.slug}
                  className="snap-start flex-shrink-0 w-[260px] sm:w-[280px]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${colleges.length}: ${college.name}`}
                >
                  <Link
                    to={buildCollegeHref(college)}
                    className="group block bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all h-[260px] flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="relative h-36 overflow-hidden flex-shrink-0">
                      <img
                        src={college.image}
                        alt={college.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <Badge className="absolute top-2 left-2 bg-foreground/70 text-background border-0 text-[10px]">
                        {college.type}
                      </Badge>
                    </div>
                    <div className="p-3 space-y-2 flex-1 min-h-0">
                      <h3 className="font-bold text-foreground text-sm line-clamp-1">{college.short_name || college.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{college.city || college.location?.split(",")[0]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < Math.floor(college.rating) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{college.rating}</span>
                      </div>
                    </div>
                  </Link>
                </div>
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
          label="featured colleges"
        />
      </div>
    </section>
  );
}
