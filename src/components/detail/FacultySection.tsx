import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, ChevronLeft, ChevronRight, GraduationCap, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfessionalAvatar } from "@/components/ProfessionalAvatar";

interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  qualification: string;
  photo: string;
  bio: string;
  gender?: string;
  linkedin_url?: string;
}


export function FacultySection({ collegeSlug }: { collegeSlug: string }) {
  const [items, setItems] = useState<Faculty[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (supabase as any)
      .from("faculty")
      .select("*")
      .eq("college_slug", collegeSlug)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }: any) => setItems(data || []));
  }, [collegeSlug]);

  if (!items.length) return null;

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <section id="faculty" className="bg-card rounded-2xl border border-border p-5 scroll-mt-32">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" /> Meet Our Professors
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {items.length} faculty member{items.length > 1 ? "s" : ""} shaping young minds
          </p>
        </div>
        <div className="hidden sm:flex gap-1">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={() => scrollBy(-1)} aria-label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={() => scrollBy(1)} aria-label="Next">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin px-1">
        {items.map((f) => (
          <div
            key={f.id}
            className="snap-start min-w-[220px] max-w-[220px] bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-4 flex-shrink-0 border border-border hover:border-primary/40 hover:shadow-lg transition-all group"
          >
            <div className="relative w-24 h-24 mx-auto mb-3 rounded-full ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all overflow-hidden">
              {f.photo ? (
                <img src={f.photo} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <ProfessionalAvatar seed={f.id || f.name} gender={f.gender} className="w-full h-full" />
              )}
            </div>
            <div className="text-center">
              <div title={f.name} className="font-serif font-semibold text-[14.5px] text-foreground line-clamp-2 leading-snug tracking-tight min-h-[2.4em]">{f.name}</div>
              {f.designation && <div title={f.designation} className="text-xs text-primary font-medium mt-0.5 line-clamp-1">{f.designation}</div>}
              {f.department && <div title={f.department} className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{f.department}</div>}
              {f.qualification && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  <GraduationCap className="w-3 h-3" /> {f.qualification}
                </div>
              )}
              {f.linkedin_url && (
                <div className="mt-2">
                  <a
                    href={f.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${f.name} on LinkedIn`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded-full px-2 py-0.5 border border-[#0A66C2]/20 transition"
                  >
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
