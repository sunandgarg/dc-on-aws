import { useEffect, useState } from "react";
import { Star, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  author_name: string;
  avatar_url: string;
  rating: number;
  body: string;
}

const FALLBACK: Review[] = [
  { author_name: "Aarav Sharma", avatar_url: "", rating: 5, body: "Loved how easy it was to compare colleges and shortlist programs. Genuine guidance!" },
  { author_name: "Priya Verma", avatar_url: "", rating: 5, body: "The counselling team helped me pick the right course for my career. Highly recommended." },
  { author_name: "Rohan Mehta", avatar_url: "", rating: 5, body: "Great platform - clear cutoffs, fees, and reviews all in one place. Very useful." },
  { author_name: "Sneha Patel", avatar_url: "", rating: 4, body: "Quick replies, helpful AI counsellor, and trusted info. Worth using." },
];

export function HomeGoogleReviews() {
  const [reviews, setReviews] = useState<Review[]>(FALLBACK);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(4.9);
  const [total, setTotal] = useState<number>(600);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const intRes: any = await (supabase as any).from("site_integrations")
        .select("key, value, enabled").in("key", ["google_review_url", "google_places_site_id"]);
      const map = new Map((intRes.data ?? []).map((r: any) => [r.key, r]));
      const urlRow: any = map.get("google_review_url");
      const placeRow: any = map.get("google_places_site_id");
      if (!cancelled && urlRow?.value && urlRow?.enabled) setReviewUrl(urlRow.value);

      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const qs = new URLSearchParams({ entityType: "site", entitySlug: "homepage" });
        if (placeRow?.value) qs.set("placeId", placeRow.value);
        const res = await fetch(`https://${projectId}.functions.supabase.co/google-reviews?${qs}`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (res.ok) {
          const j = await res.json();
          if (!cancelled) {
            if (Array.isArray(j.reviews) && j.reviews.length) setReviews(j.reviews);
            if (j.rating) setRating(j.rating);
            if (j.total) setTotal(j.total);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="google-reviews" className="py-10 scroll-mt-20">
      <div className="container">
        <div className="bg-card rounded-3xl border border-border p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 text-white font-bold">G</span>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Google Reviews</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-golden text-golden" />)}
                  </div>
                  <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">• {total}+ reviews</span>
                </div>
              </div>
            </div>
            {reviewUrl && (
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                View on Google <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
            {reviews.slice(0, 4).map((r, i) => (
              <div key={i} className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex flex-col h-[200px] sm:h-[200px] lg:h-[200px] overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 overflow-hidden">
                    {r.avatar_url ? <img src={r.avatar_url} alt={r.author_name} className="w-9 h-9 rounded-full object-cover" loading="lazy" /> : r.author_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.author_name}</p>
                    <div className="flex items-center">
                      {Array.from({ length: r.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-golden text-golden" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-4">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
