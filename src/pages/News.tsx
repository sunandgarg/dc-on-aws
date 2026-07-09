import { Fragment, useState, useMemo, useEffect, useRef, memo } from "react";
import { Search, Clock, TrendingUp, GraduationCap, Briefcase, Building2, FileText, Award, Globe, BookOpen, Users, Newspaper, X, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { Link, useSearchParams, useParams, useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  { label: "All News", icon: Newspaper, value: "" },
  { label: "Admission News", icon: GraduationCap, value: "Admissions" },
  { label: "Trending News", icon: TrendingUp, value: "Trending" },
  { label: "Job Opportunities", icon: Briefcase, value: "Jobs" },
  { label: "College News", icon: Building2, value: "College" },
  { label: "Exam News", icon: FileText, value: "Exam Updates" },
  { label: "Success Stories", icon: Award, value: "Success" },
  { label: "Scholarships", icon: BookOpen, value: "Scholarships" },
  { label: "Career", icon: Users, value: "Career" },
  { label: "World Today", icon: Globe, value: "World" },
];

const PAGE_SIZE = 12;
const ARTICLE_COLS = "id,slug,title,description,featured_image,category,tags,created_at,featured_rank";

// Reuse one Intl formatter instead of re-instantiating on every render
const dateFmtLong = new Intl.DateTimeFormat("en-IN", { month: "long", day: "numeric", year: "numeric" });
const dateFmtShort = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", year: "numeric" });

// Debounce hook - search input shouldn't fire a query on every keystroke
function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

type Article = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
  featured_rank: number | null;
};

// Memoized card components - prevents re-render storms when parent state changes
const LatestCard = memo(function LatestCard({ a, eager }: { a: Article; eager: boolean }) {
  return (
    <Link to={`/news/${a.slug}`} className="group">
      <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
        <div className="h-44 bg-muted overflow-hidden">
          {a.featured_image ? (
            <img
              src={a.featured_image}
              alt=""
              width={400}
              height={176}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <Newspaper className="w-10 h-10 text-primary/20" />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {a.category && <Badge variant="secondary" className="text-xs">{a.category}</Badge>}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{dateFmtShort.format(new Date(a.created_at))}
            </span>
          </div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm">{a.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.description}</p>
        </div>
      </div>
    </Link>
  );
});

const SidebarItem = memo(function SidebarItem({ a }: { a: Article }) {
  return (
    <Link to={`/news/${a.slug}`} className="flex gap-3 group">
      <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
        {a.featured_image ? (
          <img src={a.featured_image} alt="" width={96} height={80} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary/30" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{dateFmtLong.format(new Date(a.created_at))}</p>
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{a.title}</h3>
      </div>
    </Link>
  );
});

function GridSkeleton() {
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 h-[300px] md:h-[400px] rounded-2xl bg-muted animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-24 h-20 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-full bg-muted animate-pulse rounded" />
                <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border overflow-hidden">
            <div className="h-44 bg-muted animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function News() {
  const [searchParams] = useSearchParams();
  const { tag: tagFromPath } = useParams<{ tag?: string }>();
  const navigate = useNavigate();
  const queryTag = (searchParams.get("tag") || "").toLowerCase().trim();

  useEffect(() => {
    if (queryTag && !tagFromPath) {
      const next = new URLSearchParams(searchParams);
      next.delete("tag");
      const qs = next.toString();
      navigate(`/news/tag/${queryTag}${qs ? `?${qs}` : ""}`, { replace: true });
    }
  }, [queryTag, tagFromPath, navigate, searchParams]);

  const tagParam = (tagFromPath || queryTag || "").toLowerCase().trim();
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounced(searchQuery.trim(), 350);
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [tagParam, activeCategory, debouncedSearch]);

  const clearTag = () => navigate("/news", { replace: true });

  // Pinned articles - separate, long-cached query. Doesn't depend on filters/page/search.
  const { data: pinned = [] } = useQuery({
    queryKey: ["news-pinned"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(ARTICLE_COLS)
        .eq("is_active", true)
        .not("featured_rank", "is", null)
        .order("featured_rank", { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data || []) as Article[];
    },
  });

  const pinnedIds = useMemo(() => pinned.map(p => p.id), [pinned]);
  const hasFilters = !!(tagParam || activeCategory || debouncedSearch);

  // Latest list - paginated. Skip exact count (slow on big tables); use +1 lookahead instead.
  const { data: latestData, isLoading, isFetching } = useQuery({
    queryKey: ["news-latest", { tagParam, activeCategory, debouncedSearch, page, excl: hasFilters ? [] : pinnedIds }],
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("articles")
        .select(ARTICLE_COLS)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (tagParam) q = q.contains("tags", [tagParam]);
      if (activeCategory) q = q.ilike("category", `%${activeCategory}%`);
      if (debouncedSearch) q = q.or(`title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      // Exclude pinned IDs from the "latest" stream only on the unfiltered home view,
      // so pinned items don't appear twice. With filters active, show everything matching.
      if (!hasFilters && pinnedIds.length) {
        q = q.not("id", "in", `(${pinnedIds.join(",")})`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE; // fetch one extra to know if there's a next page
      q = q.range(from, to);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as Article[];
      const hasMore = rows.length > PAGE_SIZE;
      return { rows: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore };
    },
  });

  const latest = latestData?.rows || [];
  const hasMore = latestData?.hasMore || false;

  // Hero + sidebar ONLY appear on the unfiltered home view. When any filter
  // (category, tag, or search) is active, show a plain card grid like a
  // category archive page.
  const showPinnedHero = !hasFilters && pinned.length > 0 && page === 0;
  const featured = showPinnedHero ? pinned[0] : undefined;
  const sidebar = showPinnedHero ? pinned.slice(1, 5) : [];
  const gridArticles = showPinnedHero ? latest : latest;

  const pageTitle = tagParam
    ? `${tagParam.replace(/-/g, " ")} News & Updates | DekhoCampus`
    : "Education News - Admissions, Exams & Career Updates | DekhoCampus";

  const showSkeleton = isLoading && latest.length === 0;
  const empty = !isLoading && latest.length === 0 && pinned.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={pageTitle}
        description={tagParam ? `Latest articles tagged ${tagParam} - admissions, tips, results, and updates.` : "Daily updates on admissions, entrance exams, results, scholarships and career opportunities."}
        canonical={tagParam ? `/news/tag/${tagParam}` : "/news"}
      />
      {/* Preload the LCP image so the hero paints fast */}
      {featured?.featured_image && (
        <link rel="preload" as="image" href={featured.featured_image} />
      )}
      <Navbar />
      <main className="container py-8 md:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-black dark:text-white">
            {tagParam ? `${tagParam.replace(/-/g, " ")}` : "DekhoCampus News"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            {tagParam ? `Showing articles tagged with this topic.` : "Updates on the Latest Career Opportunities, Online Education, Online Universities, & more."}
          </p>
        </div>

        <AlsoCheckSection variant="strip" className="mb-4" />

        {tagParam && (
          <div className="flex justify-center mb-4">
            <button onClick={clearTag} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/15">
              <TagIcon className="w-3.5 h-3.5" />
              Tag: <span className="font-bold">{tagParam}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button key={cat.label} onClick={() => setActiveCategory(cat.value)}
              className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border min-w-[90px] transition-all text-center ${
                activeCategory === cat.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border hover:bg-muted text-muted-foreground"
              }`}>
              <cat.icon className="w-6 h-6" />
              <span className="text-[11px] font-semibold whitespace-nowrap">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-8 max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search news..." className="pl-10 rounded-xl h-11" />
        </div>

        {showSkeleton ? (
          <GridSkeleton />
        ) : empty ? (
          <div className="text-center py-20 text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No news found</p>
            <p className="text-sm">Try a different category or search term</p>
          </div>
        ) : (
          <>
            {(featured || sidebar.length > 0) && (
              <div className="grid lg:grid-cols-3 gap-6 mb-10">
                {featured && (
                  <Link to={`/news/${featured.slug}`} className="lg:col-span-2 group">
                    <div className="relative rounded-2xl overflow-hidden h-[300px] md:h-[400px] bg-muted">
                      {featured.featured_image ? (
                        <img
                          src={featured.featured_image}
                          alt={featured.title}
                          width={1200}
                          height={400}
                          fetchPriority="high"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"><Newspaper className="w-16 h-16 text-primary/30" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <Badge className="mb-2 bg-accent text-accent-foreground">{featured.category || "Featured"}</Badge>
                        <span className="text-white/70 text-sm ml-2">{dateFmtLong.format(new Date(featured.created_at))}</span>
                        <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-accent transition-colors line-clamp-2 mt-1">{featured.title}</h2>
                      </div>
                    </div>
                  </Link>
                )}
                {sidebar.length > 0 && (
                  <div className="space-y-4">
                    {sidebar.map((a) => <SidebarItem key={a.id} a={a} />)}
                  </div>
                )}
              </div>
            )}

            {gridArticles.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6 border-b border-border pb-3">Latest Posts</h2>
                <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
                  {gridArticles.map((a, i) => (
                    <Fragment key={a.id}>
                      <LatestCard a={a} eager={i < 3} />
                      {i === Math.min(5, Math.floor(gridArticles.length / 2)) && (
                        <div className="sm:col-span-2 lg:col-span-3 my-2">
                          <LeadCaptureForm
                            variant="banner"
                            title="📞 Confused about colleges or courses?"
                            subtitle="Talk to a free expert counsellor - personalised guidance in under 24 hours."
                            source="news_mid_grid"
                          />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 mt-8">
                  {page > 0 && (
                    <button onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted">← Previous</button>
                  )}
                  <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                  {hasMore && (
                    <button onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Next →</button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
