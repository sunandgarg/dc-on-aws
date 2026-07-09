import { motion } from "framer-motion";
import { Clock, ArrowRight, TrendingUp, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { Link } from "react-router-dom";
import { useDbArticles } from "@/hooks/useArticlesData";
import { useMemo } from "react";

const categoryColors: Record<string, string> = {
  Admissions: "bg-primary/10 text-primary",
  Results: "bg-success/10 text-success",
  Scholarships: "bg-warning/10 text-warning-foreground",
  "Exam Updates": "bg-accent/10 text-accent",
  Rankings: "bg-secondary text-secondary-foreground",
  "New Courses": "bg-muted text-muted-foreground",
};

const categoryEmoji = (cat: string) => {
  const m: Record<string, string> = {
    Admissions: "📋", Results: "📊", Scholarships: "🎓",
    "Exam Updates": "🏥", Rankings: "🏆", "New Courses": "🤖",
  };
  return m[cat] || "📰";
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export function NewsSection() {
  const { data: allArticles } = useDbArticles();

  const items = useMemo(() => {
    if (!allArticles) return [];
    // Mirror News page: pinned (featured_rank 1-5) first, then newest. Cap at 4.
    const sorted = [...allArticles].sort((a: any, b: any) => {
      const ra = a.featured_rank ?? Infinity;
      const rb = b.featured_rank ?? Infinity;
      if (ra !== rb) return ra - rb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted.slice(0, 4).map(a => ({
      id: a.id,
      slug: a.slug,
      category: a.category || a.vertical || "News",
      title: a.title,
      excerpt: (a.description || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
      date: fmtDate(a.created_at),
      trending: (a.tags || []).includes("trending"),
      image: a.featured_image || categoryEmoji(a.category || ""),
    }));
  }, [allArticles]);

  const isImg = (s: string) => s?.startsWith("http");

  return (
    <section className="py-10 md:py-16 bg-muted/30" aria-label="Latest Education News">
      <div className="container">
        <div className="mb-8">
          <DynamicAdBanner variant="leaderboard" position="leaderboard" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">Latest News</span>
            </div>
            <h2 className="text-headline font-extrabold text-foreground">Education News & Updates</h2>
            <p className="text-muted-foreground mt-1">Stay updated with the latest in Indian education</p>
          </div>
          <Link to="/articles" className="hidden md:flex items-center gap-2 text-primary font-semibold hover:underline">
            View All News <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="md:hidden -mt-6 mb-5 flex justify-end">
          <Link to="/articles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            View All News <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No articles published yet.</p>
        ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Link to={`/articles/${items[0].slug}`} className="lg:col-span-2 card-elevated p-6 group">
                <div className="flex items-start gap-4">
                  {isImg(items[0].image) ? (
                    <img src={items[0].image} alt={items[0].title} className="w-20 h-20 rounded-xl object-cover" />
                  ) : (<div className="text-5xl">{items[0].image}</div>)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className={categoryColors[items[0].category] || ""}>{items[0].category}</Badge>
                      {items[0].trending && (
                        <Badge variant="secondary" className="bg-accent/10 text-accent">
                          <TrendingUp className="w-3 h-3 mr-1" /> Trending
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">{items[0].title}</h3>
                    <p className="text-muted-foreground mb-3 line-clamp-2">{items[0].excerpt}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" /><span>{items[0].date}</span>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="space-y-4">
                {items.slice(1, 4).map((item, i) => (
                  <Link to={`/articles/${item.slug}`} key={item.id} className="card-elevated p-4 group block">
                    <div className="flex items-start gap-3">
                      {isImg(item.image) ? (
                        <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (<span className="text-2xl">{item.image}</span>)}
                      <div className="flex-1 min-w-0">
                        <Badge variant="secondary" className={`text-xs mb-1 ${categoryColors[item.category] || ""}`}>{item.category}</Badge>
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{item.title}</h4>
                        <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.date}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <LeadCaptureForm variant="sidebar" title="Get Exam Alerts" subtitle="Never miss important dates" source="news_sidebar" />
            <DynamicAdBanner variant="square" position="sidebar" className="hidden lg:flex" />
          </div>
        </div>
        )}

        <div className="flex justify-center mt-8">
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            View All News & Updates <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
