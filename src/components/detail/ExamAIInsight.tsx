import { Sparkles } from "lucide-react";

interface Props {
  exam: any;
}

export function ExamAIInsight({ exam }: Props) {
  const summary: string | undefined = (exam as any).ai_summary || undefined;
  const fallback = (
    <>
      {exam.name} is a <span className="font-bold text-slate-900">{exam.level?.toLowerCase() || "national"}</span>{" "}
      level exam conducted in <span className="font-bold text-slate-900">{exam.mode || "-"}</span> mode for{" "}
      <span className="font-bold text-slate-900">{exam.duration || "-"}</span>.{" "}
      <span className="font-bold text-blue-600">{exam.applicants || "Lakhs of"} students</span> appear every year.{" "}
      Start prep early - <span className="font-bold text-[#e85d3a]">competition is fierce</span> and seats are limited.
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
