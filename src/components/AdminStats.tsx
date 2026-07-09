import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface StatCardData {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "primary" | "success" | "muted" | "warning";
}

const toneClass: Record<NonNullable<StatCardData["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  muted: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function AdminStatsBar({ stats }: { stats: StatCardData[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
      {stats.map((s) => {
        const Icon = s.icon;
        const tone = toneClass[s.tone ?? "primary"];
        return (
          <div
            key={s.label}
            className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
          >
            {Icon && (
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium leading-tight">
                {s.label}
              </p>
              <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
              {s.hint && (
                <p className="text-[10px] text-muted-foreground truncate" title={s.hint}>
                  {s.hint}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface QuickFilterPillsProps<T extends string> {
  value: T | "all";
  onChange: (v: T | "all") => void;
  options: { label: string; value: T | "all"; count?: number }[];
}

export function QuickFilterPills<T extends string>({ value, onChange, options }: QuickFilterPillsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            value === o.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          {o.label}
          {typeof o.count === "number" && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
              {o.count}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
