import { StudentAvatars } from "@/components/StudentAvatars";
import { ArrowRight, Download, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics";

interface Props {
  course: any;
}

/**
 * 2026 redesign - sticky decision rail for a course.
 * Primary (Find Colleges) → Secondary (Talk to Counselor) → Tertiary (Syllabus PDF).
 */
export function CourseDecisionRail({ course }: Props) {
  const [open, setOpen] = useState(false);

  const seedSrc = (course.slug || course.name || "x") as string;
  let seed = 0;
  for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
  const interested = 150 + (seed % 650);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-6 md:p-7 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="text-center mb-6">
          <p className="text-slate-500 text-xs md:text-sm mb-2">Course status</p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-[#e85d3a] rounded-full text-xs font-bold">
            <span className="w-2 h-2 bg-[#e85d3a] rounded-full animate-pulse" />
            Admissions open · {new Date().getFullYear()} intake
          </div>
        </div>

        <div className="flex justify-center mb-4"><IITAlumniBadge showTagline={false} /></div>

        <div className="space-y-3">
          <Button
            onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Find Best Colleges", course_slug: course.slug, entity_name: course.name }); } catch {}; setOpen(true); }}
            className="w-full h-auto bg-[#e85d3a] hover:bg-[#d14b2d] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform text-sm md:text-base"
          >
            <ArrowRight className="w-4 h-4 mr-2" /> Find Best Colleges
          </Button>

          <Button
            onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Talk to Counselor", course_slug: course.slug, entity_name: course.name }); } catch {}; setOpen(true); }}
            variant="outline"
            className="w-full h-auto border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-bold py-4 rounded-2xl"
          >
            Talk to Counselor
          </Button>

          {course.syllabus_pdf_url && course.syllabus_pdf_url !== "#" ? (
            <a href={course.syllabus_pdf_url} target="_blank" rel="noopener noreferrer" className="block" onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Download Syllabus", course_slug: course.slug, entity_name: course.name }); } catch {} }}>
              <Button
                variant="ghost"
                className="w-full bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold py-2 text-sm"
              >
                <Download className="w-4 h-4 mr-2" /> Download Syllabus
              </Button>
            </a>
          ) : (
            <Button
              onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Download Syllabus", course_slug: course.slug, entity_name: course.name }); } catch {}; setOpen(true); }}
              variant="ghost"
              className="w-full bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold py-2 text-sm"
            >
              <Download className="w-4 h-4 mr-2" /> Download Syllabus
            </Button>
          )}
        </div>

        <div className="mt-7 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <StudentAvatars extraCount={Math.floor(interested / 100)} />
            <p className="text-xs text-slate-500 font-medium leading-tight">
              <span className="text-slate-900 font-bold">{interested.toLocaleString()}</span> students exploring this course
            </p>
          </div>

          {course.avg_salary && (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
              <Star className="w-4 h-4 fill-current" />
              Avg starting package: {course.avg_salary}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Get free guidance for {course.name}</DialogTitle>
          </DialogHeader>
          <div className="p-5 pt-3">
            <LeadCaptureForm
              variant="inline"
              title=""
              subtitle="Our counselor will call you back shortly"
              source={`course_rail_${course.slug}`}
              interestedCourseSlug={course.slug}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
