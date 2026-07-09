import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Props {
  table: "articles" | "colleges";
  detailPath: (slug: string) => string;
}

/** Top-of-admin panel showing the current pinned items with one-click remove.
 *  Articles use 4 slots (1 big hero + 3 small) on /news.
 *  Colleges use 5 slots on listing pages.
 */
export function FeaturedRankPanel({ table, detailPath }: Props) {
  const qc = useQueryClient();
  const maxSlots = 5; // articles: 1 hero + 4 small; colleges: 1 hero + 4 small
  const slots = Array.from({ length: maxSlots }, (_, i) => i + 1);

  const { data = [], isLoading } = useQuery({
    queryKey: ["featured-rank", table],
    queryFn: async () => {
      const cols =
        table === "articles"
          ? "id,slug,title,featured_image,featured_rank"
          : "id,slug,name,image,featured_rank";
      const { data } = await (supabase as any)
        .from(table)
        .select(cols)
        .not("featured_rank", "is", null)
        .order("featured_rank", { ascending: true });
      return data || [];
    },
  });

  const remove = async (id: string) => {
    const { error } = await (supabase as any).rpc("clear_featured_rank", { _table: table, _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Removed from featured");
    qc.invalidateQueries({ queryKey: ["featured-rank", table] });
    qc.invalidateQueries({ queryKey: ["news-articles"] });
    qc.invalidateQueries({ queryKey: ["all-colleges"] });
  };

  if (isLoading) return null;

  const heading =
    table === "articles"
      ? `Pinned on News page (Top ${maxSlots})`
      : `Featured (Top ${maxSlots} pinned)`;
  const sub =
    table === "articles"
      ? "#1 is the big hero, #2-4 are the three small cards on /news. Click ✕ to unpin."
      : "#1 is the big hero, #2-5 are the four small cards. Click ✕ to unpin.";

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Star className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-bold text-foreground">{heading}</p>
        <span className="text-[11px] text-muted-foreground">- {sub}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:grid-cols-5">
        {slots.map((slot) => {
          const item = data.find((d: any) => d.featured_rank === slot);
          return (
            <div key={slot} className="bg-card rounded-lg border border-border p-2 min-h-[68px] flex items-center gap-2 relative">
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${slot === 1 ? "bg-primary" : "bg-amber-500"}`}>{slot}</span>
              {item ? (
                <>
                  <img src={item.featured_image || item.image || "/placeholder.svg"} alt="" className="w-12 h-12 rounded object-cover ml-5" />
                  <Link to={detailPath(item.slug)} target="_blank" className="flex-1 min-w-0 text-xs font-semibold text-foreground line-clamp-2 hover:text-primary">
                    {item.title || item.name}
                  </Link>
                  <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive p-1" title="Unpin">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground ml-7">
                  {slot === 1 ? "Hero slot empty" : "Empty slot"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
