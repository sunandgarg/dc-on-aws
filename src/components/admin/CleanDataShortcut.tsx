import { Link } from "react-router-dom";
import { ArrowRight, DatabaseZap, Image, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROUTE_CONTEXT = [
  { prefix: "/admin/colleges", type: "colleges", label: "college" },
  { prefix: "/admin/courses", type: "courses", label: "course" },
  { prefix: "/admin/exams", type: "exams", label: "exam" },
  { prefix: "/admin/articles", type: "articles", label: "article" },
  { prefix: "/admin/scholarships", type: "scholarships", label: "scholarship" },
  { prefix: "/admin/study-material", type: "study_material", label: "study material" },
  { prefix: "/admin/college-study", type: "college_study", label: "college study material" },
  { prefix: "/admin/cat-universe", type: "cat_universe", label: "CAT Universe content" },
] as const;

export function CleanDataShortcut({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/admin/clean-data")) return null;
  const context = ROUTE_CONTEXT.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  if (!context) return null;

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-r from-slate-950 via-blue-950 to-primary text-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <DatabaseZap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold md:text-base">Improve this {context.label} library with official-source AI</h2>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">Review first</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-100/80 md:text-xs">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Official sources only</span>
              <span className="inline-flex items-center gap-1"><Image className="h-3.5 w-3.5" /> Images, logos and documents</span>
              <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Data + SEO/GEO/AEO</span>
            </div>
          </div>
        </div>
        <Link to={`/admin/clean-data?types=${encodeURIComponent(context.type)}`} className="shrink-0">
          <Button className="h-10 w-full rounded-xl bg-white text-slate-950 hover:bg-blue-50 md:w-auto">
            Open Clean Data <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
