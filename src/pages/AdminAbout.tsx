import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

import { CSVTools } from "@/components/CSVTools";
const s: any = supabase;

function PageEditor() {
  const [page, setPage] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    s.from("about_page").select("*").maybeSingle().then(({ data }: any) => setPage(data || {}));
  }, []);

  const save = async () => {
    setLoading(true);
    const payload = { ...page, updated_at: new Date().toISOString() };
    const { error } = page.id
      ? await s.from("about_page").update(payload).eq("id", page.id)
      : await s.from("about_page").insert(payload).select().single().then((r: any) => { if (r.data) setPage(r.data); return r; });
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const F = (k: string, label: string, type: "input" | "textarea" = "input") => (
    <div>
      <Label>{label}</Label>
      {type === "input"
        ? <Input value={page[k] || ""} onChange={(e) => setPage({ ...page, [k]: e.target.value })} />
        : <Textarea value={page[k] || ""} onChange={(e) => setPage({ ...page, [k]: e.target.value })} rows={5} />}
    </div>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      {F("hero_eyebrow", "Hero Eyebrow")}
      {F("hero_title", "Hero Title")}
      {F("hero_subtitle", "Hero Subtitle", "textarea")}
      {F("hero_image", "Hero Image URL")}
      {F("mission", "Mission", "textarea")}
      {F("vision", "Vision", "textarea")}
      {F("story", "Our Story", "textarea")}
      {F("story_image", "Story Image URL")}
      {F("cta_title", "CTA Title")}
      {F("cta_subtitle", "CTA Subtitle", "textarea")}
      {F("meta_title", "SEO Meta Title")}
      {F("meta_description", "SEO Meta Description", "textarea")}
      <Button onClick={save} disabled={loading}><Save className="w-4 h-4 mr-2" />Save Page</Button>
    </div>
  );
}

interface ListEditorProps {
  table: string;
  fields: { key: string; label: string; type?: "input" | "textarea" }[];
  defaults?: Record<string, any>;
}

function ListEditor({ table, fields, defaults = {} }: ListEditorProps) {
  const [rows, setRows] = useState<any[]>([]);

  const load = () => s.from(table).select("*").order("display_order").then(({ data }: any) => setRows(data || []));
  useEffect(() => { load(); }, []);

  const add = async () => {
    const { data, error } = await s.from(table).insert({ ...defaults, display_order: rows.length, is_active: true }).select().single();
    if (error) return toast.error(error.message);
    setRows([...rows, data]);
  };

  const update = (id: string, patch: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const save = async (row: any) => {
    const { id, created_at, ...rest } = row;
    const { error } = await s.from(table).update(rest).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await s.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows(rows.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <Button onClick={add} size="sm"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
      {rows.map(row => (
        <div key={row.id} className="border border-border rounded-lg p-4 space-y-3 bg-card">
          <div className="grid md:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                <Label>{f.label}</Label>
                {f.type === "textarea"
                  ? <Textarea value={row[f.key] || ""} onChange={(e) => update(row.id, { [f.key]: e.target.value })} rows={3} />
                  : <Input value={row[f.key] || ""} onChange={(e) => update(row.id, { [f.key]: e.target.value })} />}
              </div>
            ))}
            <div>
              <Label>Display Order</Label>
              <Input type="number" value={row.display_order ?? 0} onChange={(e) => update(row.id, { display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={!!row.is_active} onCheckedChange={(v) => update(row.id, { is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save(row)}><Save className="w-3 h-3 mr-1" />Save</Button>
            <Button size="sm" variant="destructive" onClick={() => remove(row.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
    </div>
  );
}

export default function AdminAbout() {
  return (
    <AdminLayout title="About Us">
      <div className="mb-4">
        <CSVTools table="about_page" filename="about_page.csv" columns="*" upsertKey="id" />
      </div>

      <Tabs defaultValue="page">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="page">Page</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
          <TabsTrigger value="founders">Founders</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="press">Press</TabsTrigger>
        </TabsList>

        <TabsContent value="page" className="mt-6"><PageEditor /></TabsContent>
        <TabsContent value="stats" className="mt-6">
          <ListEditor table="about_stats" fields={[
            { key: "label", label: "Label" },
            { key: "value", label: "Value" },
            { key: "icon_emoji", label: "Icon (emoji)" },
            { key: "description", label: "Description", type: "textarea" },
          ]} />
        </TabsContent>
        <TabsContent value="values" className="mt-6">
          <ListEditor table="about_values" fields={[
            { key: "title", label: "Title" },
            { key: "icon_emoji", label: "Icon (emoji)" },
            { key: "description", label: "Description", type: "textarea" },
          ]} />
        </TabsContent>
        <TabsContent value="founders" className="mt-6">
          <ListEditor table="about_founders" fields={[
            { key: "name", label: "Name" },
            { key: "title", label: "Title" },
            { key: "photo", label: "Photo URL" },
            { key: "linkedin_url", label: "LinkedIn URL" },
            { key: "twitter_url", label: "Twitter URL" },
            { key: "bio", label: "Bio", type: "textarea" },
          ]} />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <ListEditor table="about_team" fields={[
            { key: "name", label: "Name" },
            { key: "role", label: "Role" },
            { key: "department", label: "Department" },
            { key: "photo", label: "Photo URL" },
            { key: "linkedin_url", label: "LinkedIn URL" },
          ]} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-6">
          <ListEditor table="about_milestones" fields={[
            { key: "year", label: "Year" },
            { key: "title", label: "Title" },
            { key: "description", label: "Description", type: "textarea" },
          ]} />
        </TabsContent>
        <TabsContent value="press" className="mt-6">
          <ListEditor table="about_press" fields={[
            { key: "outlet", label: "Outlet" },
            { key: "headline", label: "Headline" },
            { key: "url", label: "URL" },
            { key: "logo", label: "Logo URL" },
            { key: "published_on", label: "Published On" },
          ]} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
