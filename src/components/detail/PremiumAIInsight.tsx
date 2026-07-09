import { Sparkles } from "lucide-react";

interface Props {
  program: any;
}

/**
 * 2026 redesign - conversational AI insight at the top of the read.
 * Synthesises a confidence-building summary of the program's value.
 */
export function PremiumAIInsight({ program }: Props) {
  const summary: string | undefined = (program as any).ai_summary || undefined;
  const name = program.title;
  const college = program.college_name;

  const fallback = (
    <>
      {name} from <span className="font-bold text-slate-900">{college}</span> is a{" "}
      <span className="font-bold text-slate-900">{program.duration || "-"}</span>{" "}
      {program.program_type || "program"} delivered{" "}
      <span className="font-bold text-slate-900">{program.delivery_mode || "online"}</span>.{" "}
      Rated <span className="font-bold text-blue-600">{Number(program.rating || 0).toFixed(1)}/5</span>{" "}
      by learners, it pairs industry-grade curriculum with mentor support - a{" "}
      <span className="font-bold text-blue-600">strong fit</span> if you want a measurable career
      jump. Enroll early - <span className="font-bold text-[#e85d3a]">seats fill fast</span> for this cohort.
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
