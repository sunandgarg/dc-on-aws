import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";

interface Rec { id: string; company_name: string; package_lpa: number; year: string; role: string; hires_count: number; }

export function PlacementCompaniesSection({ collegeSlug, courseSlug }: { collegeSlug?: string; courseSlug?: string }) {
  const [items, setItems] = useState<Rec[]>([]);
  useEffect(() => {
    let q = (supabase as any).from("placement_records").select("*");
    if (collegeSlug) q = q.eq("college_slug", collegeSlug);
    if (courseSlug) q = q.eq("course_slug", courseSlug);
    q.order("package_lpa", { ascending: false }).then(({ data }: any) => setItems(data || []));
  }, [collegeSlug, courseSlug]);
  if (!items.length) return null;
  return (
    <section id="recruiters" className="bg-card rounded-2xl border border-border p-5 scroll-mt-32">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Top Recruiters</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map(r => (
          <div key={r.id} className="bg-muted/30 rounded-xl p-3 text-center">
            <div className="font-semibold text-sm text-foreground">{r.company_name}</div>
            {r.package_lpa > 0 && <div className="text-xs text-success font-medium mt-1">₹{r.package_lpa} LPA</div>}
            {r.role && <div className="text-[10px] text-muted-foreground">{r.role}</div>}
            {r.year && <div className="text-[10px] text-muted-foreground">{r.year}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
