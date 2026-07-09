import { IndianRupee, Briefcase, Trophy, Award, Calendar, Shield } from "lucide-react";

/** Strip HTML tags + decode common entities so chip values never leak raw markup. */
function plain(v: any): string {
  if (v == null) return "";
  return String(v)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function scholarshipLabel(c: any): string | null {
  const v = c?.scholarship_available;
  if (v === "available") return "Available";
  if (v === "not_available") return "Not Available";
  // Fallback: infer from scholarship_details content
  const details = plain(c?.scholarship_details);
  if (details && details.length > 4) return "Available";
  return null;
}

/**
 * Anchored quick-facts strip - Shiksha-style trust signal directly under hero.
 * Chips: Fees · Avg Package · Ranking · Scholarship · Estd. · NAAC.
 * Renders only chips that have real data so it never looks padded.
 */
export function CollegeQuickFacts({ college }: { college: any }) {
  const scholarship = scholarshipLabel(college);
  const items = [
    college.fees && { icon: IndianRupee, label: "Total Fees", value: plain(college.fees) },
    college.placement && { icon: Briefcase, label: "Avg. Package", value: plain(college.placement) },
    college.ranking && { icon: Trophy, label: "Ranking", value: plain(college.ranking) },
    scholarship && { icon: Award, label: "Scholarship", value: scholarship },
    college.established && { icon: Calendar, label: "Established", value: String(college.established) },
    college.naac_grade && { icon: Shield, label: "NAAC", value: plain(college.naac_grade) },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#e85d3a] flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
            <p className="text-xs md:text-sm font-bold text-slate-900 truncate" title={value}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
