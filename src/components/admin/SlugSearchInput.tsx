import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface Props {
  table: "colleges" | "courses" | "exams";
  value: string;
  onChange: (slug: string, row?: any) => void;
  placeholder?: string;
  label?: string;
}

/** Searchable picker: type a name, get matching slugs from DB. */
export function SlugSearchInput({ table, value, onChange, placeholder, label }: Props) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open || query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from(table)
        .select("slug,name")
        .ilike("name", `%${query}%`)
        .limit(10);
      setResults(data || []);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open, table]);

  return (
    <div ref={ref} className="relative">
      {label && <label className="text-xs text-muted-foreground">{label}</label>}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
          placeholder={placeholder || `Search ${table}...`}
          className="pl-8 pr-8 h-9 text-sm"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); onChange(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.slug}
              type="button"
              onClick={() => { setQuery(r.slug); onChange(r.slug, r); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0"
            >
              <div className="font-medium truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground truncate">{r.slug}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
