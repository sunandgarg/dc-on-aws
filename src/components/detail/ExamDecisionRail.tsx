import { StudentAvatars } from "@/components/StudentAvatars";
import { useEffect, useState } from "react";
import { ArrowRight, Download, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics";

interface Props {
  exam: any;
  onDownloadSample?: () => void;
}

/**
 * 2026 redesign - sticky decision rail for an exam.
 * Primary (Apply) → Secondary (Mentor) → Tertiary (Sample Paper).
 */
export function ExamDecisionRail({ exam, onDownloadSample }: Props) {
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const raw = exam.application_end_date || exam.exam_date_iso || null;
    const parsed = raw ? new Date(raw).getTime() : NaN;
    const deadline = Number.isFinite(parsed) && parsed > Date.now() ? parsed : Date.now() + 21 * 24 * 60 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, deadline - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      if (d > 0) setCountdown(`${d}d ${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`);
      else setCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [exam]);

  const seedSrc = (exam.slug || exam.name || "x") as string;
  let seed = 0;
  for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
  const aspirants = 500 + (seed % 1500);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-6 md:p-7 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="text-center mb-6">
          <p className="text-slate-500 text-xs md:text-sm mb-2">Application window</p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-[#e85d3a] rounded-full text-xs font-bold">
            <span className="w-2 h-2 bg-[#e85d3a] rounded-full animate-pulse" />
            Closing in {countdown || "soon"}
          </div>
        </div>

        <div className="flex justify-center mb-4"><IITAlumniBadge showTagline={false} /></div>

        <div className="space-y-3">
          {exam.registration_url && exam.registration_url !== "#" ? (
            <a href={exam.registration_url} target="_blank" rel="noopener noreferrer" className="block" onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Apply Now", exam_slug: exam.slug, entity_name: exam.name }); } catch {} }}>
              <Button className="w-full h-auto bg-[#e85d3a] hover:bg-[#d14b2d] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform text-sm md:text-base">
                <ExternalLink className="w-4 h-4 mr-2" /> Apply Now
              </Button>
            </a>
          ) : (
            <Button
              onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Apply Now", exam_slug: exam.slug, entity_name: exam.name }); } catch {}; setOpen(true); }}
              className="w-full h-auto bg-[#e85d3a] hover:bg-[#d14b2d] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform text-sm md:text-base"
            >
              <ArrowRight className="w-4 h-4 mr-2" /> Apply Now
            </Button>
          )}

          <Button
            onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Talk to Mentor", exam_slug: exam.slug, entity_name: exam.name }); } catch {}; setOpen(true); }}
            variant="outline"
            className="w-full h-auto border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-bold py-4 rounded-2xl"
          >
            Talk to Mentor
          </Button>

          <Button
            onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Download Sample Paper", exam_slug: exam.slug, entity_name: exam.name }); } catch {}; (onDownloadSample ?? (() => setOpen(true)))(); }}
            variant="ghost"
            className="w-full bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold py-2 text-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Download Sample Paper
          </Button>
        </div>

        <div className="mt-7 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <StudentAvatars extraCount={Math.floor(aspirants / 100)} />
            <p className="text-xs text-slate-500 font-medium leading-tight">
              <span className="text-slate-900 font-bold">{aspirants.toLocaleString()}</span> aspirants prepping today
            </p>
          </div>

          {exam.applicants && (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
              <Star className="w-4 h-4 fill-current" />
              {exam.applicants} apply every year
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Get free prep guidance for {exam.name}</DialogTitle>
          </DialogHeader>
          <div className="p-5 pt-3">
            <LeadCaptureForm
              variant="inline"
              title=""
              subtitle="Our mentor will call you back shortly"
              source={`exam_rail_${exam.slug}`}
              interestedExamSlug={exam.slug}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
