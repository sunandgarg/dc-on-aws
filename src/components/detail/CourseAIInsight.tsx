import { Sparkles } from "lucide-react";

interface Props {
  course: any;
}

/**
 * 2026 redesign - conversational AI insight for a course page.
 * Brand-voiced summary that reduces cognitive load and builds trust upfront.
 */
export function CourseAIInsight({ course }: Props) {
  const name = course.name;
  const summary: string | undefined = (course as any).ai_summary || undefined;

  const fallback = (
    <>
      {name} is a <span className="font-bold text-slate-900">{course.duration || "-"}</span>{" "}
      {course.level?.toLowerCase() || ""} program offered at{" "}
      <span className="font-bold text-slate-900">{course.colleges_count ?? "-"}+ colleges</span>. Graduates earn an
      average of <span className="font-bold text-slate-900">{course.avg_salary || "-"}</span> with{" "}
      <span className="font-bold text-blue-600">{course.growth || "strong"} industry growth</span>. A{" "}
      <span className="font-bold text-[#e85d3a]">smart pick</span> for {course.category?.toLowerCase() || "career-focused"} careers in 2026.
    </>
  );

  return (
    <section className="bg-blue-50/60 border border-blue-100 rounded-3xl p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3 md:mb-4">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-blue-700 text-sm md:text-base">DekhoCampus AI Insight</span>
      </div>
      <p className="text-slate-700 leading-relaxed text-sm md:text-base">
        {summary ? summary : fallback}
      </p>
    </section>
  );
}
