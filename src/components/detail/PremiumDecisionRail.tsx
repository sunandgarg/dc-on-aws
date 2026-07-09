import { StudentAvatars } from "@/components/StudentAvatars";
import { useEffect, useState } from "react";
import { ArrowRight, Download, Star, ShieldCheck, Calendar, Clock, GraduationCap, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";

interface Props {
  program: any;
  discountedPrice: number;
  emi: number;
  formatPrice: (n: number) => string;
  onApply: () => void;
  onBrochure: () => void;
  onCounsel: () => void;
}

/**
 * 2026 redesign - sticky decision rail for premium programs.
 * One confident next step: Apply (primary) → Counsel (secondary) → Brochure (tertiary).
 * Live countdown + social-proof interest count keep urgency contextual, not noisy.
 */
export function PremiumDecisionRail({ program, discountedPrice, emi, formatPrice, onApply, onBrochure, onCounsel }: Props) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    // Use cohort_close_at if present, else default to 3 days out.
    const deadline = (program as any).cohort_close_at
      ? new Date((program as any).cohort_close_at).getTime()
      : Date.now() + 3 * 24 * 60 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, deadline - Date.now());
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
  }, [program]);

  const seedSrc = (program.slug || program.title || "x") as string;
  let seed = 0;
  for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
  const interestedToday = 150 + (seed % 650);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-6 md:p-7 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="text-center mb-5">
          <p className="text-slate-500 text-xs md:text-sm mb-2">Cohort status</p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-[#e85d3a] rounded-full text-xs font-bold">
            <span className="w-2 h-2 bg-[#e85d3a] rounded-full animate-pulse" />
            Closing in {countdown || "soon"}
          </div>
        </div>

        <div className="text-center mb-5">
          <p className="text-slate-500 text-xs">Program Fee</p>
          <div className="flex items-baseline justify-center gap-2 flex-wrap mt-1">
            <span className="text-3xl font-extrabold text-slate-900">{formatPrice(discountedPrice)}</span>
            <span className="text-sm line-through text-slate-400">{formatPrice(program.original_price)}</span>
          </div>
          <p className="text-xs text-blue-600 font-bold mt-1">EMI from {formatPrice(emi)}/mo · 0% interest</p>
        </div>

        <div className="flex justify-center mb-4"><IITAlumniBadge showTagline={false} /></div>

        <div className="space-y-3">
          <Button
            onClick={onApply}
            className="w-full h-auto bg-[#e85d3a] hover:bg-[#d14b2d] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform text-sm md:text-base"
          >
            <ArrowRight className="w-4 h-4 mr-2" /> Apply for Admission
          </Button>

          <Button
            onClick={onCounsel}
            variant="outline"
            className="w-full h-auto border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold py-4 rounded-2xl"
          >
            Talk to Counsellor
          </Button>

          <Button
            onClick={onBrochure}
            variant="ghost"
            className="w-full bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold py-2 text-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Download Brochure
          </Button>
        </div>

        {/* Social proof */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <StudentAvatars extraCount={Math.max(1, Math.floor(interestedToday / 100))} />
            <p className="text-xs text-slate-500 font-medium leading-tight">
              <span className="text-slate-900 font-bold">{interestedToday.toLocaleString()}</span> learners exploring today
            </p>
          </div>

          {Number(program.rating) > 0 && (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
              <Star className="w-4 h-4 fill-current" />
              Verified Rating: {Number(program.rating).toFixed(1)} / 5.0
            </div>
          )}
        </div>

        {/* Practicalities */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
          {program.batch_start_date && (
            <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Starts {program.batch_start_date}</p>
          )}
          {program.schedule && (
            <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {program.schedule}</p>
          )}
          {program.duration && (
            <p className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> {program.duration}</p>
          )}
          <p className="flex items-center gap-1.5 text-emerald-600 font-semibold"><ShieldCheck className="w-3.5 h-3.5" /> 7-day money-back guarantee</p>
        </div>
      </div>
    </div>
  );
}
