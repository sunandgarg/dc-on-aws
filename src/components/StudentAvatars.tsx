import girlAvatar from "@/assets/student-girl.png";
import boyAvatar from "@/assets/student-boy.png";

interface Props {
  extraCount?: number;
  size?: "sm" | "md";
}

/**
 * Stacked student avatars (1 girl + 1 boy + count chip) used in social proof rails
 * across College / Course / Exam / Premium detail pages.
 */
export function StudentAvatars({ extraCount = 0, size = "md" }: Props) {
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  return (
    <div className="flex -space-x-2">
      <img
        src={girlAvatar}
        alt="Student"
        loading="lazy"
        className={`${dim} rounded-full border-2 border-white object-cover`}
      />
      <img
        src={boyAvatar}
        alt="Student"
        loading="lazy"
        className={`${dim} rounded-full border-2 border-white object-cover`}
      />
      {extraCount > 0 && (
        <div
          className={`${dim} rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold`}
        >
          +{extraCount}k
        </div>
      )}
    </div>
  );
}
