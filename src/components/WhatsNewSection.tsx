import { Link } from "react-router-dom";
import { Calendar, ChevronRight } from "lucide-react";
import { useDbArticles } from "@/hooks/useArticlesData";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WhatsNewSectionProps {
  entityName: string;
  entityType: "college" | "course" | "exam" | "career";
  entitySlug?: string;
  category?: string;
}

export function WhatsNewSection({ entityName, entityType, entitySlug, category }: WhatsNewSectionProps) {
  const { data: articles } = useDbArticles();
  const [linkedIds, setLinkedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!entitySlug) return;
    (supabase as any)
      .from("article_links")
      .select("article_id")
      .eq("entity_type", entityType)
      .eq("entity_slug", entitySlug)
      .then(({ data }: any) => setLinkedIds((data || []).map((d: any) => d.article_id)));
  }, [entityType, entitySlug]);

  const relevantArticles = useMemo(() => {
    if (!articles) return [];
    const linked = articles.filter((a) => linkedIds.includes(a.id));
    if (linked.length > 0) return linked.slice(0, 3);

    const nameWords = entityName.toLowerCase().split(/\s+/);
    const matched = articles
      .filter((a) => {
        const titleLower = a.title.toLowerCase();
        const descLower = (a.description || "").toLowerCase();
        return nameWords.some((w) => w.length > 3 && (titleLower.includes(w) || descLower.includes(w))) ||
          (category && (a.category || "").toLowerCase() === category.toLowerCase()) ||
          (a.vertical || "").toLowerCase() === entityType;
      })
      .slice(0, 3);
    if (matched.length > 0) return matched;

    return [...articles].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 3);
  }, [articles, entityName, entityType, category, linkedIds]);

  // Only hide if absolutely nothing exists
  if (relevantArticles.length === 0) return null;

  const newsItems = relevantArticles.map((a) => ({
    title: a.title,
    date: new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    slug: `/articles/${a.slug}`,
  }));

  return (
    <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl border border-border p-5 scroll-mt-32">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-foreground">What's new?</h2>
        <Link to="/news" className="text-xs font-semibold text-primary hover:underline">Show more →</Link>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{entityName} latest news and articles</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {newsItems.map((item, i) => (
          <Link
            key={i}
            to={item.slug}
            className="bg-card rounded-xl border border-border p-3 hover:shadow-md transition-shadow group"
          >
            <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" /> {item.date}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
