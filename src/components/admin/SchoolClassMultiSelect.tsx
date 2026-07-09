import { Badge } from "@/components/ui/badge";

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
  label?: string;
}

const CLASSES = [6, 7, 8, 9, 10, 11, 12];

export function SchoolClassMultiSelect({ value, onChange, label }: Props) {
  const toggle = (n: number) => {
    if (value.includes(n)) onChange(value.filter((v) => v !== n));
    else onChange([...value, n].sort((a, b) => a - b));
  };
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      {label && <label className="text-xs font-semibold text-foreground block">{label}</label>}
      <p className="text-[11px] text-muted-foreground leading-snug">
        Tap the classes whose syllabus this is built on. Students will see one-tap chips to jump to that class's study material.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CLASSES.map((n) => {
          const picked = value.includes(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                picked
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted hover:border-primary/40"
              }`}
            >
              Class {n}
            </button>
          );
        })}
      </div>
      {value.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No classes linked yet - pick one or more above.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {value.map((n) => (
            <Badge key={n} variant="secondary" className="text-[10px]">Class {n} ✓</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
