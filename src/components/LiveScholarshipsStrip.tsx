import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";

interface Scholarship {
  id: string;
  slug: string;
  title: string;
  amount: string;
  deadline: string;
  apply_url: string;
}

export function LiveScholarshipsStrip() {
  const [items, setItems] = useState<Scholarship[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("scholarships")
        .select("id,slug,title,amount,deadline,apply_url")
        .eq("is_active", true)
        .eq("is_live", true)
        .order("display_order", { ascending: true })
        .limit(20);
      setItems(data || []);
    })();
  }, []);

  if (!items.length) return null;
  const loop = [...items, ...items];

  return (
    <section className="my-3">
      <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
        <h3 className="text-sm md:text-base font-bold text-orange-700 flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
          </span>
          <Award className="w-4 h-4 shrink-0" />
          <span className="truncate">Live Scholarships</span>
        </h3>
        <Link to="/scholarships" className="text-xs font-semibold text-primary hover:underline shrink-0">
          View all →
        </Link>
      </div>
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-orange-200/60 rounded-xl">
          <div ref={trackRef} className="overflow-hidden py-2">
            <div className="flex items-center gap-10 md:gap-12 whitespace-nowrap animate-[marquee_6s_linear_infinite] [@media(hover:hover)]:hover:[animation-play-state:paused] px-4 pr-10">
            {loop.map((s, i) => (
              <Link
                key={`${s.id}-${i}`}
                to={`/scholarships/${s.slug}`}
                className="group inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-orange-700 hover:text-orange-900 underline decoration-orange-400/60 decoration-dotted underline-offset-4 hover:decoration-solid hover:decoration-orange-600 transition-colors shrink-0"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 group-hover:bg-orange-600 group-hover:scale-125 transition-transform" />
                {s.title}
                <span aria-hidden className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
