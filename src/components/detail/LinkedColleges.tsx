import { buildCollegeHref } from "@/lib/entityUrls";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slugify";

interface Props {
  /** "exam" -> match colleges.related_exams; "course" -> colleges.related_courses */
  by: "exam" | "course";
  slug: string;
  /** Fallback names (text array) when no DB-linked rows exist */
  fallbackNames?: string[];
  emptyText?: string;
}

/**
 * Renders clickable college cards linked to an exam or a course.
 * Admin manages the link in AdminColleges → related_exams / related_courses.
 */
export function LinkedColleges({ by, slug, fallbackNames = [], emptyText }: Props) {
  const col = by === "exam" ? "related_exams" : "related_courses";
  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["linked-colleges", by, slug],
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("colleges")
        .select("slug,name,short_name,city,state,rating,logo")
        .contains(col, [slug])
        .eq("is_active", true)
        .order("priority", { ascending: true, nullsFirst: false })
        .limit(12);
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="grid sm:grid-cols-2 gap-2">{[0,1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>;
  }

  if (colleges.length > 0) {
    return (
      <>
        <div className="grid sm:grid-cols-2 gap-2">
          {colleges.map((c: any) => (
            <Link
              key={c.slug}
              to={buildCollegeHref(c)}
              className="group flex items-center gap-2.5 p-2.5 bg-muted hover:bg-primary/5 hover:border-primary/30 border border-transparent rounded-xl transition-colors min-w-0"
            >
              <Building className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                  {c.short_name || c.name}
                </div>
                {(c.city || c.state) && (
                  <div className="text-[11px] text-muted-foreground truncate">{[c.city, c.state].filter(Boolean).join(", ")}</div>
                )}
              </div>
              {c.rating > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-foreground shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{Number(c.rating).toFixed(1)}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="mt-3">
          <Link to="/colleges">
            <Button variant="outline" size="sm" className="rounded-xl text-xs">View All Colleges →</Button>
          </Link>
        </div>
      </>
    );
  }

  // Fallback: render text-only chips but still link by slugified name
  if (fallbackNames.length > 0) {
    return (
      <>
        <div className="grid sm:grid-cols-2 gap-2">
          {fallbackNames.map((n) => (
            <Link
              key={n}
              to={`/colleges/${slugify(n)}`}
              className="flex items-center gap-2 p-2.5 bg-muted hover:bg-primary/5 rounded-xl transition-colors"
            >
              <Building className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground hover:text-primary truncate">{n}</span>
            </Link>
          ))}
        </div>
        <div className="mt-3">
          <Link to="/colleges">
            <Button variant="outline" size="sm" className="rounded-xl text-xs">View All Colleges →</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      {emptyText || "No linked colleges yet."}{" "}
      <Link to="/colleges" className="text-primary underline">Browse all colleges →</Link>
    </div>
  );
}
