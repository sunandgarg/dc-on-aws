import { Sparkles } from "lucide-react";

interface Props {
  college: any;
}

/**
 * 2026 redesign - conversational AI insight at the top of the read.
 * Reassures the visitor with a brand-voiced summary of "why this college".
 * Pulls from dynamic admin-written content when available, otherwise
 * synthesises from the college fields.
 */
export function CollegeAIInsight({ college }: Props) {
  const name = college.short_name || college.name;
  // Use admin-written summary if present; else build a reasonable default.
  const summary: string | undefined = (college as any).ai_summary || undefined;

  const fallback = (
    <>
      {name} is rated <span className="font-bold text-slate-900">{college.rating ?? "-"}/5</span>{" "}
      by students. With{" "}
      <span className="font-bold text-slate-900">{college.courses_count ?? "-"}+ courses</span>{" "}
      and an average placement of{" "}
      <span className="font-bold text-slate-900">{college.placement || "-"}</span>, it&apos;s a{" "}
      <span className="font-bold text-blue-600">strong fit</span> if you value{" "}
      {college.category?.toLowerCase() || "quality education"} in{" "}
      {college.location || "India"}. Apply early -{" "}
      <span className="font-bold text-[#e85d3a]">seats fill fast</span> for the upcoming session.
    </>
  );

  return (
    <section className="bg-blue-50/60 border border-blue-100 rounded-3xl p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3 md:mb-4">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-blue-700 text-sm md:text-base">
          DekhoCampus AI Insight
        </span>
      </div>
      <p className="text-slate-700 leading-relaxed text-sm md:text-base">
        {summary ? summary : fallback}
      </p>
    </section>
  );
}
