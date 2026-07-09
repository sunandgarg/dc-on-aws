import { useMemo, useState, useDeferredValue, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, MapPin, IndianRupee, Search, Clock } from "lucide-react";

// Only select columns needed for the list - smaller payload, faster TTFB.
const LIST_COLS = "id,slug,title,company,company_logo,location,category,job_type,salary,experience,is_featured,is_remote,short_description,skills,posted_at";

async function fetchVacancies() {
  const { data, error } = await supabase
    .from("jobs" as any)
    .select(LIST_COLS)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("posted_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as any[]) || [];
}

export default function AllJobs() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["vacancies", "list"],
    queryFn: fetchVacancies,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const deferredQ = useDeferredValue(q);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))),
    [items]
  );

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return items.filter((i: any) => {
      if (cat && i.category !== cat) return false;
      if (!needle) return true;
      const hay = `${i.title} ${i.company} ${i.location} ${i.category} ${(i.skills || []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, deferredQ, cat]);

  // Prefetch detail on hover/touch for instant navigation
  const prefetchDetail = useCallback((slug: string) => {
    qc.prefetchQuery({
      queryKey: ["vacancy", slug],
      queryFn: async () => {
        const { data } = await supabase.from("jobs" as any).select("*").eq("slug", slug).maybeSingle();
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [qc]);

  return (
    <>
      <SEO
        title="Careers & Vacancies | DekhoCampus"
        description="Open vacancies at DekhoCampus - content, engineering, design, marketing, counselling & more. Apply directly."
      />
      <Navbar />
      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12">
          <div className="container">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-6 h-6 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">Careers & Vacancies</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Join the team building India's most-loved campus discovery platform.
            </p>
            <div className="mt-5 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search role, team, skill..."
                className="pl-9 h-11"
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge
                  variant={!cat ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setCat("")}
                >
                  All
                </Badge>
                {categories.map((c) => (
                  <Badge
                    key={c as string}
                    variant={cat === c ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCat(c as string)}
                  >
                    {c as string}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="container py-8">
          {isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No vacancies match your search.</p>
          ) : (
            <div className="grid gap-3" style={{ contentVisibility: "auto" } as any}>
              {filtered.map((j: any) => (
                <Link
                  key={j.id}
                  to={`/vacancies/${j.slug}`}
                  onMouseEnter={() => prefetchDetail(j.slug)}
                  onTouchStart={() => prefetchDetail(j.slug)}
                  onFocus={() => prefetchDetail(j.slug)}
                  style={{ contentVisibility: "auto", containIntrinsicSize: "120px" } as any}
                >
                  <Card className="p-4 md:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-xl bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                        {j.company_logo ? (
                          <img
                            src={j.company_logo}
                            alt={j.company}
                            loading="lazy"
                            decoding="async"
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Briefcase className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="font-bold text-base md:text-lg">{j.title}</h3>
                            <p className="text-sm text-muted-foreground">{j.company}</p>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {j.is_featured && <Badge>Featured</Badge>}
                            {j.is_remote && <Badge variant="secondary">Remote</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          {j.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {j.location}
                            </span>
                          )}
                          {j.job_type && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {j.job_type}
                            </span>
                          )}
                          {j.salary && (
                            <span className="flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" />
                              {j.salary}
                            </span>
                          )}
                          {j.experience && <span>{j.experience}</span>}
                        </div>
                        {j.short_description && (
                          <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{j.short_description}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
