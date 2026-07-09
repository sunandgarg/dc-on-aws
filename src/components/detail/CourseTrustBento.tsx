import { Clock, Building, Briefcase, TrendingUp } from "lucide-react";

interface Props {
  course: any;
}

/**
 * 2026 redesign - at-a-glance trust signals for a course.
 * Answers "How long? Where? What do I earn? Is it growing?" in one glance.
 */
export function CourseTrustBento({ course }: Props) {
  const items = [
    { icon: Clock, label: "Duration", value: course.duration || "-" },
    { icon: Building, label: "Colleges", value: course.colleges_count ? `${course.colleges_count}+` : "-" },
    { icon: Briefcase, label: "Avg Salary", value: course.avg_salary || "-" },
    { icon: TrendingUp, label: "Industry Growth", value: course.growth || "-" },
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
