import { Check, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare, type CompareCollege } from "@/contexts/CompareContext";
import { cn } from "@/lib/utils";

interface Props {
  college: CompareCollege;
  variant?: "icon" | "full";
  className?: string;
}

export function CompareToggleButton({ college, variant = "full", className }: Props) {
  const { has, toggle } = useCompare();
  const active = has(college.slug);

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(college); }}
        title={active ? "Remove from compare" : "Add to compare"}
        aria-pressed={active}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-full border transition",
          active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary text-foreground",
          className,
        )}
      >
        {active ? <Check className="w-4 h-4" /> : <GitCompareArrows className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(college); }}
      className={cn("rounded-xl gap-1.5", className)}
    >
      {active ? <Check className="w-4 h-4" /> : <GitCompareArrows className="w-4 h-4" />}
      {active ? "Added" : "Compare"}
    </Button>
  );
}
