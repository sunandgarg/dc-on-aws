import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Plus, Loader2 } from "lucide-react";

type EntityKind = "course" | "exam" | "career" | "college" | "scholarship" | "article";

const TABLE: Record<EntityKind, { table: string; nameCol: string; cols: string }> = {
  course:      { table: "courses",         nameCol: "name",  cols: "slug, name, category" },
  exam:        { table: "exams",           nameCol: "name",  cols: "slug, name, category" },
  career:      { table: "career_profiles", nameCol: "name",  cols: "slug, name, domain"   },
  college:     { table: "colleges",        nameCol: "name",  cols: "slug, name, city, state" },
  scholarship: { table: "scholarships",    nameCol: "title", cols: "slug, title, provider" },
  article:     { table: "articles",        nameCol: "title", cols: "slug, title, category" },
};

interface Props {
  kind: EntityKind;
  /** Selected slugs (controlled) */
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
}

interface Row { slug: string; label: string; sub?: string }

// Module-level LRU-ish cache shared across all instances; ~5min TTL.
const CACHE = new Map<string, { at: number; rows: Row[] }>();
const TTL = 5 * 60 * 1000;
const ck = (kind: string, term: string) => `${kind}::${term.toLowerCase()}`;

const PLACEHOLDER: Record<EntityKind, string> = {
  course:      "Type to search courses (e.g. B.Tech CSE, MBA, B.Com)…",
  exam:        "Type to search exams (e.g. JEE Main, NEET, CAT, SEM 1, Final)…",
  career:      "Type to search careers (e.g. Software Engineer, Data Analyst)…",
  college:     "Type to search colleges (e.g. IIT Delhi, Manipal)…",
  scholarship: "Type to search scholarships (e.g. NSP, Inspire)…",
  article:     "Type to search news articles by title or slug…",
};

/** Reusable server-side autocomplete multi-picker for any slug-keyed entity.
 *  - 220ms debounce + AbortController cancels in-flight queries on rapid typing
 *  - 5-minute in-memory result cache per (kind, term)
 *  - Inline suggestions + helpful empty state
 */
export function EntitySlugMultiSearch({ kind, value, onChange, label, placeholder }: Props) {
  const meta = TABLE[kind];
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  // Resolve display labels for already-selected slugs
  useEffect(() => {
    const missing = value.filter((s) => s && !labels[s]);
    if (!missing.length) return;
    (async () => {
      const { data } = await (supabase as any)
        .from(meta.table)
        .select(`slug, ${meta.nameCol}`)
        .in("slug", missing);
      const next = { ...labels };
      (data || []).forEach((r: any) => { next[r.slug] = r[meta.nameCol] || r.slug; });
      setLabels(next);
    })();
  }, [value, kind]); // eslint-disable-line

  // Debounced search w/ AbortController + cache
  useEffect(() => {
    const term = q.trim();
    if (!term) { setRows([]); setLoading(false); return; }

    // Cache hit
    const hit = CACHE.get(ck(kind, term));
    if (hit && Date.now() - hit.at < TTL) {
      setRows(hit.rows); setLoading(false); return;
    }

    setLoading(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      const { data, error } = await (supabase as any)
        .from(meta.table)
        .select(meta.cols)
        .or(`${meta.nameCol}.ilike.%${term}%,slug.ilike.%${term}%`)
        .limit(20)
        .abortSignal(ac.signal);
      if (ac.signal.aborted) return;
      if (error) { setLoading(false); return; }
      const mapped: Row[] = ((data as any[]) || []).map((r) => ({
        slug: r.slug,
        label: r[meta.nameCol] || r.slug,
        sub: r.category || r.domain || [r.city, r.state].filter(Boolean).join(", ") || r.provider,
      }));
      CACHE.set(ck(kind, term), { at: Date.now(), rows: mapped });
      // Cap cache size
      if (CACHE.size > 200) {
        const oldest = [...CACHE.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
        if (oldest) CACHE.delete(oldest);
      }
      setRows(mapped);
      setLoading(false);
    }, 220);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q, kind]);

  const toggle = (slug: string, lbl?: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
      if (lbl) setLabels((l) => ({ ...l, [slug]: lbl }));
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder || PLACEHOLDER[kind]}
          className="pl-9 pr-9 h-9 text-sm"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>
      {!q.trim() && value.length === 0 && (
        <p className="text-[11px] text-muted-foreground/80 italic">
          {kind === "exam"
            ? 'Tip: try keywords like "JEE", "NEET", "SEM 1", or "Final exam".'
            : `Start typing to see ${kind} suggestions from your library.`}
        </p>
      )}
      {q.trim() && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-60 overflow-y-auto">
          {loading && rows.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching {kind}s…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground text-center space-y-1">
              <div>No {kind}s match "<span className="font-medium text-foreground">{q}</span>".</div>
              <div className="text-[10px]">Check spelling, try a shorter term, or add a new {kind} from the {kind} admin page first.</div>
            </div>
          )}
          {rows.map((r) => {
            const picked = value.includes(r.slug);
            return (
              <button
                key={r.slug}
                type="button"
                onClick={() => toggle(r.slug, r.label)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted ${picked ? "bg-primary/5" : ""}`}
              >
                <span className="truncate">
                  <span className="font-medium text-foreground">{r.label}</span>
                  {r.sub && <span className="text-muted-foreground ml-1.5">· {r.sub}</span>}
                  <span className="text-muted-foreground/60 ml-1.5 text-[10px]">[{r.slug}]</span>
                </span>
                {picked ? <Badge variant="default" className="h-5 text-[10px]">Linked</Badge> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((slug) => (
            <Badge key={slug} variant="secondary" className="gap-1 pr-1">
              <span className="truncate max-w-[180px]">{labels[slug] || slug}</span>
              <button type="button" onClick={() => toggle(slug)} className="hover:bg-muted rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
