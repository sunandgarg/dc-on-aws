import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCarouselNav, CarouselControls } from "@/components/CarouselControls";
import {
  FileDown, Lightbulb, Calendar, CalendarClock, Clock, Timer,
  TimerReset, Zap, Flame, Sparkles, Rocket, ArrowRight, Trophy
} from "lucide-react";
import { findStrategyByKey } from "@/lib/examStrategies";

type Strategy = { key: string; label: string; icon: any; tone: string };

const STRATEGIES: Strategy[] = [
  { key: "sample-paper",      label: "Sample Paper",       icon: FileDown,     tone: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900" },
  { key: "tips-tricks",       label: "Tips & Tricks",      icon: Lightbulb,    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900" },
  { key: "1-month",           label: "Last 1 Month",       icon: Calendar,     tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900" },
  { key: "15-days",           label: "15 Days Plan",       icon: Calendar,     tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900" },
  { key: "7-days",            label: "7 Days Plan",        icon: CalendarClock,tone: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900" },
  { key: "3-days",            label: "3 Days Plan",        icon: CalendarClock,tone: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900" },
  { key: "2-days",            label: "2 Days Plan",        icon: CalendarClock,tone: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900" },
  { key: "1-day",             label: "1 Day Plan",         icon: Clock,        tone: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900" },
  { key: "18-hours",          label: "18 Hours",           icon: Clock,        tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900" },
  { key: "12-hours",          label: "12 Hours",           icon: Clock,        tone: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900" },
  { key: "8-hours",           label: "8 Hours",            icon: Clock,        tone: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900" },
  { key: "6-hours",           label: "6 Hours",            icon: Timer,        tone: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900" },
  { key: "3-hours",           label: "3 Hours",            icon: Timer,        tone: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900" },
  { key: "1-hour",            label: "1 Hour",             icon: TimerReset,   tone: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900" },
  { key: "30-min",            label: "30 Min",             icon: TimerReset,   tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900" },
  { key: "15-min",            label: "15 Min",             icon: Zap,          tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900" },
  { key: "10-min",            label: "10 Min",             icon: Zap,          tone: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:border-fuchsia-900" },
  { key: "5-min",             label: "5 Min",              icon: Flame,        tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900" },
  { key: "last-2-min",        label: "Last 2 Min",         icon: Rocket,       tone: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900" },
];

function useTopExams() {
  return useQuery({
    queryKey: ["top-exams-strategies"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("slug,name,short_name,logo,image,category")
        .eq("is_active", true)
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function ExamStrategiesSection() {
  const { data: exams = [], isLoading } = useTopExams();
  const { ref: scrollRef, pages, active, canLeft, canRight, recompute, scrollByDir, goToPage } = useCarouselNav();

  const items = useMemo(() => exams.slice(0, 12), [exams]);

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="py-8 md:py-10" aria-labelledby="exam-strategies-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide mb-2">
            <Trophy className="w-3 h-3" /> Top Exams • Strategies
          </div>
          <h2 id="exam-strategies-heading" className="text-xl md:text-2xl font-bold text-foreground">
            Top Exams - <span className="text-primary">Strategy Shortcuts</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sample papers, tips & tricks and crash-time plans - from 1 month down to last 2 minutes.
          </p>
        </div>
        <Link to="/exams" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
          All exams <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div
        ref={scrollRef}
        onScroll={recompute}
        role="region"
        aria-roledescription="carousel"
        aria-label="Top exams with strategy shortcuts"
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-proximity pb-2"
      >
        {(isLoading ? Array.from({ length: 4 }) : items).map((exam: any, i: number) => (
          <article
            key={exam?.slug ?? `sk-${i}`}
            className="snap-start shrink-0 w-[300px] sm:w-[340px] bg-card rounded-2xl border border-border overflow-hidden flex flex-col"
          >
            <Link to={exam ? `/exams/${exam.slug}` : "#"} className="flex items-center gap-3 p-4 border-b border-border hover:bg-muted/40 transition-colors">
              {exam?.logo || exam?.image ? (
                <img src={exam.logo || exam.image} alt={exam.name} className="w-11 h-11 rounded-xl object-cover bg-muted" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground truncate">{exam?.short_name || exam?.name || "-"}</p>
                <p className="text-xs text-muted-foreground truncate">{exam?.category || "Exam strategy hub"}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>

            <div className="p-3 flex flex-wrap gap-1.5">
              {STRATEGIES.map(s => {
                const Icon = s.icon;
                const strat = findStrategyByKey(s.key);
                const href = exam && strat ? `/exams/${exam.slug}/${strat.slug}` : "#";
                return (
                  <Link
                    key={s.key}
                    to={href}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-semibold border ${s.tone} hover:opacity-90 transition-opacity`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {s.label}
                  </Link>
                );
              })}
            </div>
          </article>
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
        label="exam strategy shortcuts"
      />
    </section>
  );
}
