import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Hook returning carousel state + helpers for any horizontally-scrolling
 * container (flex + overflow-x-auto). Tracks page count using item width
 * and provides keyboard-accessible scroll, dot navigation, and active page.
 */
export function useCarouselNav() {
  const ref = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [active, setActive] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const recompute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const total = el.scrollWidth;
    const view = el.clientWidth;
    setPages(Math.max(1, Math.ceil(total / view)));
    setActive(Math.round(el.scrollLeft / Math.max(1, view)));
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + view < total - 8);
  }, []);

  useEffect(() => {
    recompute();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c as Element));
    return () => ro.disconnect();
  }, [recompute]);

  const scrollByDir = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const goToPage = (idx: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  return { ref, pages, active, canLeft, canRight, recompute, scrollByDir, goToPage };
}

interface CarouselControlsProps {
  pages: number;
  active: number;
  canLeft: boolean;
  canRight: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
  label?: string;
  showArrowsOnMobile?: boolean;
}

/** Visible left/right buttons + accessible pagination dots. */
export function CarouselControls({
  pages, active, canLeft, canRight,
  onPrev, onNext, onDot,
  label = "carousel",
  showArrowsOnMobile = true,
}: CarouselControlsProps) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Previous ${label} slide`}
        onClick={onPrev}
        disabled={!canLeft}
        className={`rounded-full h-9 w-9 ${showArrowsOnMobile ? "" : "hidden md:inline-flex"}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div role="tablist" aria-label={`${label} pagination`} className="flex items-center gap-1.5">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            aria-label={`Go to ${label} slide ${i + 1} of ${pages}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => onDot(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") { e.preventDefault(); onDot(Math.min(pages - 1, active + 1)); }
              if (e.key === "ArrowLeft") { e.preventDefault(); onDot(Math.max(0, active - 1)); }
              if (e.key === "Home") { e.preventDefault(); onDot(0); }
              if (e.key === "End") { e.preventDefault(); onDot(pages - 1); }
            }}
            className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Next ${label} slide`}
        onClick={onNext}
        disabled={!canRight}
        className={`rounded-full h-9 w-9 ${showArrowsOnMobile ? "" : "hidden md:inline-flex"}`}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
