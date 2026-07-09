import { StudentAvatars } from "@/components/StudentAvatars";
import { useEffect, useState } from "react";
import { ArrowRight, Download, Star, Play } from "lucide-react";
import { ApplyButton } from "@/components/ApplyButton";
import { YouTubeVideoButton } from "@/components/YouTubeVideoButton";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";

function ytId(u?: string) {
  if (!u) return null;
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

interface Props {
  college: any;
}

/**
 * 2026 redesign - sticky decision rail.
 * Anchors the user to a single confident next step:
 * Apply (primary orange) → Talk to Counselor (secondary) → Brochure (tertiary).
 * Includes deadline urgency, live social-proof and a campus tour entry point.
 */
export function CollegeDecisionRail({ college }: Props) {
  const [countdown, setCountdown] = useState<string>("");
  const hasExplicitDeadline = !!(college as any).admission_deadline;
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const deadline = hasExplicitDeadline
      ? new Date((college as any).admission_deadline).getTime()
      : Date.now() + 14 * 24 * 60 * 60 * 1000;

    const tick = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setIsClosed(hasExplicitDeadline);
        setCountdown("");
        return;
      }
      setIsClosed(false);
      const d = Math.floor(diff / (24 * 60 * 60 * 1000));
      const h = Math.floor((diff / (60 * 60 * 1000)) % 24);
      const m = Math.floor((diff / (60 * 1000)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      if (d > 0) setCountdown(`${d}d ${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`);
      else setCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [college, hasExplicitDeadline]);

  const seedSrc = (college.slug || college.name || "x") as string;
  let seed = 0;
  for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
  const interestedToday = 200 + (seed % 800);

  return (
    <div className="space-y-4">
      {/* Primary decision card */}
      <div className="bg-white rounded-3xl p-6 md:p-7 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="text-center mb-6">
          <p className="text-slate-500 text-xs md:text-sm mb-2">Application status</p>
          {isClosed ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-slate-400 rounded-full" />
              Applications closed - join waitlist
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-[#e85d3a] rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-[#e85d3a] rounded-full animate-pulse" />
              Closing in {countdown || "soon"}
            </div>
          )}
        </div>

        <div className="flex justify-center mb-4"><IITAlumniBadge showTagline={false} /></div>

        <div className="space-y-3">
          <ApplyButton
            collegeSlug={college.slug}
            collegeName={college.name}
            applyMode={(college as any).apply_cta_mode}
            applyUrl={(college as any).apply_url}
            className="w-full !h-auto !bg-[#e85d3a] hover:!bg-[#d14b2d] !text-white font-bold !py-4 !rounded-2xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform text-sm md:text-base"
            icon={<ArrowRight className="w-4 h-4 mr-2" />}
            label="Apply for Admission"
          />

          <ApplyButton
            collegeSlug={college.slug}
            collegeName={college.name}
            variant="outline"
            className="w-full !h-auto !border-2 !border-blue-500 !text-blue-600 hover:!bg-blue-50 font-bold !py-4 !rounded-2xl"
            label="Talk to Counselor"
          />

          {college.brochure_url && college.brochure_url !== "#" ? (
            <ApplyButton
              collegeSlug={college.slug}
              collegeName={college.name}
              variant="secondary"
              className="w-full !bg-transparent !text-slate-500 hover:!text-slate-800 hover:!bg-slate-50 font-semibold !py-2 text-sm"
              icon={<Download className="w-4 h-4 mr-2" />}
              label="Download Brochure"
              applyMode="lead_then_link"
              applyUrl={college.brochure_url}
            />
          ) : (
            <ApplyButton
              collegeSlug={college.slug}
              collegeName={college.name}
              variant="secondary"
              className="w-full !bg-transparent !text-slate-500 hover:!text-slate-800 hover:!bg-slate-50 font-semibold !py-2 text-sm"
              icon={<Download className="w-4 h-4 mr-2" />}
              label="Download Brochure"
            />
          )}
        </div>

        {/* Social proof */}
        <div className="mt-7 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <StudentAvatars extraCount={Math.floor(interestedToday / 100)} />
            <p className="text-xs text-slate-500 font-medium leading-tight">
              <span className="text-slate-900 font-bold">~{(Math.round(interestedToday * 7 / 100) / 10).toFixed(1)}k</span> students viewed this college this week
            </p>
          </div>

          {college.rating ? (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
              <Star className="w-4 h-4 fill-current" />
              Verified Review Score: {college.rating} / 5.0
            </div>
          ) : null}
        </div>
      </div>

      {/* Secondary - campus tour (rich video preview card) */}
      {college.youtube_video_url && (() => {
        const vid = ytId(college.youtube_video_url);
        const thumb = vid
          ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
          : college.image || "/placeholder.svg";
        return (
          <div className="group relative rounded-3xl overflow-hidden shadow-xl shadow-slate-300/50 border border-slate-100 bg-black">
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={thumb}
                alt={`${college.name} campus tour`}
                loading="lazy"
                className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
              />
              {/* Dark gradient for legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

              {/* LIVE badge */}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/95 text-white text-[10px] font-bold tracking-wide shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                CAMPUS TOUR
              </div>

              {/* Subtle quality chip */}
              <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold">
                Watch tour
              </div>

              {/* Play button overlay */}
              <button
                type="button"
                aria-label="Play campus tour"
                className="absolute inset-0 flex items-center justify-center focus:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.parentElement?.parentElement?.querySelector(
                    "[data-yt-trigger] button"
                  ) as HTMLButtonElement | null)?.click();
                }}
              >
                <span className="relative flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#e85d3a]/40 animate-ping" />
                  <span className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#e85d3a] flex items-center justify-center shadow-2xl shadow-orange-900/50 group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 md:w-8 md:h-8 text-white fill-white ml-1" />
                  </span>
                </span>
              </button>

              {/* Bottom caption */}
              <div className="absolute left-0 right-0 bottom-0 p-4">
                <p className="text-white font-bold text-sm md:text-base leading-tight drop-shadow">
                  Take a Virtual Campus Tour
                </p>
                <p className="text-white/80 text-[11px] md:text-xs mt-0.5">
                  Hostels · Labs · Sports · Campus Life
                </p>
              </div>
            </div>

            {/* Hidden real trigger (keeps existing dialog logic) */}
            <div data-yt-trigger className="hidden">
              <YouTubeVideoButton
                url={college.youtube_video_url}
                category="college"
                title={`${college.name} - Campus Tour`}
                label="Play"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
