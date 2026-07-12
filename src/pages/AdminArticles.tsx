import { PermGate } from "@/components/PermGate";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { BlogStudioDialog } from "@/components/admin/BlogStudioDialog";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAllDbArticles, useSaveArticle, useDeleteArticle, type DbArticle } from "@/hooks/useArticlesData";
import { AdminFormSection } from "@/components/AdminFormSection";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ArrayFieldEditor } from "@/components/ArrayFieldEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Newspaper, Info, FileText, Settings, ExternalLink, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { CSVTools } from "@/components/CSVTools";
import { useAuth } from "@/hooks/useAuth";
import { EntityMultiPicker } from "@/components/admin/EntityMultiPicker";
import { StudyMaterialQuickTagger } from "@/components/admin/StudyMaterialQuickTagger";
import { ArticleLinksEditor } from "@/components/admin/ArticleLinksEditor";
import { LinksSummary } from "@/components/admin/LinksSummary";
import { CollegeStudyTagger } from "@/components/admin/CollegeStudyTagger";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link2 } from "lucide-react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { AuthorPicker } from "@/components/admin/AuthorPicker";
import { BulkEditToggle } from "@/components/admin/BulkEditToggle";
import { FeaturedRankPicker } from "@/components/admin/FeaturedRankPicker";
import { FeaturedRankPanel } from "@/components/admin/FeaturedRankPanel";
import { FaqInlineEditor } from "@/components/admin/FaqInlineEditor";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useDraftState } from "@/hooks/useDraftState";

const STATUSES = ["Draft", "Published"];
const VERTICALS = ["Engineering", "Medical", "Management", "Law", "Design", "Science", "General"];

function useArticleCategories() {
  return useQuery({
    queryKey: ["article_categories"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("article_categories")
        .select("slug, name, display_order, is_active")
        .eq("is_active", true)
        .order("display_order");
      return (data || []) as { slug: string; name: string }[];
    },
  });
}

const emptyArticle: Partial<DbArticle> = {
  slug: "", title: "", description: "", content: "", vertical: "", category: "", author: "",
  featured_image: "", views: 0, tags: [], meta_title: "", meta_description: "", meta_keywords: "",
  is_active: true, status: "Draft",
};

export default function AdminArticles() {
  const { data: articles, isLoading, refetch: refetchArticles } = useAllDbArticles();
  const { data: CATEGORIES = [] } = useArticleCategories();
  const saveArticle = useSaveArticle();
  const deleteArticle = useDeleteArticle();
  const [editing, setEditing] = useDraftState<Partial<DbArticle> | null>('admin.articles.editing.v1', null);
  const [search, setSearch] = useState("");

  const filtered = (articles ?? []).filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) || a.slug.toLowerCase().includes(search.toLowerCase())
  );

  const { can, isAdmin } = useAuth();
  const canPublish = isAdmin || can("articles", "publish") || can("articles", "edit");

  const handleSave = () => {
    if (!editing?.slug || !editing?.title) { toast.error("Slug and Title required"); return; }
    if (editing.status === "Published" && !canPublish) {
      toast.error("You don't have permission to publish. Save as Draft - an editor will review it.");
      return;
    }
    const desiredRank = (editing as any).featured_rank ?? null;
    const { featured_rank: _omit, ...payload } = editing as any;
    saveArticle.mutate(payload, {
      onSuccess: async () => {
        let id = (editing as any).id;
        if (!id && editing.slug) {
          const { data: row } = await supabase.from("articles").select("id").eq("slug", editing.slug).maybeSingle();
          id = row?.id;
        }
        if (id) {
          const { error } = await (supabase as any).rpc("set_featured_rank", { _table: "articles", _id: id, _rank: desiredRank });
          if (error) toast.error(`Featured: ${error.message}`);
        }
        setEditing(null);
      },
    });
  };

  const update = (field: string, value: any) => setEditing((prev) => prev ? { ...prev, [field]: value } : prev);

  return (
    <AdminLayout title="Articles Manager">
      <div className="mb-3 flex flex-wrap gap-2"><BlogStudioDialog onSaved={() => { void refetchArticles(); }} /><AIGenerateDialog entityType="articles" table="articles" /></div>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..." className="pl-10 rounded-xl h-10" />
        </div>
        <Button onClick={() => setEditing({ ...emptyArticle })} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Article
        </Button>
        <BulkEditToggle
          table="articles"
          searchKeys={["title","slug","author","category"]}
          columns={[
            { key: "title", label: "Title", width: 240 },
            { key: "slug", label: "Slug", width: 180 },
            { key: "category", label: "Category", width: 120 },
            { key: "author", label: "Author", width: 120 },
            { key: "status", label: "Status", type: "select", options: ["Draft","Published"], width: 110 },
            { key: "is_active", label: "Active", type: "boolean", width: 80 },
            { key: "views", label: "Views", type: "number", width: 80 },
          ]}
        />
      </div>

      <div className="mb-4">
        <CSVTools
          table="articles"
          filename="articles.csv"
          columns="*"
          typeHints={{ tags: "array", views: "number", is_active: "boolean" }}
          onImported={() => { void refetchArticles(); }}
        />
      </div>

      <FeaturedRankPanel table="articles" detailPath={(slug) => `/news/${slug}`} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              {a.featured_image && <img src={a.featured_image} alt={a.title} className="w-16 h-10 rounded-lg object-cover hidden sm:block" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{a.title}</span>
                  {a.category && <Badge variant="outline" className="text-[10px]">{a.category}</Badge>}
                  <Badge variant={a.status === "Published" ? "default" : "secondary"} className="text-[10px]">{a.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{a.author} • {a.views} views • {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                <a href={`/articles/${a.slug}`} target="_blank" rel="noopener noreferrer" title="Open public page" className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-primary"><ExternalLink className="w-3.5 h-3.5" /></a>
                <Button variant="ghost" size="icon" onClick={() => setEditing({ ...a })} className="w-8 h-8"><Pencil className="w-3.5 h-3.5" /></Button>
                <PermGate module="articles" action="delete"><Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteArticle.mutate(a.id); }} className="w-8 h-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></PermGate>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No articles found</div>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Newspaper className="w-5 h-5" /> {editing?.id ? "Edit" : "Add"} Article</DialogTitle>
          </DialogHeader>
          {editing?.id && <LinksSummary articleId={editing.id as string} tags={editing.tags || []} />}
          {editing && (
            <div className="space-y-4">
              {/* ── Basic Info ── */}
              <AdminFormSection title="Basic Information" icon={<Info className="w-4 h-4 text-primary" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <select value={editing.status || "Draft"} onChange={(e) => update("status", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {STATUSES.map((s) => (
                        <option key={s} value={s} disabled={s === "Published" && !canPublish}>
                          {s}{s === "Published" && !canPublish ? " (no permission)" : ""}
                        </option>
                      ))}
                    </select>
                    {!canPublish && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">You can save drafts. A manager can publish.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <select value={editing.category || ""} onChange={(e) => update("category", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      <option value="">Select</option>
                      {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
                    </select>
                    <Link to="/admin/article-categories" className="text-[10px] text-primary hover:underline">+ Manage categories</Link>
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Author (legacy text)</label><Input value={editing.author || ""} onChange={(e) => update("author", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div><AuthorPicker value={(editing as any).author_id} onChange={(v) => update("author_id" as any, v)} label="Author profile (byline)" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Title *</label><Input value={editing.title || ""} onChange={(e) => update("title", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><Input value={editing.slug || ""} onChange={(e) => update("slug", e.target.value)} placeholder="my-article-slug" className="rounded-lg h-9 text-sm" /></div>
                  <div className="sm:col-span-2"><ImageUploadField label="Featured Image" value={editing.featured_image || ""} onChange={(v) => update("featured_image", v)} preset="article" folder="article-images" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Views</label><Input type="number" value={editing.views ?? 0} onChange={(e) => update("views", parseInt(e.target.value) || 0)} className="rounded-lg h-9 text-sm" /></div>
                  <div className="sm:col-span-2 lg:col-span-3"><FeaturedRankPicker value={(editing as any).featured_rank} onChange={(v) => update("featured_rank" as any, v)} label="Pin to News page top" maxSlots={5} slotLabel={(r) => `#${r}${r === 1 ? " (Big Hero)" : ` (Small ${r - 1})`}`} helpText="#1 = big hero card on /news. #2-5 = the four small cards beside it. Picking a slot pushes existing pinned items down; anything beyond #5 unpins automatically." /></div>
                </div>
                <RichTextEditor label="Description *" value={editing.description || ""} onChange={(v) => update("description", v)} rows={3} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => update("is_active", e.target.checked)} className="rounded" />
                  <label className="text-sm text-foreground">Active</label>
                </div>
              </AdminFormSection>

              {/* ── Content ── */}
              <AdminFormSection title="Content" icon={<FileText className="w-4 h-4 text-primary" />}>
                <RichTextEditor label="Article Content" value={editing.content || ""} onChange={(v) => update("content", v)} rows={12} />
              </AdminFormSection>

              {/* ── Links (multi-category) ── */}
              <AdminFormSection title="Links - tag this article to colleges, courses, exams, news, careers, scholarships & study material" icon={<Link2 className="w-4 h-4 text-primary" />}>
                <ArrayFieldEditor label="Free-form Tags" values={editing.tags || []} onChange={(v) => update("tags", v)} placeholder="Add tag..." />
                {editing.id ? (
                  <Tabs defaultValue="entities" className="mt-4">
                    <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl">
                      <TabsTrigger value="entities" className="rounded-lg text-xs">Colleges / Courses / Exams / News / Careers / Scholarships</TabsTrigger>
                      <TabsTrigger value="study" className="rounded-lg text-xs">Study Material (School)</TabsTrigger>
                      <TabsTrigger value="college-study" className="rounded-lg text-xs">College Study Material</TabsTrigger>
                      <TabsTrigger value="saved" className="rounded-lg text-xs">All Saved Links</TabsTrigger>
                    </TabsList>
                    <TabsContent value="entities" className="mt-3">
                      <EntityMultiPicker articleId={editing.id} />
                    </TabsContent>
                    <TabsContent value="study" className="mt-3">
                      <StudyMaterialQuickTagger tags={editing.tags || []} onChange={(v) => update("tags", v)} articleId={editing.id as string} />
                    </TabsContent>
                    <TabsContent value="college-study" className="mt-3">
                      <CollegeStudyTagger articleId={editing.id as string} onDone={() => setEditing(null)} />
                    </TabsContent>
                    <TabsContent value="saved" className="mt-3">
                      <ArticleLinksEditor ownerId={editing.id as string} label="All saved links for this article (add/remove any entity by slug)" />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">💡 Save a draft to start tagging colleges, courses, exams, news, careers, scholarships and study material.</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="self-start rounded-lg"
                      disabled={!editing.slug || !editing.title || saveArticle.isPending}
                      onClick={async () => {
                        if (!editing.slug || !editing.title) { toast.error("Add Title and Slug first"); return; }
                        const payload = { ...editing, status: editing.status || "Draft" } as any;
                        const { data, error } = await supabase
                          .from("articles")
                          .upsert(payload, { onConflict: "slug" })
                          .select()
                          .single();
                        if (error) { toast.error(error.message); return; }
                        setEditing({ ...(data as any) });
                        toast.success("Draft saved - you can now tag entities");
                      }}
                    >
                      {saveArticle.isPending ? "Saving…" : "Save Draft to Enable Tagging"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">(Requires Title + Slug above)</p>
                  </div>
                )}
              </AdminFormSection>

              {/* ── FAQs ── */}
              <AdminFormSection title="FAQs (shown on article page)" icon={<HelpCircle className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <FaqInlineEditor page="articles" itemSlug={editing.slug || ""} itemName={editing.title} />
              </AdminFormSection>

              {/* ── SEO ── */}
              <AdminFormSection title="SEO" icon={<Search className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Meta Title</label><Input value={editing.meta_title || ""} onChange={(e) => update("meta_title", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Meta Keywords</label><Input value={editing.meta_keywords || ""} onChange={(e) => update("meta_keywords", e.target.value)} placeholder="Comma separated" className="rounded-lg h-9 text-sm" /></div>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Meta Description</label>
                  <textarea value={editing.meta_description || ""} onChange={(e) => update("meta_description", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-none" />
                </div>
              </AdminFormSection>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSave} disabled={saveArticle.isPending} className="rounded-xl">
                  {saveArticle.isPending ? "Saving..." : "Save Article"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
