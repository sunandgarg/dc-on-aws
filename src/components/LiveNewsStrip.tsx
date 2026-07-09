import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper } from "lucide-react";

function shortTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length <= 3) return title;
  return words.slice(0, 3).join(" ") + "...";
}

interface NewsItem {
  id: string;
  slug: string;
  title: string;
}

export function LiveNewsStrip() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("articles")
        .select("id,slug,title")
        .eq("status", "Published")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      setItems(data || []);
    })();
  }, []);

  if (!items.length) return null;
  const loop = [...items, ...items];

  return (
    <section className="my-3">
      <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
        <h3 className="text-sm md:text-base font-bold text-blue-700 flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
          </span>
          <Newspaper className="w-4 h-4 shrink-0" />
          <span className="truncate">Live News</span>
        </h3>
        <Link to="/news" className="text-xs font-semibold text-primary hover:underline shrink-0">
          View all →
        </Link>
      </div>
      <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50 border border-blue-200/60 rounded-xl">
        <div className="overflow-hidden py-2">
          <div className="flex items-center gap-10 md:gap-12 whitespace-nowrap animate-[marquee-news_6s_linear_infinite] [@media(hover:hover)]:hover:[animation-play-state:paused] px-4 pr-10">
            {loop.map((n, i) => (
              <Link
                key={`${n.id}-${i}`}
                to={`/articles/${n.slug}`}
                className="group inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-blue-700 hover:text-blue-900 underline decoration-blue-400/60 decoration-dotted underline-offset-4 hover:decoration-solid hover:decoration-blue-600 transition-colors shrink-0"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-blue-600 group-hover:scale-125 transition-transform" />
                {shortTitle(n.title)}
                <span aria-hidden className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes marquee-news { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
