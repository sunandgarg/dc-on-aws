/**
 * Animated AI loader shown while DekhoCampus AI generates a verdict.
 * Rocket-launch theme, orange/rose gradient to match premium-course palette.
 */
export function DekhoCampusAILoader({ label = "DekhoCampus AI is analysing…" }: { label?: string }) {
  return (
    <div className="relative w-full rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-5 py-8 overflow-hidden">
      {/* Soft glow */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-orange-300/40 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* Rocket */}
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 flex items-center justify-center animate-[rocket_1.6s_ease-in-out_infinite]">
            <svg viewBox="0 0 64 64" className="w-16 h-16 drop-shadow-[0_8px_18px_rgba(244,114,32,0.45)]">
              <defs>
                <linearGradient id="rk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
              <path d="M32 4c8 6 12 14 12 24 0 6-2 11-5 15h-14c-3-4-5-9-5-15 0-10 4-18 12-24z" fill="url(#rk)" />
              <circle cx="32" cy="24" r="4" fill="#fff" />
              <path d="M20 36l-6 8 8-2zM44 36l6 8-8-2z" fill="#fb923c" />
            </svg>
          </div>
          {/* Flame */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-6 h-10 rounded-b-full bg-gradient-to-b from-amber-400 via-orange-500 to-rose-500 blur-[2px] animate-[flame_0.35s_ease-in-out_infinite_alternate]" />
        </div>

        <p className="mt-4 text-sm md:text-base font-bold text-foreground">{label}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">Crunching cut-offs, fees, placements & your match…</p>

        {/* Shimmer bar */}
        <div className="mt-4 w-48 h-1.5 rounded-full bg-orange-200/60 overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-orange-500 to-rose-500 animate-[shimmer_1.2s_linear_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes rocket { 0%,100% { transform: translateY(2px); } 50% { transform: translateY(-8px); } }
        @keyframes flame { from { transform: translateX(-50%) scaleY(0.85); opacity: 0.8; } to { transform: translateX(-50%) scaleY(1.15); opacity: 1; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      `}</style>
    </div>
  );
}

export default DekhoCampusAILoader;
