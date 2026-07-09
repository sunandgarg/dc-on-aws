import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Heart, MapPin, Newspaper, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";

export function DashboardFavorites() {
  const { data: favs, isLoading } = useFavorites();
  const toggle = useToggleFavorite();
  const slugs = (favs || []).map((f) => f.college_slug);

  const { data: colleges } = useQuery({
    queryKey: ["fav-colleges", slugs],
    enabled: slugs.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("colleges")
        .select("slug, name, short_name, image, city, state, category")
        .in("slug", slugs);
      return data || [];
    },
  });

  const { data: news } = useQuery({
    queryKey: ["fav-news", slugs],
    enabled: slugs.length > 0,
    queryFn: async () => {
      const { data: links } = await (supabase as any)
        .from("article_links")
        .select("article_id, entity_slug")
        .eq("entity_type", "college")
        .in("entity_slug", slugs);
      const ids = Array.from(new Set((links || []).map((l: any) => l.article_id)));
      if (ids.length === 0) return [];
      const { data: arts } = await (supabase as any)
        .from("articles")
        .select("id, slug, title, featured_image, category, updated_at, created_at")
        .in("id", ids)
        .eq("status", "Published")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(15);
      const slugByArticle: Record<string, string> = {};
      (links || []).forEach((l: any) => { slugByArticle[l.article_id] = l.entity_slug; });
      return (arts || []).map((a: any) => ({ ...a, college_slug: slugByArticle[a.id] }));
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Loading favourites…</div>;
  }

  if (!favs || favs.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-10 text-center">
        <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-2">No favourites yet</h3>
        <p className="text-sm text-muted-foreground mb-5">Tap the heart on any college to save it here and get its latest updates.</p>
        <Link to="/colleges" className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          Browse Colleges
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 fill-primary text-primary" /> My Favourite Colleges
          <span className="text-xs font-normal text-muted-foreground">({favs.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(colleges || []).map((c: any) => (
            <div key={c.slug} className="bg-card border border-border rounded-2xl overflow-hidden flex">
              <Link to={`/colleges/${c.slug}`} className="w-28 h-28 flex-shrink-0 bg-muted">
                {c.image && <img src={c.image} alt={c.name} className="w-full h-full object-cover" loading="lazy" />}
              </Link>
              <div className="flex-1 p-3 min-w-0">
                <Link to={`/colleges/${c.slug}`} className="block">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{c.short_name || c.name}</h3>
                  {c.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {c.city}{c.state ? `, ${c.state}` : ""}
                    </p>
                  )}
                  {c.category && (
                    <span className="inline-block mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{c.category}</span>
                  )}
                </Link>
                <button
                  onClick={() => toggle.mutate({ collegeSlug: c.slug, isFav: true })}
                  className="mt-2 text-[11px] text-destructive/80 hover:text-destructive inline-flex items-center gap-1"
                >
                  <Heart className="w-3 h-3 fill-current" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" /> Updates for Your Favourites
        </h2>
        {(!news || news.length === 0) ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground text-center">
            No new updates yet for your favourite colleges. We'll notify you here when news drops.
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            {news.map((n: any) => {
              const college = (colleges || []).find((c: any) => c.slug === n.college_slug);
              return (
                <Link key={n.id} to={`/articles/${n.slug}`} className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                  <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {n.featured_image && <img src={n.featured_image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {college?.short_name || college?.name || n.college_slug}
                      {n.category && <> · <span className="text-primary">{n.category}</span></>}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
