import { Star, Clock, Layers, TrendingUp } from "lucide-react";

interface Props {
  program: any;
  emiLabel: string;
}

/**
 * 2026 redesign - at-a-glance trust signals for a premium program.
 * Mirrors the College / Course / Exam trust bento for visual consistency.
 */
export function PremiumTrustBento({ program, emiLabel }: Props) {
  const items = [
    {
      icon: Star,
      label: "Rating",
      value: Number(program.rating) > 0 ? `${Number(program.rating).toFixed(1)}/5` : "-",
    },
    {
      icon: Clock,
      label: "Duration",
      value: program.duration || "-",
    },
    {
      icon: Layers,
      label: "Mode",
      value: program.delivery_mode || program.program_type || "-",
    },
    {
      icon: TrendingUp,
      label: "EMI from",
      value: emiLabel,
    },
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
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {it.label}
            </p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-600 leading-tight">
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}
