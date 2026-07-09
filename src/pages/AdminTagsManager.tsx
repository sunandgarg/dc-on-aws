import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, X, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
/**
 * Bulk Tag Manager for articles.
 * - Filter by current tag / search.
 * - Apply or remove a tag from many selected rows in one click.
 * - Convention helper: pick a subject slug + variant (tricks/notes) to enforce naming.
 */
export default function AdminTagsManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [variant, setVariant] = useState<"" | "tricks" | "notes">("");
  const [customTag, setCustomTag] = useState("");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-articles-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id,title,slug,tags,category,is_active,created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    articles.forEach(a => (a.tags || []).forEach((t: string) => t && s.add(t)));
    return Array.from(s).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (filterTag && !(a.tags || []).includes(filterTag)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.slug.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [articles, filterTag, search]);

  const tagToApply = customTag.trim() || (subject ? `${subject}${variant ? `-${variant}` : ""}` : "");

  const bulkMut = useMutation({
    mutationFn: async ({ action }: { action: "add" | "remove" }) => {
      if (!tagToApply) throw new Error("Pick a subject (and variant) or enter a custom tag");
      if (selected.size === 0) throw new Error("Select at least one article");
      const updates = Array.from(selected).map(id => {
        const a = articles.find(x => x.id === id);
        const current: string[] = a?.tags || [];
        const next = action === "add"
          ? Array.from(new Set([...current, tagToApply]))
          : current.filter(t => t !== tagToApply);
        return supabase.from("articles").update({ tags: next }).eq("id", id);
      });
      const results = await Promise.all(updates);
      const err = results.find(r => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Tag "${tagToApply}" ${vars.action === "add" ? "added to" : "removed from"} ${selected.size} article(s)`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-articles-tags"] });
      qc.invalidateQueries({ queryKey: ["news-articles"] });
      qc.invalidateQueries({ queryKey: ["subject-news"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };

  return (
    <AdminLayout title="Article Tags Manager">
      <div className="mb-4">
        <CSVTools table="articles" filename="articles.csv" columns="*" upsertKey="slug" />
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Bulk tag editor</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Subject slug</label>
              <Input value={subject} onChange={e => setSubject(e.target.value.toLowerCase().trim())} placeholder="physics" className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Variant</label>
              <select value={variant} onChange={e => setVariant(e.target.value as any)} className="h-9 w-full border border-border rounded-md px-2 bg-background">
                <option value="">- general -</option>
                <option value="tricks">tricks → {`{subject}-tricks`}</option>
                <option value="notes">notes → {`{subject}-notes`}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Or custom tag</label>
              <Input value={customTag} onChange={e => setCustomTag(e.target.value.toLowerCase().trim())} placeholder="class-12" className="h-9" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => bulkMut.mutate({ action: "add" })} disabled={!tagToApply || selected.size === 0 || bulkMut.isPending} className="h-9 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
              <Button variant="outline" onClick={() => bulkMut.mutate({ action: "remove" })} disabled={!tagToApply || selected.size === 0 || bulkMut.isPending} className="h-9 gap-1">
                <X className="w-3.5 h-3.5" /> Remove
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Resulting tag: <span className="font-mono font-semibold text-foreground">{tagToApply || "-"}</span> · Selected: <b>{selected.size}</b>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="pl-9 h-9" />
          </div>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="h-9 border border-border rounded-md px-2 bg-background text-sm">
            <option value="">All tags ({allTags.length})</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {selected.size === filtered.length && filtered.length ? "Deselect all" : "Select all"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No articles match.</div>
          ) : (
            <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {filtered.map(a => {
                const isSel = selected.has(a.id);
                return (
                  <li key={a.id} className={`flex items-start gap-3 p-3 ${isSel ? "bg-primary/5" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => {
                        const n = new Set(selected);
                        isSel ? n.delete(a.id) : n.add(a.id);
                        setSelected(n);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground line-clamp-1">{a.title}</p>
                      <p className="text-xs text-muted-foreground">/{a.slug} · {a.category || "uncategorized"}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(a.tags || []).map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-[10px] font-mono">{t}</Badge>
                        ))}
                        {(a.tags || []).length === 0 && <span className="text-[10px] text-muted-foreground">no tags</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
