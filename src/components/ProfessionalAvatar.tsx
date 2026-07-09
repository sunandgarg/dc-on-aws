/**
 * ProfessionalAvatar - default fallback portrait used when a real photo
 * is missing (career cards, faculty cards). Uses curated illustrated avatars:
 *  - male / female for faculty (driven by `gender`)
 *  - a dedicated career illustration when `variant="career"` is passed.
 *
 * `seed` is kept for API compatibility (used to deterministically pick
 * male/female when `gender` is not provided for faculty).
 */
import maleAvatar from "@/assets/avatar-male.png";
import femaleAvatar from "@/assets/avatar-female.png";
import careerAvatar from "@/assets/avatar-career.png";

interface Props {
  seed?: string;
  gender?: string;
  variant?: "faculty" | "career";
  className?: string;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ProfessionalAvatar({ seed = "", gender, variant = "faculty", className }: Props) {
  let src = careerAvatar;
  let alt = "Career illustration";
  if (variant === "faculty") {
    const g = (gender || "").toLowerCase();
    const isFemale = g.startsWith("f") || (!g && hash(seed) % 2 === 1);
    src = isFemale ? femaleAvatar : maleAvatar;
    alt = isFemale ? "Female professor avatar" : "Male professor avatar";
  }
  return (
    <div className={className}>
      <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover" />
    </div>
  );
}
