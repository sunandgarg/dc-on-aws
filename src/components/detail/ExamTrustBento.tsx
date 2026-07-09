import { Calendar, Users, Award, Clock } from "lucide-react";

interface Props {
  exam: any;
}

/**
 * 2026 redesign - at-a-glance trust signals for an exam.
 */
export function ExamTrustBento({ exam }: Props) {
  const items = [
    { icon: Calendar, label: "Exam Date", value: exam.exam_date || "TBA" },
    { icon: Users, label: "Applicants", value: exam.applicants || "-" },
    { icon: Award, label: "Mode", value: exam.mode || "-" },
    { icon: Clock, label: "Duration", value: exam.duration || "-" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="bg-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl transition hover:bg-slate-200/70"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <it.icon className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{it.label}</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-600 leading-tight">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
