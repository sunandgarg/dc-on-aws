import { useEffect, useState } from "react";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, X } from "lucide-react";
import { ImageHint } from "@/components/ImageHint";
import { CSVTools } from "@/components/CSVTools";
import { RowDataIO } from "@/components/admin/RowDataIO";
import { RichTextEditor } from "@/components/RichTextEditor";
import { PageSummaryField } from "@/components/admin/PageSummaryField";
import { CareerCoursePicker } from "@/components/admin/CareerCoursePicker";
import { AuthorPicker } from "@/components/admin/AuthorPicker";
import { EntitySlugMultiSearch } from "@/components/admin/EntitySlugMultiSearch";
import { UploadOrUrlField } from "@/components/UploadOrUrlField";
import { useDraftState } from "@/hooks/useDraftState";

const blank = {
  slug: "", name: "", domain: "", short_description: "", description: "",
  avg_salary: "", growth: "", experience_required: "",
  top_skills: "", top_companies: "", related_courses: [] as string[], related_exams: [] as string[],
  icon_emoji: "💼", image: "", youtube_video_url: "", meta_title: "", meta_description: "", meta_keywords: "",
  is_featured: false, is_active: true, display_order: 0,
};

export default function AdminCareers() {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useDraftState<any | null>('admin.careers.editing.v1', null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("career_profiles").select("*").order("display_order");
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({ ...blank });
  const openEdit = (it: any) => setEditing({
    ...it,
    top_skills: (it.top_skills || []).join(", "),
    top_companies: (it.top_companies || []).join(", "),
    related_courses: it.related_courses || [],
    related_exams: it.related_exams || [],
  });

  const save = async () => {
    if (!editing.slug || !editing.name) return toast.error("Name and slug required");
    const payload = {
      ...editing,
      top_skills: editing.top_skills.split(",").map((s: string) => s.trim()).filter(Boolean),
      top_companies: editing.top_companies.split(",").map((s: string) => s.trim()).filter(Boolean),
      related_courses: Array.isArray(editing.related_courses) ? editing.related_courses : [],
      related_exams: Array.isArray(editing.related_exams) ? editing.related_exams : [],
    };
    const { id, ...rest } = payload;
    const { error } = id
      ? await supabase.from("career_profiles").update(rest).eq("id", id)
      : await supabase.from("career_profiles").insert(rest);
    if (error) return toast.error(error.message);

    // Sync career_course_links so courses surface this career under "Career Paths"
    try {
      const desired: string[] = payload.related_courses || [];
      const { data: existing } = await (supabase as any)
        .from("career_course_links")
        .select("id, course_slug")
        .eq("career_slug", payload.slug);
      const existingSlugs = new Set((existing || []).map((r: any) => r.course_slug));
      const toAdd = desired.filter((s) => s && !existingSlugs.has(s));
      const toRemove = (existing || []).filter((r: any) => !desired.includes(r.course_slug));
      if (toAdd.length) {
        await (supabase as any).from("career_course_links").insert(
          toAdd.map((course_slug) => ({ career_slug: payload.slug, course_slug }))
        );
      }
      if (toRemove.length) {
        await (supabase as any).from("career_course_links").delete().in("id", toRemove.map((r: any) => r.id));
      }
    } catch (e: any) {
      console.warn("career_course_links sync failed", e?.message);
    }

    toast.success("Saved"); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("career_profiles").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  return (
    <AdminLayout title="Career Profiles">
      <div className="mb-3"><AIGenerateDialog entityType="careers" table="career_profiles" /></div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{items.length} careers</p>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add Career</Button>
      </div>
      <div className="mb-4">
        <CSVTools
          table="career_profiles"
          filename="careers.csv"
          columns="*"
          typeHints={{ top_skills: "array", top_companies: "array", related_courses: "array", related_exams: "array", is_featured: "boolean", is_active: "boolean", display_order: "number" }}
          onImported={load}
        />
      </div>

      {loading ? <p>Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(it => (
            <Card key={it.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{it.icon_emoji}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{it.name}</h3>
                    <p className="text-xs text-muted-foreground">{it.domain}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button asChild size="sm" variant="ghost"><a href={`/careers/${it.slug}`} target="_blank" rel="noreferrer">Preview</a></Button>
                  <RowDataIO row={it} base="career" columns="*" />
                  <Button size="sm" variant="outline" onClick={() => openEdit(it)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editing.id ? "Edit" : "New"} Career</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Slug *</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><Label>Domain</Label><Input value={editing.domain} onChange={e => setEditing({ ...editing, domain: e.target.value })} placeholder="Technology, Finance..." /></div>
              <div><Label>Icon (emoji)</Label><Input value={editing.icon_emoji} onChange={e => setEditing({ ...editing, icon_emoji: e.target.value })} maxLength={4} /></div>
              <div><Label>Avg Salary</Label><Input value={editing.avg_salary} onChange={e => setEditing({ ...editing, avg_salary: e.target.value })} placeholder="₹6 - 25 LPA" /></div>
              <div><Label>Growth</Label><Input value={editing.growth} onChange={e => setEditing({ ...editing, growth: e.target.value })} placeholder="High (15% YoY)" /></div>
              <div><Label>Experience</Label><Input value={editing.experience_required} onChange={e => setEditing({ ...editing, experience_required: e.target.value })} placeholder="0-2 years" /></div>
              <div><Label>Display order</Label><Input type="number" value={editing.display_order} onChange={e => setEditing({ ...editing, display_order: +e.target.value })} /></div>
              <div className="md:col-span-2"><RichTextEditor label="Short description" value={editing.short_description || ""} onChange={v => setEditing({ ...editing, short_description: v })} rows={2} /></div>
              <div className="md:col-span-2"><RichTextEditor label="Long description" value={editing.description || ""} onChange={v => setEditing({ ...editing, description: v })} rows={5} /></div>
              <div className="md:col-span-2"><PageSummaryField value={editing.page_summary || ""} onChange={v => setEditing({ ...editing, page_summary: v })} /></div>
              <div className="md:col-span-2"><Label>Top skills (comma separated)</Label><Input value={editing.top_skills} onChange={e => setEditing({ ...editing, top_skills: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Top companies (comma separated)</Label><Input value={editing.top_companies} onChange={e => setEditing({ ...editing, top_companies: e.target.value })} /></div>
              <div className="md:col-span-2">
                <EntitySlugMultiSearch kind="course" label="Related courses (search & link)"
                  value={editing.related_courses || []}
                  onChange={(v) => setEditing({ ...editing, related_courses: v })} />
              </div>
              <div className="md:col-span-2">
                <EntitySlugMultiSearch kind="exam" label="Related exams (search & link)"
                  value={editing.related_exams || []}
                  onChange={(v) => setEditing({ ...editing, related_exams: v })} />
              </div>
              <div className="md:col-span-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-primary mb-2">⚡ Two-way link: tag this career on courses (appears on course → "Career Paths")</p>
                <CareerCoursePicker careerSlug={editing.slug} />
              </div>
              <div className="md:col-span-2">
                <Label>Career avatar / hero image</Label>
                <UploadOrUrlField label="" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} folder="careers" preset="article" />
                <p className="text-xs text-muted-foreground mt-1">Upload a square avatar (recommended 400x400) - shown on listings, hero, and "Career Paths" carousels. Falls back to the default 3D avatar.</p>
              </div>

              <div className="md:col-span-2">
                <Label>YouTube Video URL</Label>
                <Input value={editing.youtube_video_url || ""} onChange={e => setEditing({ ...editing, youtube_video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div><Label>Meta title</Label><Input value={editing.meta_title} onChange={e => setEditing({ ...editing, meta_title: e.target.value })} maxLength={60} /></div>
              <div><Label>Meta description</Label><Input value={editing.meta_description} onChange={e => setEditing({ ...editing, meta_description: e.target.value })} maxLength={160} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_featured} onCheckedChange={v => setEditing({ ...editing, is_featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              <div className="md:col-span-2"><AuthorPicker value={editing.author_id} onChange={(v) => setEditing({ ...editing, author_id: v })} label="Author profile (byline)" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6 sticky bottom-0 bg-card pt-3 border-t">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}><Save className="w-4 h-4 mr-1" />Save</Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
