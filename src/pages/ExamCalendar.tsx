import { Fragment as FragmentWithKey, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { Bell } from "lucide-react";
import { Calendar, Search, ChevronRight, ExternalLink, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { currentYear } from "@/lib/currentYear";

type ExamRow = {
  slug: string;
  name: string;
  short_name: string | null;
  category: string | null;
  exam_date: string | null;
  application_start_date: string | null;
  application_end_date: string | null;
  result_date: string | null;
  registration_url: string | null;
  logo: string | null;
  mode: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function ExamCalendar() {
  const year = currentYear();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<number | null>(null);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["exam-calendar", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("slug,name,short_name,category,exam_date,application_start_date,application_end_date,result_date,registration_url,logo,mode")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as ExamRow[];
    },
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    exams.forEach((e) => e.category && s.add(e.category));
    return ["All", ...Array.from(s).sort()];
  }, [exams]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return exams.filter((e) => {
      if (cat !== "All" && e.category !== cat) return false;
      if (ql && !`${e.name} ${e.short_name ?? ""}`.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [exams, q, cat]);

  // Bucket by month using best-available date (exam_date → application_end_date → application_start_date)
  const byMonth = useMemo(() => {
    const buckets: Record<number, Array<{ row: ExamRow; date: Date; label: string }>> = {};
    for (let i = 0; i < 12; i++) buckets[i] = [];
    filtered.forEach((row) => {
      const d =
        parseDate(row.exam_date) ||
        parseDate(row.application_end_date) ||
        parseDate(row.application_start_date);
      if (!d) return;
      if (d.getFullYear() !== year) return;
      const label = row.exam_date
        ? `Exam ${formatDate(d)}`
        : row.application_end_date
        ? `Apply by ${formatDate(d)}`
        : `Apply from ${formatDate(d)}`;
      buckets[d.getMonth()].push({ row, date: d, label });
    });
    Object.values(buckets).forEach((arr) => arr.sort((a, b) => a.date.getTime() - b.date.getTime()));
    return buckets;
  }, [filtered, year]);

  const monthsToShow = monthFilter !== null ? [monthFilter] : MONTHS.map((_, i) => i);

  const totalCount = Object.values(byMonth).reduce((acc, a) => acc + a.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Exam Calendar ${year} - All Important Entrance Exam Dates | DekhoCampus`}
        description={`Complete ${year} exam calendar with dates for JEE, NEET, CAT, GATE & all major entrance exams. Application start, last date, exam date & results.`}
      />
      <Navbar />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <PageBreadcrumb items={[{ label: "Home", href: "/" }, { label: `Exam Calendar ${year}` }]} />

        {/* Hero - Gen Z 2026: bold, sticky search, dopamine chips */}
        <section className="mt-3 rounded-3xl bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 border border-orange-200/60 p-5 md:p-7 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-300/30 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 backdrop-blur text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              <Calendar className="w-3 h-3" /> Live · {year}
            </div>
            <h1 className="mt-2.5 text-[28px] md:text-4xl font-black tracking-tight text-foreground leading-[1.05]">
              Every exam date<br/>that decides your <span className="text-orange-600">future</span> 🎯
            </h1>
            <p className="mt-2 text-[13px] md:text-base text-foreground/70 max-w-2xl">
              No more last-minute panic. Apply on time. Show up ready.
            </p>

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search JEE, NEET, CAT…"
                className="pl-9 h-11 rounded-2xl bg-white/80 backdrop-blur border-white text-sm"
              />
            </div>

            {/* Category pills */}
            <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x">
              {categories.slice(0, 8).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`shrink-0 snap-start px-3.5 h-9 rounded-full text-[12px] font-semibold whitespace-nowrap border transition ${
                    cat === c
                      ? "bg-foreground text-background border-foreground"
                      : "bg-white border-border text-foreground/80 hover:border-foreground/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Month chips */}
            <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x">
              <button
                onClick={() => setMonthFilter(null)}
                className={`shrink-0 snap-start px-3.5 h-9 rounded-full text-[12px] font-semibold whitespace-nowrap border transition ${
                  monthFilter === null ? "bg-orange-600 text-white border-orange-600" : "bg-white border-border text-foreground/80 hover:border-foreground/40"
                }`}
              >
                All
              </button>
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMonthFilter(monthFilter === i ? null : i)}
                  className={`shrink-0 snap-start inline-flex items-center gap-1 px-3.5 h-9 rounded-full text-[12px] font-semibold whitespace-nowrap border transition ${
                    monthFilter === i ? "bg-orange-600 text-white border-orange-600" : "bg-white border-border text-foreground/80 hover:border-foreground/40"
                  }`}
                >
                  <span>{m}</span>
                  {byMonth[i].length > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${monthFilter === i ? "bg-white/25 text-white" : "bg-orange-100 text-orange-700"}`}>
                      {byMonth[i].length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11px] text-foreground/60 font-medium">
              <Filter className="inline w-3 h-3 mr-1" />
              {totalCount} exam{totalCount !== 1 ? "s" : ""} tracked
            </p>
          </div>
        </section>

        {/* Mid-page discovery strip - Gen Z attention peak */}
        <AlsoCheckSection variant="strip" />


        {/* Month sections */}
        <div className="mt-6 space-y-6">
          {isLoading && (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading calendar…</div>
          )}

          {!isLoading && totalCount === 0 && (
            <div className="text-center py-10 bg-card border border-border rounded-2xl">
              <p className="text-sm text-muted-foreground">No exams match your filter.</p>
            </div>
          )}

          {!isLoading && (() => {
            const visibleMonths = monthsToShow.filter((mi) => byMonth[mi].length > 0);
            const midIdx = Math.floor(visibleMonths.length / 2);
            return visibleMonths.map((mi, idx) => {
              const items = byMonth[mi];
              const showLeadAfter = idx === midIdx - 1 && visibleMonths.length >= 2;
            const now = new Date();
            const isCurrentMonth = now.getMonth() === mi && now.getFullYear() === year;
            return (
              <FragmentWithKey key={mi}>
              <section>
                {/* Month header - full-width sticky divider */}
                <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-background/85 backdrop-blur-md border-y border-border/60 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-lg font-black tracking-tight text-foreground">
                        {MONTHS[mi]} <span className="text-muted-foreground font-bold">{year}</span>
                      </h2>
                      {isCurrentMonth && (
                        <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100">Now</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {items.length} exam{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {items.map(({ row, date }) => {
                    const day = date.getDate();
                    const isExamDate = !!row.exam_date;
                    return (
                      <Link
                        key={row.slug}
                        to={`/exams/${row.slug}`}
                        className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-orange-400 hover:shadow-sm active:scale-[0.99] transition"
                      >
                        {/* Date tile */}
                        <div className={`w-12 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          isExamDate
                            ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white"
                            : "bg-muted text-foreground"
                        }`}>
                          <span className="text-[9px] font-bold uppercase opacity-80 leading-none">{MONTHS[mi]}</span>
                          <span className="text-lg font-black leading-none mt-1">{day}</span>
                        </div>

                        {/* Body */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-orange-600">
                            {row.short_name || row.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isExamDate ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {isExamDate ? "Exam day" : row.application_end_date ? "Apply by" : "Apply from"}
                            </span>
                            {row.category && (
                              <span className="text-[10px] text-muted-foreground truncate">{row.category}</span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-600 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </section>
              {showLeadAfter && (
                <section key={`lead-${mi}`} className="my-6 rounded-3xl overflow-hidden border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
                  <div className="px-5 pt-5 pb-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      <Bell className="w-3 h-3" /> Free Updates
                    </div>
                    <h3 className="mt-2 text-xl md:text-2xl font-black tracking-tight text-foreground leading-tight">
                      Apply now & never miss an exam date 🔔
                    </h3>
                    <p className="mt-1 text-[13px] text-foreground/70">
                      Get full updates on application dates, admit cards, results & syllabus - straight to your phone.
                    </p>
                  </div>
                  <div className="px-2 pb-2">
                    <LeadCaptureForm
                      variant="inline"
                      source="exam_calendar_inline"
                      title=""
                      subtitle=""
                      simple
                    />
                  </div>
                </section>
              )}
              </FragmentWithKey>
              );
            });
          })()}
        </div>

        
      </main>

      <Footer />
    </div>
  );
}
