import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

interface LinkRow { id: string; entity_type: string; entity_slug: string; }

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: "college", label: "College" },
  { value: "course", label: "Course" },
  { value: "exam", label: "Exam" },
  { value: "scholarship", label: "Scholarship" },
  { value: "career", label: "Career" },
  { value: "subject", label: "Subject" },
  { value: "board", label: "Board" },
  { value: "chapter", label: "Chapter" },
  { value: "study_material", label: "Study Material" },
  { value: "article", label: "Article" },
];

interface Props {
  /** Generic linker - works for any owner row (article OR study_material). */
  ownerId: string;
  /** Column name on article_links that stores the owner id. Defaults to article_id for backward compat. */
  ownerColumn?: string;
  label?: string;
  emptyHint?: string;
}

export function ArticleLinksEditor({
  ownerId,
  ownerColumn = "article_id",
  label = "Tag this article to entities (shown on detail pages)",
  emptyHint = "Save the article first to add entity tags.",
}: Props) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [type, setType] = useState("college");
  const [slug, setSlug] = useState("");
  const [bulk, setBulk] = useState("");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("article_links").select("*").eq(ownerColumn, ownerId);
    setLinks(data || []);
  };
  useEffect(() => { if (ownerId) load(); /* eslint-disable-next-line */ }, [ownerId]);

  const addOne = async (entitySlug: string) => {
    const s = entitySlug.trim().toLowerCase();
    if (!s) return;
    if (links.some(l => l.entity_type === type && l.entity_slug === s)) return;
    const payload: Record<string, any> = { [ownerColumn]: ownerId, entity_type: type, entity_slug: s };
    const { error } = await (supabase as any).from("article_links").insert(payload);
    if (error) toast.error(error.message);
  };

  const addAll = async () => {
    const items = (slug ? [slug] : []).concat(bulk.split(/[,\n]/));
    const cleaned = Array.from(new Set(items.map(s => s.trim().toLowerCase()).filter(Boolean)));
    if (!cleaned.length) return;
    for (const s of cleaned) await addOne(s);
    setSlug(""); setBulk("");
    load();
    toast.success(`Linked ${cleaned.length} ${type}${cleaned.length > 1 ? "s" : ""}`);
  };

  const remove = async (id: string) => {
    await (supabase as any).from("article_links").delete().eq("id", id);
    load();
  };

  if (!ownerId) return <p className="text-xs text-muted-foreground">{emptyHint}</p>;

  // Group existing links by entity_type for cleaner display
  const grouped = links.reduce<Record<string, LinkRow[]>>((acc, l) => {
    (acc[l.entity_type] ||= []).push(l); return acc;
  }, {});

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="h-9 px-2 rounded-lg border border-input bg-background text-sm"
        >
          {ENTITY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Input
          value={slug}
          onChange={e => setSlug(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAll(); } }}
          placeholder="entity slug (e.g. iit-delhi)"
          className="rounded-lg flex-1 min-w-[180px]"
        />
        <Button size="sm" onClick={addAll} className="rounded-lg gap-1">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Bulk add - paste multiple slugs (comma or newline separated)</summary>
        <textarea
          value={bulk}
          onChange={e => setBulk(e.target.value)}
          rows={3}
          placeholder="iit-delhi, iit-bombay&#10;nit-trichy"
          className="w-full mt-2 px-2 py-1.5 rounded-lg border border-input bg-background text-sm font-mono"
        />
        <Button size="sm" variant="outline" onClick={addAll} className="mt-1.5 rounded-lg">Add bulk</Button>
      </details>

      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-2">
          {Object.entries(grouped).map(([t, rows]) => (
            <div key={t}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                {ENTITY_TYPES.find(e => e.value === t)?.label || t} ({rows.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rows.map(l => (
                  <Badge key={l.id} variant="outline" className="gap-1 pr-1">
                    {l.entity_slug}
                    <button
                      type="button"
                      onClick={() => remove(l.id)}
                      className="hover:bg-destructive/10 rounded p-0.5"
                      aria-label={`Remove ${l.entity_slug}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No links yet. Add one above.</p>
      )}
    </div>
  );
}
