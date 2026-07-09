import { useEffect, useMemo, useState } from "react";
import { Search, X, Landmark, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface UniversityOption {
  slug: string;
  name: string;
  short_name: string | null;
  city: string | null;
  state: string | null;
}

interface ParentUniversityPickerProps {
  value: string | null | undefined;
  onChange: (slug: string | null) => void;
  excludeSlug?: string;
}

/**
 * Searchable picker that lists only colleges marked as `affiliation_kind = 'university'`.
 * Used in admin when a college is set to `affiliated` and must be linked to a parent.
 */
export function ParentUniversityPicker({ value, onChange, excludeSlug }: ParentUniversityPickerProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<UniversityOption[]>([]);
  const [selected, setSelected] = useState<UniversityOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Hydrate display when `value` is set but selected isn't loaded yet
  useEffect(() => {
    let cancelled = false;
    if (!value) { setSelected(null); return; }
    if (selected?.slug === value) return;
    (async () => {
      const { data } = await supabase
        .from("colleges")
        .select("slug, name, short_name, city, state")
        .eq("slug", value)
        .maybeSingle();
      if (!cancelled && data) setSelected(data as UniversityOption);
    })();
    return () => { cancelled = true; };
  }, [value, selected?.slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("colleges")
        .select("slug, name, short_name, city, state")
        .order("name")
        .limit(20);
      if (debounced) q = q.or(`name.ilike.%${debounced}%,short_name.ilike.%${debounced}%,slug.ilike.%${debounced}%`);
      const { data } = await q;
      if (!cancelled) setResults((data as UniversityOption[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  const filtered = useMemo(
    () => results.filter((r) => r.slug !== excludeSlug),
    [results, excludeSlug],
  );

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Landmark className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{selected.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {selected.slug} · {[selected.city, selected.state].filter(Boolean).join(", ") || "-"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setSelected(null); setQuery(""); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Remove parent university"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any college or university by name / slug…"
              className="rounded-lg h-9 pl-8 text-sm"
            />
          </div>
          <div className="rounded-lg border border-border max-h-56 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-xs text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">
                No matching college or university found.
              </div>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.slug}
                  type="button"
                  onClick={() => { onChange(u.slug); setSelected(u); setQuery(""); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 border-b border-border last:border-0"
                >
                  <Check className="w-3.5 h-3.5 text-transparent" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {u.slug} · {[u.city, u.state].filter(Boolean).join(", ") || "-"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
