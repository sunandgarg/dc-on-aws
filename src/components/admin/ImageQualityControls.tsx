import { useState } from "react";
import { Sparkles } from "lucide-react";

export type ImageQuality = {
  /** When true, keep original file as-is (no WebP conversion, no resize). */
  hd: boolean;
  /** Longest-edge cap in px when hd is false. */
  maxDim: number;
};

const SIZES = [
  { v: 1280, label: "1280" },
  { v: 1600, label: "1600" },
  { v: 1920, label: "1920" },
  { v: 2560, label: "2560" },
];

/**
 * Tiny shared control strip used by every image-upload field.
 * - "HD" toggle = keep original (no WebP, no downscale)
 * - Size select = max longest-edge in px (ignored when HD is on)
 */
export function useImageQuality(initial?: Partial<ImageQuality>) {
  const [quality, setQuality] = useState<ImageQuality>({
    hd: initial?.hd ?? false,
    maxDim: initial?.maxDim ?? 1920,
  });
  return { quality, setQuality };
}

export function ImageQualityControls({
  value,
  onChange,
  className = "",
}: {
  value: ImageQuality;
  onChange: (v: ImageQuality) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground ${className}`}>
      <label
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border cursor-pointer transition ${
          value.hd
            ? "bg-primary/10 border-primary/40 text-primary"
            : "border-border hover:border-primary/40"
        }`}
        title="Keep original file - no WebP conversion or resizing"
      >
        <input
          type="checkbox"
          checked={value.hd}
          onChange={(e) => onChange({ ...value, hd: e.target.checked })}
          className="w-3 h-3 accent-primary"
        />
        <Sparkles className="w-3 h-3" /> HD (keep original)
      </label>
      <span className="text-muted-foreground/70">Max size:</span>
      <select
        value={value.maxDim}
        onChange={(e) => onChange({ ...value, maxDim: parseInt(e.target.value) || 1920 })}
        disabled={value.hd}
        className="bg-background border border-border rounded-md px-1.5 py-0.5 text-[11px] disabled:opacity-50"
      >
        {SIZES.map((s) => (
          <option key={s.v} value={s.v}>
            {s.label}px
          </option>
        ))}
      </select>
      {!value.hd && <span className="text-muted-foreground/70">· auto-WebP</span>}
    </div>
  );
}
