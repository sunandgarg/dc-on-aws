import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Newspaper, ChevronRight, Calendar, Lightbulb, NotebookPen, ArrowDownAZ, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  subjectSlug: string;
  subjectName?: string;
  subjectId?: string;
}

type FilterKind = "all" | "tricks" | "notes";
type SortKind = "newest" | "oldest";

export function SubjectNewsSection({ subjectSlug, subjectName, subjectId }: Props) {
  const [filter, setFilter] = useState<FilterKind>("all");
  const [sort, setSort] = useState<SortKind>("newest");

  const { data: articles = [] } = useQuery({
    queryKey: ["subject-news", subjectSlug, subjectId],
    enabled: !!subjectSlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const tags = [subjectSlug, `${subjectSlug}-tricks`, `${subjectSlug}-notes`];
      const [tagRes, linkRes] = await Promise.all([
        supabase
          .from("articles")
          .select("id,slug,title,description,featured_image,category,tags,created_at,author")
          .eq("is_active", true)
          .overlaps("tags", tags)
          .order("created_at", { ascending: false })
          .limit(40),
        subjectId
          ? (supabase as any)
              .from("article_links")
              .select("article_id, articles!inner(id,slug,title,description,featured_image,category,tags,created_at,author,is_active)")
              .eq("entity_type", "study_subject")
              .eq("entity_slug", subjectId)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const linked = ((linkRes as any).data || [])
        .map((r: any) => r.articles)
        .filter((a: any) => a && a.is_active);
      const merged = [...((tagRes.data as any[]) || []), ...linked];
      const seen = new Set<string>();
      return merged.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
    },
  });

  const isTricks = (a: any) => (a.tags || []).includes(`${subjectSlug}-tricks`);
  const isNotes = (a: any) => (a.tags || []).includes(`${subjectSlug}-notes`);

  const visible = useMemo(() => {
    let list = articles;
    if (filter === "tricks") list = list.filter(isTricks);
    else if (filter === "notes") list = list.filter(isNotes);
    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list.slice(0, 12);
  }, [articles, filter, sort]);

  if (!articles.length) return null;

  const counts = {
    all: articles.length,
    tricks: articles.filter(isTricks).length,
    notes: articles.filter(isNotes).length,
  };

  const chips: { key: FilterKind; label: string; icon: any; count: number }[] = [
    { key: "all", label: "All", icon: Newspaper, count: counts.all },
    { key: "tricks", label: "Tricks", icon: Lightbulb, count: counts.tricks },
    { key: "notes", label: "Notes", icon: NotebookPen, count: counts.notes },
  ];

  return (
    <section className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          {subjectName || "Subject"} News & Articles
        </h2>
        <Link to={`/news/tag/${subjectSlug}`} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === c.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"
              }`}>
              <c.icon className="w-3 h-3" /> {c.label}
              <span className={`text-[10px] rounded-full px-1.5 ${filter === c.key ? "bg-primary-foreground/20" : "bg-muted"}`}>{c.count}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setSort(s => s === "newest" ? "oldest" : "newest")}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-border hover:bg-muted">
          {sort === "newest" ? <Clock className="w-3 h-3" /> : <ArrowDownAZ className="w-3 h-3" />}
          {sort === "newest" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No articles match this filter yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((a: any) => (
            <Link key={a.id} to={`/articles/${a.slug}`} className="flex gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition group">
              {a.featured_image && (
                <img src={a.featured_image} alt={a.title} loading="lazy" className="w-24 h-20 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {isTricks(a) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                      <Lightbulb className="w-2.5 h-2.5" /> Tricks
                    </span>
                  )}
                  {isNotes(a) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                      <NotebookPen className="w-2.5 h-2.5" /> Notes
                    </span>
                  )}
                  {a.category && !isTricks(a) && !isNotes(a) && (
                    <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">{a.category}</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary">{a.title}</h3>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {a.author && <span>• {a.author}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
