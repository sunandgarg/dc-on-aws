import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ProfessionalAvatar } from "@/components/ProfessionalAvatar";

interface Props {
  /** courseSlug used to fetch explicit career_course_links */
  courseSlug?: string;
  /** Free-text careers from courses.careers as fallback */
  careers: string[];
  courseName: string;
}

interface CareerCard {
  slug: string;
  name: string;
  domain?: string;
  icon_emoji?: string;
  image?: string;
}

const ICONS = ["💼", "🚀", "🎯", "💡", "🏆", "⚡", "🌟", "🔥", "📊", "🧠"];
const GRADIENTS = [
  "from-primary/20 to-accent/20",
  "from-accent/20 to-golden/20",
  "from-golden/20 to-primary/20",
  "from-success/20 to-primary/20",
  "from-primary/20 to-success/20",
];

/** Animated character avatar - small bouncing professional figure. */
function CareerCharacter({ index }: { index: number }) {
  const dress = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--golden))"][index % 4];
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full" style={{ animation: `fade-in 0.5s ease-out` }}>
      <g style={{ transformOrigin: "30px 50px", animation: "scale-in 0.4s ease-out" }}>
        <ellipse cx="30" cy="55" rx="14" ry="2" fill="rgba(0,0,0,0.1)" />
        <path d="M14 50 C 18 35, 42 35, 46 50 Z" fill={dress} />
        <rect x="26" y="30" width="8" height="8" rx="2" fill="#f3c8a4" />
        <circle cx="30" cy="22" r="11" fill="#f3c8a4" />
        <path d="M19 22 C 19 10, 41 10, 41 22 L 38 16 C 32 13, 28 13, 22 16 Z" fill="#1f1a14" />
        <circle cx="26" cy="23" r="1.2" fill="#1a1a1a">
          <animate attributeName="r" values="1.2;0.3;1.2" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="34" cy="23" r="1.2" fill="#1a1a1a">
          <animate attributeName="r" values="1.2;0.3;1.2" dur="3s" repeatCount="indefinite" />
        </circle>
        <path d="M27 28 Q 30 31 33 28" stroke="#3b1f1f" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function CareerScopeCarousel({ courseSlug, careers, courseName }: Props) {
  const [linked, setLinked] = useState<CareerCard[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!courseSlug) { setLinked([]); return; }
      const { data: links } = await (supabase as any).from("career_course_links").select("career_slug").eq("course_slug", courseSlug);
      const slugs = (links || []).map((l: any) => l.career_slug);
      if (slugs.length === 0) { if (!cancel) setLinked([]); return; }
      const { data: profiles } = await (supabase as any).from("career_profiles").select("slug,name,domain,icon_emoji,image").in("slug", slugs);
      if (!cancel) setLinked(profiles || []);
    })();
    return () => { cancel = true; };
  }, [courseSlug]);

  // Merge linked profiles + free-text careers (linked take priority)
  const cards: CareerCard[] = [
    ...linked,
    ...careers
      .filter(c => !linked.some(l => l.name.toLowerCase() === c.toLowerCase()))
      .map(c => ({ slug: c.toLowerCase().replace(/\s+/g, "-"), name: c })),
  ];

  if (!cards.length) return null;

  const scrollBy = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  return (
    <section id="career-paths" className="bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl border border-primary/20 p-5 scroll-mt-32">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Career Paths after {courseName}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Meet the {cards.length} roles this course can lead to</p>
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

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 px-1">
        {cards.map((c, i) => {
          const grad = GRADIENTS[i % GRADIENTS.length];
          return (
            <Link
              key={c.slug + i}
              to={`/careers/${c.slug}`}
              className={`snap-start min-w-[180px] max-w-[180px] bg-gradient-to-br ${grad} rounded-3xl p-4 flex-shrink-0 border border-border/40 hover:border-primary/60 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden`}
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/20 blur-xl pointer-events-none group-hover:bg-primary/20 transition" />
              <div className="relative w-24 h-24 mx-auto mb-3 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white group-hover:scale-105 group-hover:rotate-1 transition-transform">
                {(c as any).image ? (<img src={(c as any).image} alt="" loading="lazy" width={96} height={96} className="w-full h-full object-cover" />) : (<ProfessionalAvatar variant="career" seed={c.slug || c.name} className="w-full h-full" />)}
              </div>
              <div title={c.name} className="font-serif font-semibold text-[15px] text-foreground text-center mb-0.5 line-clamp-2 leading-snug tracking-tight min-h-[2.6em]">{c.name}</div>
              {c.domain && <div title={c.domain} className="text-[10.5px] text-muted-foreground text-center line-clamp-1 mb-1">{c.domain}</div>}
              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-primary mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> Explore →
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
