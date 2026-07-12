import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, GraduationCap, BookOpen, FileText, Briefcase, Stethoscope, Palette, Library, Sparkles, Trophy, Globe2, Scale, Layers, Award, NotebookPen, Newspaper } from "lucide-react";
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
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
      label: "CAT Universe",
      href: "/cat-universe",
      columns: [
        {
          title: "Post Exam",
          items: [
            { label: "CAT Score Calculator", href: "/cat-universe/cat-score-calculator" },
            { label: "XAT Score Calculator", href: "/cat-universe/xat-score-calculator" },
            { label: "CMAT Score Calculator", href: "/cat-universe/cmat-score-calculator" },
            { label: "SOP / WAT Support", href: "/cat-universe/sop-exam-score-wat" },
          ],
        },
        {
          title: "Post Result",
          items: [
            { label: "IIM Call Predictor", href: "/cat-universe/iim-call-predictor" },
            { label: "Interview Calls / Converts", href: "/cat-universe/interview-calls-converts" },
            { label: "Mock Interview & Dockets", href: "/cat-universe/mock-interview-and-dockets" },
            { label: "All CAT Universe →", href: "/cat-universe" },
          ],
        },
        {
          title: "Important Cut-offs",
          items: [
            { label: "CAT Based Colleges", href: "/cat-universe/cat-based-college-cutoffs" },
            { label: "XAT Based Colleges", href: "/cat-universe/xat-based-college-cutoffs" },
            { label: "IITs CAT Cutoff", href: "/cat-universe/iits-cat-cutoff" },
            { label: "CMAT Colleges & Cutoffs", href: "/cat-universe/cmat-based-colleges-and-cutoffs" },
          ],
        },
      ],
    },
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
      ],
    },
    {
      label: "Resources",
      columns: [
        { title: "News & Updates", items: [
          { label: "📰 Latest News", href: "/news" },
          { label: "🎓 Admission News", href: "/news/tag/admissions" },
          { label: "📊 Result Updates", href: "/news/tag/result" },
          { label: "All news →", href: "/news" },
        ] },
        { title: "Free AI Tools", items: [
          { label: "✨ AI College Finder", href: "/tools" },
          { label: "🎯 Rank Predictor", href: "/tools" },
          { label: "💸 EMI Calculator", href: "/tools" },
          { label: "All tools →", href: "/tools" },
        ] },
        { title: "Career & Guides", items: [
          { label: "💼 Career Profiles", href: "/careers" },
          { label: "🚀 Vacancies", href: "/vacancies" },
          { label: "📚 Guides & Tips", href: "/news/tag/tips" },
          { label: "🌍 Study Abroad", href: "/study-abroad" },
          { label: "🎓 Online Degrees", href: "/online-degrees" },
        ] },
      ],
    },
    {
      label: "News",
      href: "/news",
    },
  ];

  const iconFor = (l: string) => {
    if (l === "CAT Universe") return Sparkles;
    if (l === "Colleges") return GraduationCap;
    if (l === "Courses") return BookOpen;
    if (l === "Exams") return FileText;
    if (l === "Scholarships") return Award;
    if (l === "Study Material") return NotebookPen;
    if (l === "Resources") return Library;
    if (l === "News") return Newspaper;
    return Sparkles;
  };

  return (
    <nav ref={ref} className="hidden lg:flex items-center gap-0.5" aria-label="Main">
      {sections.map((s) => {
        const Icon = iconFor(s.label);
        const active = open === s.label;
        return (
          <div key={s.label} className="relative" onMouseLeave={() => active && setOpen(null)}>
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
                onMouseEnter={() => setOpen(s.label)}
                onClick={() => setOpen(active ? null : s.label)}
                className={`flex items-center gap-1 px-2.5 py-2 text-sm font-medium rounded-xl transition-colors ${active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:text-foreground hover:bg-secondary"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                <ChevronDown className={`w-3 h-3 transition ${active ? "rotate-180" : ""}`} />
              </button>
            )}
            <AnimatePresence>
              {active && s.columns && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className={`absolute left-0 top-full mt-1 bg-card rounded-2xl border border-border shadow-xl p-5 z-50 grid gap-5 ${s.columns.length === 4 ? "w-[860px] grid-cols-4" : "w-[720px] grid-cols-3"}`}
                >
                  {s.columns.map((col, i) => (
                    <div key={i}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">{col.title}</p>
                      <ul className="space-y-1.5">
                        {col.items.map((it) => (
                          <li key={it.label + it.href}>
                            <Link
                              to={it.href}
                              onClick={() => setOpen(null)}
                              className="text-sm text-foreground hover:text-primary transition truncate block"
                            >
                              {it.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
