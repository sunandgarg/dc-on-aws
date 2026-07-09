import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";
import { Sparkles } from "lucide-react";
import { currentYear } from "@/lib/currentYear";
import { useCarouselNav, CarouselControls } from "@/components/CarouselControls";

/** Compact lightning-spark logo for the AI strip header. */
function AILogo({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_2px_8px_-2px_rgba(139,92,246,0.6)] ${className}`}>
      <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor" aria-hidden>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    </span>
  );
}

type Module = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  url: string;
  icon: string | null;
  sort_order: number;
  enabled: boolean;
};

function resolveIcon(name?: string | null) {
  if (!name) return Sparkles;
  const Cmp = (Icons as any)[name];
  return Cmp || Sparkles;
}

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

// Replace {year} / {next_year} placeholders with live values so titles like
// "Exam Calendar {year}" roll over automatically each Jan 1.
function renderDynamic(text: string | null | undefined): string {
  if (!text) return "";
  const y = currentYear();
  return text
    .replace(/\{year\}/gi, String(y))
    .replace(/\{next_year\}/gi, String(y + 1))
    .replace(/\{current_year\}/gi, String(y));
}

// Hand-picked Gen-Z gradient chips - rotates per card.
const CHIP_GRADIENTS = [
  "bg-gradient-to-br from-orange-400 to-rose-500",
  "bg-gradient-to-br from-emerald-400 to-teal-500",
  "bg-gradient-to-br from-indigo-500 to-violet-500",
  "bg-gradient-to-br from-amber-400 to-yellow-500",
];

// Hardcoded fallback tiles - always present even if DB row missing.
const FALLBACK_TILES: Module[] = [
  { id: "_tgt", key: "lock-target", title: "Target with AI", description: "Lock your dream college & get an AI roadmap", url: "/lock-target", icon: "Target", sort_order: -1, enabled: true },
  { id: "_psy", key: "psychometric-test", title: "Psychometric Test", description: "Find your career fit in 5 min", url: "/tools/psychometric-test", icon: "Brain", sort_order: 999, enabled: true },
];

// Tile keys to hide from this section regardless of DB source.
const HIDDEN_KEYS = new Set(["compare-colleges"]);

export function AlsoCheckSection({ className = "", variant = "grid" }: { className?: string; variant?: "grid" | "strip" }) {
  const { data: dbModules = [] } = useQuery({
    queryKey: ["also-check-modules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("also_check_modules")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Module[];
    },
    staleTime: 5 * 60_000,
  });

  // Merge DB + fallback, keyed by `key` - fallback only adds what's missing.
  const filteredDb = dbModules.filter((m) => !HIDDEN_KEYS.has(m.key));
  const haveKeys = new Set(filteredDb.map((m) => m.key));
  const missingFallbacks = FALLBACK_TILES.filter((t) => !haveKeys.has(t.key) && !HIDDEN_KEYS.has(t.key));
  const targetTile = missingFallbacks.find((t) => t.key === "lock-target");
  const otherFallbacks = missingFallbacks.filter((t) => t.key !== "lock-target");
  const modules: Module[] = [...(targetTile ? [targetTile] : []), ...filteredDb, ...otherFallbacks];


  if (!modules.length) return null;

  // Compact horizontal strip - designed for Gen Z mid-page placement.
  // Shows 3 cards per view, swipe to see more, with dot pagination.
  if (variant === "strip") {
    const { ref, pages, active, canLeft, canRight, scrollByDir, goToPage } = useCarouselNav();
    return (
      <section className={`mt-5 ${className}`} aria-label="Also check">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <AILogo />
            <h3 className="text-[12px] font-extrabold tracking-tight text-foreground truncate">
              AI tools Gen-Z is hooked on
            </h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase tracking-wide shrink-0">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              Free
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">swipe →</span>
        </div>
        <div
          ref={ref}
          className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 pb-1"
        >
          {modules.map((m, i) => {
            const Icon = resolveIcon(m.icon);
            const chip = CHIP_GRADIENTS[i % CHIP_GRADIENTS.length];
            const title = renderDynamic(m.title);
            const inner = (
              <div className="group snap-start shrink-0 basis-[calc((100%_-_2.1875rem)_/_4.5)] md:basis-[calc((100%_-_2.5rem)_/_5)] min-w-[76px] max-w-[92px] md:max-w-none flex flex-col items-start gap-1.5 p-2.5 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-md transition-all active:scale-95">
                <div className={`w-8 h-8 rounded-lg ${chip} text-white flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4 h-4" strokeWidth={2.4} />
                </div>
                <div className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary">{title}</div>
              </div>
            );
            return isExternal(m.url)
              ? <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer">{inner}</a>
              : <Link key={m.id} to={m.url || "#"}>{inner}</Link>;
          })}
        </div>
        <CarouselControls
          pages={pages}
          active={active}
          canLeft={canLeft}
          canRight={canRight}
          onPrev={() => scrollByDir("left")}
          onNext={() => scrollByDir("right")}
          onDot={(i) => goToPage(i)}
          label="also-check"
          showArrowsOnMobile={false}
        />
      </section>
    );
  }

  // Grid carousel - single row of cards, swipeable. Horizontal scroll is
  // isolated from the page (overscroll-contain + touch-action pan-x/pan-y so
  // diagonal gestures pass vertical scroll through to the page).
  const { ref, pages, active, canLeft, canRight, scrollByDir, goToPage } = useCarouselNav();

  return (
    <section className={`mt-10 px-4 md:px-0 ${className}`} aria-label="Also check">
      <div className="bg-card rounded-2xl border border-border p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <AILogo />
            <h2 className="text-base md:text-lg font-bold text-foreground truncate">Also Check</h2>
            <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase tracking-wide shrink-0">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              Free
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 md:hidden">swipe →</span>
        </div>
        <div
          ref={ref}
          style={{ overscrollBehaviorX: "contain", overscrollBehaviorY: "auto", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-1"
        >
          {modules.map((m, i) => {
            const Icon = resolveIcon(m.icon);
            const chip = CHIP_GRADIENTS[i % CHIP_GRADIENTS.length];
            const title = renderDynamic(m.title);
            const desc = renderDynamic(m.description);
            const content = (
              <div className="group h-full flex items-start gap-3 p-3 md:p-4 rounded-xl border border-border bg-background hover:border-primary hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl ${chip} text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary leading-tight line-clamp-2">{title}</div>
                  {desc && (
                    <div className="text-[11px] md:text-xs text-muted-foreground mt-0.5 line-clamp-2">{desc}</div>
                  )}
                </div>
              </div>
            );
            const inner = (
              <div className="snap-start shrink-0 basis-[calc((100%-1.5rem)/2.2)] md:basis-[calc((100%-3rem)/4)] min-w-0">
                {content}
              </div>
            );
            return isExternal(m.url) ? (
              <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="snap-start shrink-0 basis-[calc((100%-1.5rem)/2.2)] md:basis-[calc((100%-3rem)/4)] min-w-0">{content}</a>
            ) : (
              <Link key={m.id} to={m.url || "#"} className="snap-start shrink-0 basis-[calc((100%-1.5rem)/2.2)] md:basis-[calc((100%-3rem)/4)] min-w-0">{content}</Link>
            );
          })}
        </div>
        <CarouselControls
          pages={pages}
          active={active}
          canLeft={canLeft}
          canRight={canRight}
          onPrev={() => scrollByDir("left")}
          onNext={() => scrollByDir("right")}
          onDot={(i) => goToPage(i)}
          label="also-check"
          showArrowsOnMobile={false}
        />
      </div>
    </section>
  );
}



export default AlsoCheckSection;

