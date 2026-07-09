import { ImageIcon } from "lucide-react";

/**
 * ImageHint - Inline helper that tells admins the recommended dimensions,
 * aspect ratio and max file size for an image upload field.
 *
 * Centralised so we only update sizes in one place (see IMAGE_PRESETS below).
 */
export const IMAGE_PRESETS = {
  collegeMain: { size: "800 × 600 px", ratio: "4:3", note: "Card hero & detail page" },
  courseMain: { size: "800 × 600 px", ratio: "4:3", note: "Card hero & detail page" },
  examMain: { size: "800 × 600 px", ratio: "4:3", note: "Card hero & detail page" },
  logo: { size: "256 × 256 px", ratio: "1:1 (square)", note: "Transparent PNG preferred" },
  heroBanner: { size: "1920 × 640 px", ratio: "3:1", note: "Homepage hero carousel" },
  carousel: { size: "1600 × 900 px", ratio: "16:9", note: "Detail page gallery" },
  gallery: { size: "1600 × 900 px", ratio: "16:9", note: "Detail page gallery" },
  bannerAd: { size: "1200 × 400 px", ratio: "3:1", note: "Wide ad placement" },
  leaderboardAd: { size: "1200 × 200 px", ratio: "6:1", note: "Above-fold leaderboard" },
  squareAd: { size: "600 × 600 px", ratio: "1:1", note: "Sidebar / inline square" },
  verticalAd: { size: "400 × 800 px", ratio: "1:2", note: "Sidebar vertical" },
  article: { size: "1200 × 630 px", ratio: "1.91:1", note: "Open Graph optimised" },
  partnerLogo: { size: "200 × 80 px", ratio: "2.5:1", note: "Transparent background" },
  place: { size: "600 × 400 px", ratio: "3:2", note: "City / location tile" },
  avatar: { size: "400 × 400 px", ratio: "1:1", note: "User avatar" },
} as const;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;

interface ImageHintProps {
  preset: ImagePresetKey;
  /** Max file size hint, defaults to 500 KB */
  maxSize?: string;
}

export function ImageHint({ preset, maxSize = "500 KB" }: ImageHintProps) {
  const p = IMAGE_PRESETS[preset];
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground leading-tight">
      <ImageIcon className="w-3 h-3 flex-shrink-0" />
      <span>
        Recommended: <span className="font-semibold text-foreground">{p.size}</span> · {p.ratio} · {p.note} · max {maxSize}
      </span>
    </p>
  );
}
