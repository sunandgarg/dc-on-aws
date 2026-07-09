import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Search, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  articleId: string;
}

type EntityType = "college" | "course" | "exam" | "career" | "scholarship" | "article" | "study_subject" | "study_chapter";

const TYPES: { key: EntityType; table: string; label: string; idKey: "slug" | "id"; selectCols: string; format: (r: any) => { id: string; name: string; sub?: string } }[] = [
  { key: "college", table: "colleges", label: "Colleges", idKey: "slug", selectCols: "slug, name, city, state",
    format: (r) => ({ id: r.slug, name: r.name, sub: [r.city, r.state].filter(Boolean).join(", ") }) },
  { key: "course", table: "courses", label: "Courses", idKey: "slug", selectCols: "slug, name, category",
    format: (r) => ({ id: r.slug, name: r.name, sub: r.category }) },
  { key: "exam", table: "exams", label: "Exams", idKey: "slug", selectCols: "slug, name, category",
    format: (r) => ({ id: r.slug, name: r.name, sub: r.category }) },
  { key: "career", table: "career_profiles", label: "Careers", idKey: "slug", selectCols: "slug, name, domain",
    format: (r) => ({ id: r.slug, name: r.name, sub: r.domain }) },
  { key: "scholarship", table: "scholarships", label: "Scholarships", idKey: "slug", selectCols: "slug, title, provider, category",
    format: (r) => ({ id: r.slug, name: r.title, sub: [r.provider, r.category].filter(Boolean).join(" · ") }) },
  { key: "article", table: "articles", label: "News / Articles", idKey: "slug", selectCols: "slug, title, category",
    format: (r) => ({ id: r.slug, name: r.title, sub: r.category }) },
  { key: "study_subject", table: "study_subjects", label: "Subjects", idKey: "id", selectCols: "id, name, class_num, board_slug",
    format: (r) => ({ id: r.id, name: r.name, sub: `Class ${r.class_num} · ${r.board_slug?.toUpperCase?.() || ""}` }) },
  { key: "study_chapter", table: "study_chapters", label: "Chapters", idKey: "id", selectCols: "id, name, chapter_number, subject_id",
    format: (r) => ({ id: r.id, name: r.name, sub: `Ch. ${r.chapter_number}` }) },
];

interface EntityRow { id: string; name: string; sub?: string }
interface Link { id: string; entity_type: string; entity_slug: string }

/** Multi-select picker for tagging an article to entities (colleges/courses/exams/careers/subjects/chapters). */
export function EntityMultiPicker({ articleId }: Props) {
  const initial = TYPES.reduce((acc, t) => ({ ...acc, [t.key]: [] as EntityRow[] }), {} as Record<EntityType, EntityRow[]>);
  const [data, setData] = useState<Record<EntityType, EntityRow[]>>(initial);
  const [links, setLinks] = useState<Link[]>([]);
  const [search, setSearch] = useState<Record<EntityType, string>>(
    TYPES.reduce((acc, t) => ({ ...acc, [t.key]: "" }), {} as Record<EntityType, string>),
  );
  const [active, setActive] = useState<EntityType>("college");
  const [searching, setSearching] = useState(false);
  const loadedTypesRef = useRef<Set<EntityType>>(new Set());

  // Lazy-load top 200 of the active type only (not all 8 types upfront)
  useEffect(() => {
    const t = TYPES.find((x) => x.key === active)!;
    if (loadedTypesRef.current.has(active)) return;
    loadedTypesRef.current.add(active);
    (async () => {
      const orderCol = ["scholarships", "articles"].includes(t.table) ? "title" : "name";
      const { data: rows } = await (supabase as any).from(t.table).select(t.selectCols).order(orderCol).limit(200);
      setData((d) => ({ ...d, [active]: ((rows as any[]) || []).map((r) => t.format(r)) }));
    })();
  }, [active]);

  // Debounced server-side search (ilike) for the active type - cancels in-flight requests
  useEffect(() => {
    const q = (search[active] || "").trim();
    if (!q) { setSearching(false); return; }
    setSearching(true);
    const ac = new AbortController();
    const handle = setTimeout(async () => {
      const t = TYPES.find((x) => x.key === active)!;
      const nameCol = ["scholarships", "articles"].includes(t.table) ? "title" : "name";
      const orFilter = `${nameCol}.ilike.%${q}%,slug.ilike.%${q}%`;
      try {
        const { data: rows, error } = await (supabase as any)
          .from(t.table)
          .select(t.selectCols)
          .or(orFilter)
          .limit(50)
          .abortSignal(ac.signal);
        if (ac.signal.aborted) return;
        if (error) { setSearching(false); return; }
        setData((d) => ({ ...d, [active]: ((rows as any[]) || []).map((r) => t.format(r)) }));
        setSearching(false);
      } catch {
        if (!ac.signal.aborted) setSearching(false);
      }
    }, 220);
    return () => { clearTimeout(handle); ac.abort(); };
  }, [search, active]);

  const reload = async () => {
    if (!articleId) return;
    const { data } = await (supabase as any).from("article_links").select("*").eq("article_id", articleId);
    setLinks(data || []);
  };
  useEffect(() => { reload(); }, [articleId]);

  const linkedFor = (type: string) =>
    new Set(links.filter((l) => l.entity_type === type).map((l) => l.entity_slug));

  const toggle = async (type: EntityType, id: string) => {
    const existing = links.find((l) => l.entity_type === type && l.entity_slug === id);
    if (existing) {
      await (supabase as any).from("article_links").delete().eq("id", existing.id);
    } else {
      const { error } = await (supabase as any)
        .from("article_links")
        .insert({ article_id: articleId, entity_type: type, entity_slug: id });
      if (error) return toast.error(error.message);
    }
    reload();
  };

  if (!articleId) return <p className="text-xs text-muted-foreground">Save the article first to tag entities.</p>;

  const filtered = (data[active] || []).slice(0, 200);

  const linked = linkedFor(active);

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground">
        Tag this article - appears in the linked entity's "What's New" / related sections
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {TYPES.map((t) => {
          const count = links.filter((l) => l.entity_type === t.key).length;
          return (
            <Button
              key={t.key}
              type="button"
              size="sm"
              variant={active === t.key ? "default" : "outline"}
              onClick={() => setActive(t.key)}
              className="rounded-lg h-8 text-xs gap-1"
            >
              {t.label} {count > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{count}</Badge>}
            </Button>
          );
        })}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search[active]}
          onChange={(e) => setSearch({ ...search, [active]: e.target.value })}
          placeholder={`Search ${TYPES.find((t) => t.key === active)?.label.toLowerCase()}... (server-side)`}
          className="pl-9 pr-16 h-9 text-sm rounded-lg"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">searching…</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{filtered.length} shown · {linked.size} tagged</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={async () => {
              const toAdd = filtered.filter(e => !linked.has(e.id));
              if (!toAdd.length) return;
              const rows = toAdd.map(e => ({ article_id: articleId, entity_type: active, entity_slug: e.id }));
              const { error } = await (supabase as any).from("article_links").insert(rows);
              if (error) toast.error(error.message); else { toast.success(`Tagged ${toAdd.length}`); reload(); }
            }}
          >Select all visible</button>
          <button
            type="button"
            className="text-destructive hover:underline"
            onClick={async () => {
              const ids = links.filter(l => l.entity_type === active).map(l => l.id);
              if (!ids.length) return;
              await (supabase as any).from("article_links").delete().in("id", ids);
              reload();
            }}
          >Clear {TYPES.find(t => t.key === active)?.label}</button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-card">
        {filtered.map((e) => {
          const isLinked = linked.has(e.id);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => toggle(active, e.id)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted ${isLinked ? "bg-primary/5" : ""}`}
            >
              <span className="truncate">
                <span className="font-medium text-foreground">{e.name}</span>
                {e.sub && <span className="text-muted-foreground ml-1.5">· {e.sub}</span>}
                <span className="text-muted-foreground/60 ml-1.5 text-[10px]">[{e.id}]</span>
              </span>
              {isLinked ? (
                <Badge variant="default" className="h-5 text-[10px]">Tagged</Badge>
              ) : (
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">No matches{search[active] ? ` for "${search[active]}"` : ""}</p>
            {search[active]?.trim() && active !== "study_subject" && active !== "study_chapter" && (
              <Button type="button" size="sm" variant="outline" className="rounded-lg gap-1"
                onClick={async () => {
                  const q = search[active].trim();
                  const meta = TYPES.find(t => t.key === active)!;
                  const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                  if (!slug) { toast.error("Enter a name first"); return; }
                  const nameCol = ["scholarships","articles"].includes(meta.table) ? "title" : "name";
                  const insertRow: any = { slug, [nameCol]: q };
                  if (meta.table === "articles") { insertRow.status = "Draft"; insertRow.is_active = true; }
                  const { error } = await (supabase as any).from(meta.table).insert(insertRow);
                  if (error) { toast.error(error.message); return; }
                  await (supabase as any).from("article_links")
                    .insert({ article_id: articleId, entity_type: active, entity_slug: slug });
                  toast.success(`Created "${q}" - refine details in its admin page`);
                  const { data: newRows } = await (supabase as any).from(meta.table).select(meta.selectCols).order("name").limit(2000);
                  setData({ ...data, [active]: ((newRows as any[]) || []).map((r) => meta.format(r)) });
                  reload();
                  setSearch({ ...search, [active]: "" });
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Create new {TYPES.find(t => t.key === active)?.label.replace(/s$/, "").toLowerCase()} "{search[active]}"
              </Button>
            )}
          </div>
        )}
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((l) => (
            <Badge key={l.id} variant="outline" className="gap-1">
              {l.entity_type}: {l.entity_slug.length > 24 ? l.entity_slug.slice(0, 8) + "…" : l.entity_slug}
              <button onClick={() => toggle(l.entity_type as EntityType, l.entity_slug)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
