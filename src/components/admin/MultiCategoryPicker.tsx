import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

interface Props {
  /** Array of category slugs currently selected. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Optional: also exclude this slug (the primary single `category`) from the multi list to avoid duplicates. */
  primary?: string;
  label?: string;
}

/**
 * Multi-select for stream categories (reads from `stream_categories` table).
 * Use alongside the existing single `category` field for backwards compatibility.
 */
export function MultiCategoryPicker({ value, onChange, primary, label = "Additional Categories" }: Props) {
  const { data: cats = [] } = useQuery({
    queryKey: ["stream_categories_active"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("stream_categories")
        .select("slug,label,emoji,display_order,is_active")
        .eq("is_active", true)
        .order("display_order");
      return data ?? [];
    },
  });

  const toggle = (slug: string) => {
    const set = new Set(value || []);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    onChange(Array.from(set));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        {label} <span className="text-[10px] text-muted-foreground/70">(select all that apply)</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c: any) => {
          const isPrimary = primary && c.slug === primary;
          const active = (value || []).includes(c.slug) || isPrimary;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => !isPrimary && toggle(c.slug)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/40"
              } ${isPrimary ? "opacity-70 cursor-not-allowed" : ""}`}
              title={isPrimary ? "Primary category - set above" : undefined}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
              {active && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
      {(value?.length || 0) > 0 && (
        <p className="text-[11px] text-muted-foreground">{value.length} additional categor{value.length === 1 ? "y" : "ies"} selected</p>
      )}
    </div>
  );
}
