import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, GraduationCap, ArrowRight } from "lucide-react";
import { useHeroBanners, type HeroBanner } from "@/hooks/useHeroBanners";

const AUTOPLAY_MS = 7_840; // 40% slower again (was 5.6s)

export function HeroBannerCarousel() {
  const { data: banners } = useHeroBanners();
  const [current, setCurrent] = useState(0);

  const total = banners?.length ?? 0;

  // Auto-rotate every 15s
  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [total]);

  if (!banners || total === 0) return null;

  const goToLink = (url: string) => {
    if (!url || url === "#") return;
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
  };

  const handleClick = (b: HeroBanner) => {
    goToLink(b.link_url || "");
  };

  return (
    <section className="py-8 md:py-12" aria-labelledby="recommended-colleges-heading">
      <div className="container">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> Featured Picks
          </div>
          <h2 id="recommended-colleges-heading" className="text-headline font-bold text-primary">
            Recommended <span className="text-foreground">For You</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">Carefully Handpicked Institutions for Your Future</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {banners.map((banner, i) =>
              i === current ? (
                <motion.div
                  key={banner.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.56 }}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(banner)}
                    aria-label={`View ${banner.title}`}
                    className="group block w-full overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      {...({ fetchpriority: i === 0 ? "high" : "low" } as any)}
                      sizes="(max-width: 768px) 100vw, 1024px"
                      className="w-full h-56 sm:h-64 md:h-80 object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </button>

                  <div className="text-center mt-4 px-4">
                    <button
                      type="button"
                      onClick={() => handleClick(banner)}
                      className="text-lg sm:text-xl md:text-2xl font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
                    >
                      {banner.title}
                      <ArrowRight className="w-5 h-5 text-primary transition-transform group-hover:translate-x-1" />
                    </button>
                    {banner.subtitle && (
                      <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : null
            )}
          </AnimatePresence>

          {total > 1 && (
            <>
              <button
                onClick={() => setCurrent((c) => (c - 1 + total) % total)}
                aria-label="Previous"
                className="absolute left-2 top-32 md:top-40 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background shadow-md"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={() => setCurrent((c) => (c + 1) % total)}
                aria-label="Next"
                className="absolute right-2 top-32 md:top-40 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background shadow-md"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex justify-center gap-1.5 mt-4">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${i === current ? "bg-primary w-6" : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
