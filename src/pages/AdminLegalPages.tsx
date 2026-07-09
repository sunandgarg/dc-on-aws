import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Plus, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { RichTextEditor } from "@/components/RichTextEditor";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  is_active: boolean;
  updated_at: string;
}

export default function AdminLegalPages() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [selectedId, setSelectedId] = useDraftState<string | null>('admin.legal-pages.selectedId.v1', null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("legal_pages").select("*").order("title");
    setPages((data || []) as LegalPage[]);
    if (data?.length && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const selected = pages.find(p => p.id === selectedId);

  const updateField = (field: keyof LegalPage, value: any) => {
    setPages(prev => prev.map(p => p.id === selectedId ? { ...p, [field]: value } : p));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("legal_pages").update({
      title: selected.title, slug: selected.slug, content: selected.content,
      meta_title: selected.meta_title, meta_description: selected.meta_description,
      is_active: selected.is_active,
    }).eq("id", selected.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const create = async () => {
    const slug = prompt("URL slug (e.g. shipping-policy):");
    if (!slug) return;
    const { data, error } = await supabase.from("legal_pages").insert({
      slug, title: slug.replace(/-/g, " "), content: "", meta_title: "", meta_description: "",
    }).select().single();
    if (error) return toast.error(error.message);
    setPages(prev => [...prev, data as LegalPage]);
    setSelectedId(data!.id);
  };

  const remove = async () => {
    if (!selected || !confirm(`Delete "${selected.title}"?`)) return;
    const { error } = await supabase.from("legal_pages").delete().eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setSelectedId(null);
    load();
  };

  return (
    <AdminLayout title="Legal Pages">
      <div className="mb-4">
        <CSVTools table="legal_pages" filename="legal_pages.csv" columns="*" upsertKey="slug" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <Card className="p-3 h-fit">
          <Button onClick={create} size="sm" className="w-full mb-3"><Plus className="w-4 h-4 mr-1" />New page</Button>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <ul className="space-y-1">
              {pages.map(p => (
                <li key={p.id}>
                  <button onClick={() => setSelectedId(p.id)} className={`w-full text-left px-3 py-2 rounded text-sm ${selectedId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {p.title} {!p.is_active && <span className="text-xs opacity-60">(off)</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch checked={selected.is_active} onCheckedChange={v => updateField("is_active", v)} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm"><Link to={`/legal/${selected.slug}`} target="_blank"><ExternalLink className="w-4 h-4 mr-1" />Preview</Link></Button>
                <Button onClick={remove} variant="destructive" size="sm"><Trash2 className="w-4 h-4" /></Button>
                <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Title</Label><Input value={selected.title} onChange={e => updateField("title", e.target.value)} /></div>
              <div><Label>URL slug</Label><Input value={selected.slug} onChange={e => updateField("slug", e.target.value)} /></div>
              <div><Label>Meta title (SEO)</Label><Input value={selected.meta_title} onChange={e => updateField("meta_title", e.target.value)} maxLength={60} /></div>
              <div><Label>Meta description (SEO)</Label><Input value={selected.meta_description} onChange={e => updateField("meta_description", e.target.value)} maxLength={160} /></div>
            </div>
            <div>
              <RichTextEditor label="Content (HTML / Markdown)" value={selected.content || ""} onChange={(v) => updateField("content", v)} rows={20} />
              <p className="text-xs text-muted-foreground mt-1">Use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;&lt;li&gt; or markdown.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-10 text-center text-muted-foreground">Select a page to edit</Card>
        )}
      </div>
    </AdminLayout>
  );
}
