import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { GraduationCap, Calendar, Download, Globe, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { DekhoLogoInline } from "@/components/DekhoLogoInline";

function formatPrice(price: number) {
  if (price >= 100000) return `₹${(price / 100000).toFixed(price % 100000 === 0 ? 0 : 1)}L`;
  if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
  return `₹${price}`;
}

interface ProgramCategory {
  id: string;
  slug: string;
  name: string;
  icon_emoji: string;
  icon_url: string;
}

const PER_ROW = 5; // requested layout
const MAX_ROWS_ON_HOME = 3; // 1 -> 2 -> 3 -> redirect to /premium-programs

export function TrendingPrograms() {
  const [showLead, setShowLead] = useState(false);
  const [visibleRows, setVisibleRows] = useState(1);
  const [activeCat, setActiveCat] = useState<string>("all");

  const { data: programs, isLoading } = useQuery({
    queryKey: ["promoted-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoted_programs")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery({
    queryKey: ["program-categories"],
    queryFn: async (): Promise<ProgramCategory[]> => {
      const { data, error } = await (supabase as any)
        .from("program_categories")
        .select("id,slug,name,icon_emoji,icon_url")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as ProgramCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Show ALL active categories (don't hide chips when no programs match - admin can publish later)
  const visibleCategories = categories || [];

  const filteredPrograms = useMemo(() => {
    if (!programs) return [] as any[];
    if (activeCat === "all") return programs as any[];
    return (programs as any[]).filter((p) => p.category_slug === activeCat);
  }, [programs, activeCat]);

  const visibleCount = visibleRows * PER_ROW;
  const shownPrograms = filteredPrograms.slice(0, visibleCount);
  const hasMore = filteredPrograms.length > visibleCount;
  const reachedMaxOnHome = visibleRows >= MAX_ROWS_ON_HOME;

  if (!isLoading && (!programs || programs.length === 0)) return null;

  return (
    <>
      <section className="py-6 md:py-8" aria-labelledby="trending-programs-heading">
        <div className="text-center mb-5 md:mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide mb-2">
            <GraduationCap className="w-3.5 h-3.5" /> Premium Programs
          </div>
          <h2 id="trending-programs-heading" className="text-2xl font-bold text-foreground md:text-4xl">
            Upgrade Yourself with <span className="text-primary">IIT / IIM / Dr. Tag</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl mx-auto">
            100% online programs from top-ranked institutes - learn from anywhere at your own pace with exclusive <span className="text-foreground font-semibold">DekhoCampus</span> pricing.
          </p>
        </div>


        {/* Category chips strip - horizontal snap carousel on mobile + desktop */}
        {visibleCategories.length > 0 && (
          <nav aria-label="Program categories" className="mb-6 -mx-4 md:mx-0">
            <div className="flex items-end gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-2 px-4 md:px-1 snap-x snap-mandatory">
              <CategoryChip
                label="All"
                emoji="✨"
                active={activeCat === "all"}
                onClick={() => { setActiveCat("all"); setVisibleRows(1); }}
              />
              {visibleCategories.map((c) => (
                <CategoryChip
                  key={c.id}
                  label={c.name}
                  emoji={c.icon_emoji}
                  iconUrl={c.icon_url}
                  active={activeCat === c.slug}
                  onClick={() => { setActiveCat(c.slug); setVisibleRows(1); }}
                />
              ))}
            </div>
          </nav>
        )}

        {/* Cards - horizontal snap carousel on mobile, grid on desktop */}
        <div className="sm:hidden -mx-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 pb-2">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={`tp-sk-m-${i}`} className="shrink-0 w-[78%] snap-start bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-36 w-full bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-9 w-full bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
            {!isLoading && shownPrograms.length === 0 && (
              <div className="w-full text-center py-10 text-sm text-muted-foreground">
                No programs in this category yet. <button className="text-primary underline" onClick={() => setActiveCat("all")}>Show all</button>
              </div>
            )}
            {!isLoading && shownPrograms.map((prog: any) => (
              <div key={`m-${prog.id}`} className="shrink-0 w-[78%] snap-start">
                <ProgramCard prog={prog} onLead={() => setShowLead(true)} />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={`tp-sk-${i}`} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="h-36 w-full bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
          {!isLoading && shownPrograms.length === 0 && (
            <div className="col-span-full text-center py-10 text-sm text-muted-foreground">
              No programs in this category yet. <button className="text-primary underline" onClick={() => setActiveCat("all")}>Show all</button>
            </div>
          )}
          {!isLoading && shownPrograms.map((prog: any) => (
            <ProgramCard key={prog.id} prog={prog} onLead={() => setShowLead(true)} />
          ))}
        </div>

        {/* CTA below grid - hidden on mobile (carousel handles browsing) */}
        {!isLoading && filteredPrograms.length > 0 && (
          <div className="hidden sm:flex flex-wrap justify-center gap-2 mt-6">
            {hasMore && !reachedMaxOnHome && (
              <Button variant="outline" onClick={() => setVisibleRows((r) => r + 1)} className="rounded-xl">
                Show more
              </Button>
            )}
            {(reachedMaxOnHome || !hasMore) && filteredPrograms.length > PER_ROW && (
              <Button asChild className="rounded-xl gradient-accent text-white border-0 gap-2">
                <Link to={`/premium-programs${activeCat !== "all" ? `?cat=${activeCat}` : ""}`}>
                  View all {filteredPrograms.length}+ programs <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            )}
            {visibleRows > 1 && (
              <Button variant="ghost" onClick={() => setVisibleRows(1)} className="rounded-xl">Show less</Button>
            )}
          </div>
        )}
        {/* Mobile: simple "View all" link */}
        {!isLoading && filteredPrograms.length > 0 && (
          <div className="sm:hidden flex justify-center mt-4">
            <Button asChild variant="outline" className="rounded-xl gap-2">
              <Link to={`/premium-programs${activeCat !== "all" ? `?cat=${activeCat}` : ""}`}>
                View all {filteredPrograms.length}+ programs <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
      </section>

      <LeadGateDialog
        open={showLead}
        onOpenChange={setShowLead}
        title="🎓 Get Program Details & Free Counseling"
        subtitle="Fill the form to download syllabus & get free counselling!"
        source="trending_program_click"
      />
    </>
  );
}

export function ProgramCard({ prog, onLead }: { prog: any; onLead: () => void }) {
  const discountedPrice = prog.original_price * (1 - prog.discount_percent / 100);
  const months = parseInt(String(prog.duration).match(/\d+/)?.[0] || "12") || 12;
  const emi = prog.emi_starts_at && prog.emi_starts_at > 0 ? prog.emi_starts_at : Math.max(1, Math.round(discountedPrice / months));
  const href = prog.slug ? `/premium-programs/${prog.slug}` : null;
  return (
    <article className="group bg-card rounded-2xl border border-border overflow-hidden flex flex-col hover:shadow-xl hover:border-primary/40 transition-all">
      <div className="relative h-36 w-full bg-gradient-to-br from-primary/15 to-accent/15 overflow-hidden">
        {href ? (
          <Link to={href} aria-label={prog.title} className="absolute inset-0 z-10" />
        ) : (
          <button type="button" aria-label={prog.title} onClick={onLead} className="absolute inset-0 z-10" />
        )}
        {prog.image_url ? (
          <img src={prog.image_url} alt={prog.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/40">
            <GraduationCap className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-extrabold tracking-wide uppercase shadow-sm">
            {prog.tag || "IIT"}
          </span>
        </div>
        <div className="absolute top-2 right-2 z-20 pointer-events-none">
          <Badge variant={prog.badge_variant as any} className="text-[10px] font-bold px-2">{prog.badge}</Badge>
        </div>
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5 z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur text-foreground text-[10px] font-bold border border-border">
            <Globe className="w-3 h-3" /> {prog.country || "India"}
          </span>
          {prog.delivery_mode && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur ${
              prog.delivery_mode === "Online" ? "bg-emerald-500/90 text-white" :
              prog.delivery_mode === "Hybrid" ? "bg-amber-500/90 text-white" :
              "bg-blue-500/90 text-white"
            }`}>{prog.delivery_mode}</span>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[11px] text-muted-foreground font-semibold mb-0.5 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3" />{prog.college_name}
        </p>
        <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-2 min-h-[2.5rem]">
          {href ? <Link to={href} className="hover:text-primary transition">{prog.title}</Link> : prog.title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" />{prog.program_type}</span>
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{prog.duration}</span>
        </div>
        <div className="mb-3 pt-2 border-t border-dashed border-border">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-extrabold text-foreground">{formatPrice(discountedPrice)}</span>
            <span className="text-xs line-through text-muted-foreground">{formatPrice(prog.original_price)}</span>
            <Badge variant="outline" className="text-[10px] border-success/30 text-success font-bold ml-auto">{prog.discount_percent}% OFF</Badge>
          </div>
          <p className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            only on <span className="text-primary font-bold">DekhoCampus</span>
          </p>
          <p className="text-[11px] text-primary font-semibold mt-1">EMI starts at {formatPrice(emi)}/mo</p>
        </div>
        <div className="flex gap-2 mt-auto">
          {href ? (
            <Button asChild variant="outline" className="flex-1 rounded-xl h-9 text-xs">
              <Link to={href}>View Program</Link>
            </Button>
          ) : (
            <Button variant="outline" className="flex-1 rounded-xl h-9 text-xs" onClick={onLead}>View Program</Button>
          )}
          <Button className="rounded-xl h-9 text-xs gradient-accent text-white border-0 btn-accent-glow px-3" onClick={onLead}>
            <Download className="w-3.5 h-3.5 mr-1" /> Syllabus
          </Button>
        </div>
      </div>
    </article>
  );
}

function CategoryChip({
  label,
  emoji,
  iconUrl,
  active,
  onClick,
}: {
  label: string;
  emoji?: string;
  iconUrl?: string;
  active: boolean;
  onClick: () => void;
}) {
  // When an icon image is supplied it already contains the label baked in,
  // so we render it bigger and skip the duplicate text below.
  if (iconUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={`group snap-start shrink-0 inline-flex flex-col items-center gap-1.5 rounded-2xl px-2 py-1.5 transition-all ${
          active ? "ring-2 ring-blue-500 bg-blue-50" : "hover:-translate-y-0.5"
        }`}
      >
        <img
          src={iconUrl}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-9 w-9 md:h-10 md:w-10 object-contain"
        />
        <span className={`text-[10px] md:text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${active ? "text-primary" : "text-foreground"}`}>
          {label}
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group snap-start flex flex-col items-center gap-1.5 shrink-0 px-1 transition ${active ? "" : "opacity-90 hover:opacity-100"}`}
    >
      <span
        className={`inline-flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full text-xl md:text-2xl transition-all ${
          active
            ? "bg-blue-50 ring-2 ring-blue-500 scale-105"
            : "bg-card border border-border group-hover:border-blue-400 group-hover:-translate-y-0.5"
        }`}
      >
        <span aria-hidden>{emoji || "🎓"}</span>
      </span>
      <span className={`text-[10px] md:text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${active ? "text-primary" : "text-foreground"}`}>
        {label}
      </span>
    </button>
  );
}
