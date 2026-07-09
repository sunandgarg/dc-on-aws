import { Laptop, GraduationCap } from "lucide-react";

export type ProgramMode = "regular" | "online";

interface Props {
  value: ProgramMode;
  onChange: (v: ProgramMode) => void;
  className?: string;
  compact?: boolean;
}

/** Regular / Online pill toggle used on every lead form. Defaults to "regular". */
export function ProgramModeToggle({ value, onChange, className = "", compact = false }: Props) {
  const opts: { key: ProgramMode; label: string; icon: any }[] = [
    { key: "regular", label: "Regular", icon: GraduationCap },
    { key: "online", label: "Online", icon: Laptop },
  ];
  return (
    <div className={`flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 ${className}`} role="radiogroup" aria-label="Program mode">
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active}
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg ${compact ? "h-7 text-[11px]" : "h-8 text-xs"} font-medium transition ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <o.icon className="w-3.5 h-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
