import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, TrendingUp, IndianRupee, ChevronDown } from "lucide-react";
import { ProfessionalAvatar } from "@/components/ProfessionalAvatar";

export function CareerScopeSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-careers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("career_profiles")
        .select("slug,name,domain,short_description,avg_salary,growth,icon_emoji,image,is_featured,display_order")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("display_order")
        .limit(40);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const [visibleRows, setVisibleRows] = useState(1);

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Career Scope & Job Profiles</h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Explore high-growth career paths - salary, skills, top companies & related courses
          </p>
        </div>
        <Link to="/careers" className="text-sm font-medium text-primary hover:underline flex items-center gap-1 shrink-0">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mobile: single-row horizontal scroller. touch-action pan-x lets vertical
          swipes always scroll the page (never trapped by the carousel). */}
      <div
        className="md:hidden flex gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain snap-x snap-proximity pb-3 -mx-3 px-3 scrollbar-hide"
        style={{ touchAction: "pan-x" }}
      >
        {(isLoading ? Array.from({ length: 9 }) : data!).map((c: any, i: number) => {
          const grads = [
            "from-orange-100 via-rose-50 to-amber-50",
            "from-sky-100 via-indigo-50 to-violet-50",
            "from-emerald-100 via-teal-50 to-lime-50",
            "from-amber-100 via-yellow-50 to-orange-50",
            "from-pink-100 via-rose-50 to-fuchsia-50",
          ];
          const grad = grads[i % grads.length];
          return (
            <Link
              key={`m-${c?.slug ?? i}`}
              to={c ? `/careers/${c.slug}` : "#"}
              className="group snap-start shrink-0 w-[46%]"
            >
              {isLoading ? (
                <Card className="p-3 h-full">
                  <div className="animate-pulse space-y-2">
                    <div className="h-20 bg-muted rounded-2xl" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </Card>
              ) : (
                <div className={`relative overflow-hidden rounded-3xl p-3 pt-4 bg-gradient-to-br ${grad} border border-white/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all`}>
                  <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full bg-white/40 blur-xl pointer-events-none" />
                  <div className="relative w-20 h-20 mx-auto mb-2 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white">
                    {c.image ? (<img src={c.image} alt="" loading="lazy" width={80} height={80} className="w-full h-full object-cover" />) : (<ProfessionalAvatar variant="career" seed={c.slug || c.name} className="w-full h-full" />)}
                  </div>
                  <h3 title={c.name} className="font-serif font-semibold text-[13.5px] text-foreground text-center line-clamp-2 leading-snug tracking-tight min-h-[2.4em]">{c.name}</h3>
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-primary mt-1">
                    <TrendingUp className="w-3 h-3" /> Explore →
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
          {(isLoading ? Array.from({ length: 8 }) : (data as any[]).slice(0, visibleRows * 4)).map((c: any, i: number) => {
            const grads = [
              "from-orange-100 via-rose-50 to-amber-50",
              "from-sky-100 via-indigo-50 to-violet-50",
              "from-emerald-100 via-teal-50 to-lime-50",
              "from-amber-100 via-yellow-50 to-orange-50",
              "from-pink-100 via-rose-50 to-fuchsia-50",
              "from-purple-100 via-fuchsia-50 to-pink-50",
            ];
            const grad = grads[i % grads.length];
            return (
              <Link key={c?.slug ?? i} to={c ? `/careers/${c.slug}` : "#"} className="group">
                {isLoading ? (
                  <Card className="p-4 h-full">
                    <div className="animate-pulse space-y-2">
                      <div className="h-24 bg-muted rounded-2xl" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </Card>
                ) : (
                  <div className={`relative overflow-hidden rounded-3xl p-4 pt-5 bg-gradient-to-br ${grad} border border-white/60 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300`}>
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/40 blur-2xl pointer-events-none group-hover:bg-primary/20 transition" />
                    {c.is_featured && (
                      <Badge variant="secondary" className="absolute top-3 left-3 text-[9px] h-5 bg-white/80 backdrop-blur">Hot</Badge>
                    )}
                    <div className="relative w-28 h-28 mx-auto mb-3 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white group-hover:scale-105 group-hover:rotate-1 transition-transform">
                      {c.image ? (<img src={c.image} alt="" loading="lazy" width={112} height={112} className="w-full h-full object-cover" />) : (<ProfessionalAvatar variant="career" seed={c.slug || c.name} className="w-full h-full" />)}
                    </div>
                    <h3 title={c.name} className="font-serif font-semibold text-[15px] text-foreground text-center line-clamp-2 leading-snug tracking-tight min-h-[2.6em]">{c.name}</h3>
                    {c.domain && <p title={c.domain} className="text-[11px] text-muted-foreground text-center line-clamp-1 mt-0.5">{c.domain}</p>}
                    <div className="flex items-center justify-center gap-1 text-xs font-semibold text-primary mt-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Explore →
                    </div>
                    {(c.avg_salary || c.growth) && (
                      <div className="mt-3 pt-3 border-t border-white/60 space-y-1">
                        {c.avg_salary && (
                          <div className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                            <IndianRupee className="w-3 h-3 text-emerald-600" />
                            <span className="truncate">{c.avg_salary}</span>
                          </div>
                        )}
                        {c.growth && (
                          <div className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                            <TrendingUp className="w-3 h-3 text-blue-600" />
                            <span className="truncate">{c.growth}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
        {!isLoading && data && data.length > visibleRows * 4 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setVisibleRows((r) => r + 2)} className="gap-1.5">
              Show more <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
