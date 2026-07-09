import { GraduationCap } from "lucide-react";

/**
 * Premium "Built by IIT Delhi Alumni" trust badge - used across all lead forms.
 * Warm orange pill for instant brand recognition.
 */
export function IITAlumniBadge({ className = "", showTagline = true }: { className?: string; showTagline?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-2.5 py-1 text-[11px] text-foreground ${className}`}>
      <GraduationCap className="w-3.5 h-3.5 text-primary" />
      <span className="text-[12px] font-bold text-primary relative -top-px">Built by IIT Delhi Alumni</span>
      {showTagline && <span className="text-muted-foreground hidden sm:inline">· Smarter admissions with AI</span>}
    </span>
  );
}
