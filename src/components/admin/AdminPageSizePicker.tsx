import { useState } from "react";

interface AdminPageSizePickerProps {
  value: number;
  onChange: (size: number) => void;
  totalLabel?: string; // e.g. "of 1,240"
  className?: string;
}

const PRESETS = [10, 20, 50, 100];

/**
 * Reusable "Show: 10 / 20 / 50 / 100 / Custom" picker for admin list pages.
 * Persists the chosen size to the parent via onChange; parent controls actual slicing.
 */
export function AdminPageSizePicker({ value, onChange, totalLabel, className }: AdminPageSizePickerProps) {
  const isCustom = !PRESETS.includes(value);
  const [customInput, setCustomInput] = useState<string>(isCustom ? String(value) : "");
  const [customOpen, setCustomOpen] = useState(isCustom);

  return (
    <div className={`flex items-center gap-2 text-xs ${className || ""}`}>
      <span className="text-muted-foreground">Show:</span>
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => { setCustomOpen(false); onChange(n); }}
            className={`px-2.5 py-1 transition-colors ${
              !isCustom && value === n
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className={`px-2.5 py-1 border-l border-border transition-colors ${
            isCustom ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
          }`}
        >
          Custom{isCustom ? `: ${value}` : ""}
        </button>
      </div>
      {customOpen && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={10000}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = parseInt(customInput, 10);
                if (n > 0) onChange(n);
              }
            }}
            placeholder="e.g. 250"
            className="w-20 h-7 px-2 rounded-md border border-border bg-background text-xs"
          />
          <button
            type="button"
            onClick={() => {
              const n = parseInt(customInput, 10);
              if (n > 0) onChange(n);
            }}
            className="px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
      {totalLabel && <span className="text-muted-foreground ml-1">{totalLabel}</span>}
    </div>
  );
}

export default AdminPageSizePicker;
