import { useEffect, useState } from "react";
import { Flame, Users, Clock, Gift, Shield, Sparkles } from "lucide-react";

/**
 * Psychology-driven urgency + scarcity hooks for lead forms.
 * Uses: scarcity (seats left), social proof (live counter), urgency (countdown),
 * reciprocity (free gift), authority (verified), loss-aversion (closing soon).
 *
 * Numbers are deterministic per-day so users see consistency within a session.
 */

// Deterministic pseudo-random based on date so it doesn't flicker on re-renders
function dailySeed() {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}
function seatsLeft() {
  const s = dailySeed();
  // 18 - 63 seats
  return 18 + (s % 46);
}
function liveCount() {
  const s = dailySeed();
  // 2,847 - 4,997
  return 2847 + (s % 2150);
}

function useCountdown(targetHours = 6) {
  const [end] = useState(() => {
    // Resets at start of next 6-hour window so it feels live
    const now = new Date();
    const next = new Date(now);
    const block = Math.ceil((now.getHours() + 1) / targetHours) * targetHours;
    next.setHours(block, 0, 0, 0);
    return next.getTime();
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, end - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

interface UrgencyHooksProps {
  variant?: "compact" | "full" | "banner";
  className?: string;
}

export function UrgencyHooks({ variant = "full", className = "" }: UrgencyHooksProps) {
  const seats = seatsLeft();
  const live = liveCount();
  const { label } = useCountdown(6);

  if (variant === "compact") {
    return (
      <div className={`flex items-center justify-between gap-2 rounded-lg bg-orange-50 border border-orange-200/70 px-2.5 py-1.5 text-[10.5px] font-semibold ${className}`}>
        <span className="flex items-center gap-1 text-orange-700">
          <Flame className="w-3 h-3" /> Only {seats} slots left today
        </span>
        <span className="flex items-center gap-1 text-orange-700 tabular-nums">
          <Clock className="w-3 h-3" /> {label}
        </span>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 px-3 py-2 text-[11px] md:text-xs font-semibold text-orange-800 ${className}`}>
        <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Only {seats} free counselling slots left today</span>
        <span className="flex items-center gap-1.5 tabular-nums"><Clock className="w-3.5 h-3.5" /> Closes in {label}</span>
        <span className="hidden sm:flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {live.toLocaleString("en-IN")} students helped this week</span>
      </div>
    );
  }

  // full
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Hook row 1: scarcity + countdown */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 px-2.5 py-1.5">
        <span className="flex items-center gap-1 text-[11px] font-bold text-orange-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
          </span>
          Only <span className="text-orange-900">{seats}</span> slots left today
        </span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-orange-700 tabular-nums">
          <Clock className="w-3 h-3" /> {label}
        </span>
      </div>

      {/* Hook row 2: free value (reciprocity) */}
      <div className="flex items-start gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/70 px-2.5 py-1.5">
        <Gift className="w-3.5 h-3.5 text-emerald-700 mt-0.5 flex-shrink-0" />
        <p className="text-[10.5px] leading-tight text-emerald-800">
          <span className="font-bold">FREE ₹999 counselling</span> + scholarship eligibility check + personalized college shortlist
        </p>
      </div>

      {/* Hook row 3: social proof + trust */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Users className="w-3 h-3 text-primary" /> <span className="font-bold text-foreground">{live.toLocaleString("en-IN")}</span> joined this week
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Shield className="w-3 h-3 text-emerald-600" /> 100% Verified
        </span>
      </div>
    </div>
  );
}

/**
 * Top-of-page urgency strip - sits above the navbar to grab attention immediately.
 * Dismissible per-session.
 */
export function HomeUrgencyStrip({ onClick }: { onClick?: () => void } = {}) {
  const seats = seatsLeft();
  const { label } = useCountdown(6);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("dc_urgency_dismissed") === "1";
  });
  if (dismissed) return null;

  return (
    <div className="relative z-40 w-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white">
      <button
        type="button"
        onClick={onClick}
        className="w-full container flex items-center justify-center gap-x-4 gap-y-1 py-1.5 text-[11px] md:text-xs font-semibold flex-wrap pr-8 hover:bg-white/5 transition-colors text-left cursor-pointer"
        aria-label="Open free counselling form"
      >
        <span className="flex items-center gap-1.5">
          FREE Counselling - Only <span className="font-extrabold">{seats}</span> slots left today
        </span>
        <span className="hidden md:flex items-center gap-1.5 tabular-nums">
          <Clock className="w-3.5 h-3.5" /> Closes in {label}
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
          sessionStorage.setItem("dc_urgency_dismissed", "1");
        }}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-lg leading-none px-1"
      >
        ×
      </button>
    </div>
  );
}
