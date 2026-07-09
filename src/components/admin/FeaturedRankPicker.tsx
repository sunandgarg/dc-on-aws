import { Star } from "lucide-react";

interface Props {
  value: number | null | undefined;
  onChange: (rank: number | null) => void;
  label?: string;
  maxSlots?: number;
  helpText?: string;
  slotLabel?: (rank: number) => string;
}

/**
 * Pick a 1..maxSlots pinned slot or "None".
 * Used by Articles (News pin: 4 slots) and Colleges (Featured: 5 slots).
 * Selecting a rank already in use SHIFTS existing items down (handled by RPC on save).
 */
export function FeaturedRankPicker({
  value,
  onChange,
  label = "Pinned slot",
  maxSlots = 4,
  helpText,
  slotLabel,
}: Props) {
  const invalid = value != null && (value < 1 || value > maxSlots);
  const slots = Array.from({ length: maxSlots }, (_, i) => i + 1);
  const defaultSlotLabel = (r: number) => `#${r}${r === 1 ? " (Hero)" : ""}`;
  const renderLabel = slotLabel || defaultSlotLabel;
  return (
    <div data-testid="admin-featured-rank-picker">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Star className="w-3 h-3 text-amber-500" /> {label}
      </label>
      <div className={`flex gap-1 mt-1 flex-wrap ${invalid ? "ring-1 ring-destructive rounded-lg p-1" : ""}`}>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            !value ? "bg-muted text-foreground border-border" : "bg-card text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          Not pinned
        </button>
        {slots.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              value === r
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-card text-muted-foreground border-border hover:bg-amber-50 hover:text-amber-600"
            }`}
            title={r === 1 ? "Top / hero slot" : `Slot #${r}`}
          >
            {renderLabel(r)}
          </button>
        ))}
      </div>
      {invalid ? (
        <p className="text-[11px] text-destructive mt-1" data-testid="admin-featured-rank-error">
          Slot must be empty or between #1 and #{maxSlots}.
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground mt-1">
          {helpText || `Picking a slot pushes existing pinned items down; anything beyond #${maxSlots} unpins automatically.`}
        </p>
      )}
    </div>
  );
}
