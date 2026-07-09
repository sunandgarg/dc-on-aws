import { Crown, Pin } from "lucide-react";

interface Props {
  priority?: number | null;
  className?: string;
  variant?: "crown" | "pin";
}

/**
 * Visual marker for pinned / high-priority listings.
 * Lower number = higher rank (priority 1 is the top).
 *  1–3  => Top Pick (gold)
 *  4–10 => Featured (primary)
 *  else => null
 */
export function PriorityBadge({ priority, className = "", variant = "crown" }: Props) {
  const p = Number(priority ?? 50);
  if (p <= 0 || p > 10) return null;
  const isTop = p <= 3;
  const Icon = variant === "pin" ? Pin : Crown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
        isTop
          ? "bg-amber-500 text-white"
          : "bg-primary text-primary-foreground"
      } ${className}`}
      title={`Priority ${p}`}
    >
      <Icon className="w-3 h-3" /> {isTop ? "Top Pick" : "Featured"}
    </span>
  );
}
