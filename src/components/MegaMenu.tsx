import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, GraduationCap, BookOpen, FileText, Briefcase, Stethoscope, Palette, Sparkles, Trophy, Scale, Award, NotebookPen, Newspaper } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { STREAM_CATEGORIES } from "@/lib/streamCategories";

interface Section {
  label: string;
  href?: string;
  columns?: { title: string; items: { label: string; href: string }[] }[];
  featured?: { title: string; subtitle: string; href: string };
}

function useMegaMenuData() {
  return useQuery({
    queryKey: ["mega-menu-data-v2"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [c, co, e] = await Promise.all([
        supabase.from("colleges").select("name,slug,category,state,city").eq("is_active", true).order("rating", { ascending: false }).limit(300),
        supabase.from("courses").select("name,slug,category,level").eq("is_active", true).limit(300),
        supabase.from("exams").select("name,slug,category,is_top_exam").eq("is_active", true).order("is_top_exam", { ascending: false }).limit(150),
      ]);
      return { colleges: c.data ?? [], courses: co.data ?? [], exams: e.data ?? [] };
    },
  });
}

const STREAMS = [
  { key: "Engineering", icon: FileText, exam: "JEE Main" },
  { key: "Management", icon: Briefcase, exam: "CAT" },
  { key: "Medical", icon: Stethoscope, exam: "NEET" },
  { key: "Design", icon: Palette, exam: "NID" },
  { key: "Law", icon: Scale, exam: "CLAT" },
  { key: "Commerce", icon: Trophy, exam: "" },
];

export function MegaMenu() {
  const { data } = useMegaMenuData();
  const [open, setOpen] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, []);

  // Anchor the menu to the complete sticky header, never to an individual
  // trigger. This keeps every section aligned to the same left/right edges.
  const positionPanel = () => {
    const header = ref.current?.closest("header");
    if (header) setPanelTop(Math.max(0, header.getBoundingClientRect().bottom + 8));
  };

  useEffect(() => {
    if (!open) return;
    const update = () => positionPanel();
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const byCat = (arr: any[], cat: string) => arr.filter((x: any) => (x.category || "").toLowerCase() === cat.toLowerCase());
  const byState = (arr: any[]) => {
    const m: Record<string, any[]> = {};
    arr.forEach((c) => { if (c.state) (m[c.state] ||= []).push(c); });
    return m;
  };
  const states = byState(data?.colleges || []);
  const topStates = Object.entries(states).sort((a, b) => b[1].length - a[1].length).slice(0, 8);

  const streamSection = (cat: string): Section => ({
    label: cat,
    columns: [
      {
        title: "Top Colleges",
        items: byCat(data?.colleges || [], cat).slice(0, 7).map((c: any) => ({ label: c.name, href: `/colleges/${c.slug}` }))
          .concat([{ label: `View all ${cat} colleges →`, href: `/colleges?stream=${encodeURIComponent(cat)}` }]),
      },
      {
        title: "Popular Courses",
        items: byCat(data?.courses || [], cat).slice(0, 7).map((c: any) => ({ label: c.name, href: `/courses/${c.slug}` }))
          .concat([{ label: `View all ${cat} courses →`, href: `/courses?stream=${encodeURIComponent(cat)}` }]),
      },
      {
        title: "Entrance Exams",
        items: byCat(data?.exams || [], cat).slice(0, 6).map((e: any) => ({ label: e.name, href: `/exams/${e.slug}` }))
          .concat([{ label: `All ${cat} exams →`, href: `/exams?category=${encodeURIComponent(cat)}` }]),
      },
    ],
  });

  // Build the Streams mega-menu by chunking 12 streams into 3 columns of 4
  const streamCols = (() => {
    const cols: { title: string; items: { label: string; href: string }[] }[] = [];
    const chunkSize = Math.ceil(STREAM_CATEGORIES.length / 3);
    for (let i = 0; i < STREAM_CATEGORIES.length; i += chunkSize) {
      const chunk = STREAM_CATEGORIES.slice(i, i + chunkSize);
      cols.push({
        title: i === 0 ? "Popular Streams" : i === chunkSize ? "Professional" : "Emerging & More",
        items: chunk.map((s) => ({ label: `${s.emoji} ${s.label}`, href: `/colleges?stream=${encodeURIComponent(s.id)}` })),
      });
    }
    cols.push({
      title: "Quick Browse",
      items: [
        { label: "All Colleges →", href: "/colleges" },
        { label: "All Courses →", href: "/courses" },
        { label: "All Exams →", href: "/exams" },
        { label: "Scholarships →", href: "/scholarships" },
      ],
    });
    return cols;
  })();

  const sections: Section[] = [
    {
      label: "Colleges",
      columns: [
        { title: "By Stream", items: (STREAM_CATEGORIES as readonly any[]).slice(0, 8).map((s: any) => ({ label: s.label, href: `/colleges?stream=${encodeURIComponent(s.id)}` })).concat([{ label: "All colleges →", href: "/colleges" }]) },
        { title: "By Type", items: [
          { label: "Government Colleges", href: "/colleges?type=Government" },
          { label: "Private Colleges", href: "/colleges?type=Private" },
          { label: "Deemed Universities", href: "/colleges?type=Deemed" },
          { label: "Autonomous", href: "/colleges?type=Autonomous" },
        ] },
        { title: "Popular States", items: topStates.slice(0, 6).map(([st, list]) => ({ label: `${st} (${list.length})`, href: `/colleges?state=${encodeURIComponent(st)}` })).concat([{ label: "Browse all states →", href: "/colleges" }]) },
        { title: "Top Ranked", items: (data?.colleges || []).slice(0, 5).map((c: any) => ({ label: c.name, href: `/colleges/${c.slug}` })).concat([{ label: "All rankings →", href: "/colleges?sort=rating" }]) },
      ],
    },
    {
      label: "Courses",
      columns: [
        { title: "By Level", items: [
          { label: "Undergraduate (UG)", href: "/courses?level=Undergraduate" },
          { label: "Postgraduate (PG)", href: "/courses?level=Postgraduate" },
          { label: "Diploma", href: "/courses?level=Diploma" },
          { label: "Doctorate (PhD)", href: "/courses?level=Doctorate" },
        ] },
        { title: "By Stream", items: (STREAM_CATEGORIES as readonly any[]).slice(0, 8).map((s: any) => ({ label: s.label, href: `/courses?stream=${encodeURIComponent(s.id)}` })) },
        { title: "By Mode", items: [
          { label: "Full-Time", href: "/courses?mode=Full-Time" },
          { label: "Part-Time", href: "/courses?mode=Part-Time" },
          { label: "Online / Distance", href: "/courses?mode=Online" },
        ] },
        { title: "Popular", items: (data?.courses || []).slice(0, 6).map((c: any) => ({ label: c.name, href: `/courses/${c.slug}` })).concat([{ label: "All courses →", href: "/courses" }]) },
      ],
    },
    {
      label: "Exams",
      columns: [
        { title: "Top Exams", items: (data?.exams || []).filter((e: any) => e.is_top_exam).slice(0, 7).map((e: any) => ({ label: e.name, href: `/exams/${e.slug}` })).concat([{ label: "All exams →", href: "/exams" }]) },
        { title: "By Stream", items: STREAMS.filter((s) => s.exam).map((s) => ({ label: `${s.exam} (${s.key})`, href: `/exams?category=${encodeURIComponent(s.key)}` })) },
        { title: "By Level", items: [
          { label: "National", href: "/exams?level=National" },
          { label: "State", href: "/exams?level=State" },
          { label: "University", href: "/exams?level=University" },
        ] },
      ],
    },
    {
      label: "Scholarships",
      href: "/scholarships",
      columns: [
        { title: "By Level", items: [
          { label: "Undergraduate (UG)", href: "/scholarships?level=UG" },
          { label: "Postgraduate (PG)", href: "/scholarships?level=PG" },
          { label: "School / Class 8-12", href: "/scholarships?level=School" },
          { label: "All scholarships →", href: "/scholarships" },
        ] },
        { title: "By Category", items: [
          { label: "🏆 Merit-based", href: "/scholarships?category=Merit" },
          { label: "💰 Need-based", href: "/scholarships?category=Need" },
          { label: "🎯 Government", href: "/scholarships?category=Government" },
          { label: "🌍 Study Abroad", href: "/scholarships?category=Abroad" },
        ] },
      ],
    },
    {
      label: "Study Material",
      href: "/study-material",
      columns: [
        { title: "By Class", items: [12, 11, 10, 9, 8].map((c) => ({ label: `📘 Class ${c}`, href: `/study-material/class-${c}` })) },
        { title: "By Board", items: [
          { label: "CBSE", href: "/study-material?board=cbse" },
          { label: "ICSE", href: "/study-material?board=icse" },
          { label: "State Board", href: "/study-material?board=state" },
          { label: "IB / IGCSE", href: "/study-material?board=ib" },
          { label: "All boards →", href: "/study-material" },
        ] },
        { title: "Quick Picks", items: [
          { label: "📝 Sample Papers", href: "/news/tag/sample-papers" },
          { label: "📅 Date Sheets", href: "/news/tag/date-sheet" },
          { label: "📖 Chapter Notes", href: "/news/tag/notes" },
          { label: "🧠 PYQs (Last 10 yr)", href: "/news/tag/previous-papers" },
        ] },
        { title: "College Study Material", items: [
          { label: "B.Tech Notes and Papers", href: "/college-study-material?program=btech" },
          { label: "BCA Notes and Papers", href: "/college-study-material?program=bca" },
          { label: "MBA Notes and Papers", href: "/college-study-material?program=mba" },
          { label: "Browse universities", href: "/college-study-material" },
        ] },
      ],
    },
    {
      label: "CAT Universe",
      href: "/cat-universe",
      columns: [
        { title: "Post Exam", items: [
          { label: "CAT Score Calculator", href: "/cat-universe/cat-score-calculator" },
          { label: "XAT Score Calculator", href: "/cat-universe/xat-score-calculator" },
          { label: "CMAT Score Calculator", href: "/cat-universe/cmat-score-calculator" },
          { label: "SOP, Score and WAT Desk", href: "/cat-universe/sop-exam-score-wat" },
        ] },
        { title: "Pre Exam", items: [
          { label: "Last 10 Year CAT Papers", href: "/cat-universe/cat-previous-year-papers" },
          { label: "XAT Previous Papers", href: "/cat-universe/xat-previous-year-papers" },
          { label: "MAT Previous Papers", href: "/cat-universe/mat-previous-year-papers" },
          { label: "GMAT Previous Papers", href: "/cat-universe/gmat-previous-year-papers" },
        ] },
        { title: "Post Result", items: [
          { label: "IIM Call Predictor", href: "/cat-universe/iim-call-predictor" },
          { label: "Interview Calls and Converts", href: "/cat-universe/interview-calls-converts" },
          { label: "Mock Interviews and Dockets", href: "/cat-universe/mock-interview-and-dockets" },
        ] },
        { title: "College Cut-offs", items: [
          { label: "CAT College Cut-offs", href: "/cat-universe/cat-based-college-cutoffs" },
          { label: "NMAT College Cut-offs", href: "/cat-universe/nmat-based-college-cutoffs" },
          { label: "XAT College Cut-offs", href: "/cat-universe/xat-based-college-cutoffs" },
          { label: "All CAT Universe →", href: "/cat-universe" },
        ] },
      ],
    },
    {
      label: "News",
      href: "/news",
    },
  ];

  const iconFor = (l: string) => {
    if (l === "Colleges") return GraduationCap;
    if (l === "Courses") return BookOpen;
    if (l === "Exams") return FileText;
    if (l === "Scholarships") return Award;
    if (l === "Study Material") return NotebookPen;
    if (l === "CAT Universe") return Sparkles;
    if (l === "News") return Newspaper;
    return Sparkles;
  };

  // One shared outer width gives every menu exactly the same alignment. The
  // inner grid adapts to the number of content columns without changing the
  // panel's position or causing horizontal overflow.
  const menuGridClass = (columns: number) =>
    columns >= 4 ? "grid-cols-4" : columns === 2 ? "grid-cols-2" : "grid-cols-3";

  const activeSection = open ? sections.find((section) => section.label === open) : undefined;

  return (
    <nav ref={ref} className="relative hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
      {sections.map((s) => {
        const Icon = iconFor(s.label);
        const active = open === s.label;
        return (
          <div key={s.label}>
            {!s.columns && s.href ? (
              <Link
                to={s.href}
                className={`flex items-center gap-1 px-2.5 py-2 text-sm font-medium rounded-xl transition-colors text-foreground/80 hover:text-foreground hover:bg-secondary`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </Link>
            ) : (
              <button
                type="button"
                aria-expanded={active}
                aria-haspopup="menu"
                onPointerEnter={() => { if (open && !active) setOpen(s.label); }}
                onFocus={() => setOpen(s.label)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (active) setOpen(null);
                  else setOpen(s.label);
                }}
                className={`flex items-center gap-1 px-2.5 py-2 text-sm font-medium rounded-xl transition-colors ${active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:text-foreground hover:bg-secondary"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                <ChevronDown className={`w-3 h-3 transition ${active ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        );
      })}
      <AnimatePresence initial={false}>
        {activeSection?.columns && (
          <motion.div
            key={activeSection.label}
            role="menu"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onPointerDown={(event) => event.stopPropagation()}
            style={{ top: panelTop }}
            className={`fixed left-1/2 z-[80] grid h-auto w-[min(1370px,calc(100vw-32px))] max-w-[calc(100vw-32px)] max-h-[min(72vh,620px)] -translate-x-1/2 origin-top gap-4 overflow-x-hidden overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_30px_90px_-34px_rgba(15,23,42,.45)] sm:gap-5 sm:p-5 xl:p-6 ${menuGridClass(activeSection.columns.length)}`}
          >
            {activeSection.columns.map((col, i) => (
              <div key={i} className="min-w-0 rounded-2xl bg-slate-50/90 p-3.5 ring-1 ring-inset ring-slate-100 sm:p-4">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.13em] text-primary"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{col.title}</p>
                <ul className="space-y-0.5">
                  {col.items.map((it) => (
                    <li key={it.label + it.href}>
                      <Link
                        role="menuitem"
                        to={it.href}
                        onClick={() => setOpen(null)}
                        className="group flex min-h-9 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium leading-5 text-slate-700 transition hover:bg-white hover:text-primary hover:shadow-sm sm:text-sm"
                      >
                        <span className="truncate">{it.label}</span><span className="opacity-0 transition group-hover:opacity-100">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="col-span-full flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div><p className="text-sm font-extrabold text-slate-900">Explore with confidence</p><p className="text-xs text-slate-500">Verified colleges, courses, exams and decision tools in one place.</p></div>
              {activeSection.href && <Link to={activeSection.href} onClick={() => setOpen(null)} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/20">View all {activeSection.label} →</Link>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
