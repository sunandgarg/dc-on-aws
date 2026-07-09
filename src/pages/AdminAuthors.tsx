import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, UserCheck, ExternalLink } from "lucide-react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ArrayFieldEditor } from "@/components/ArrayFieldEditor";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { slugify } from "@/lib/slugify";
import { UserPicker } from "@/components/admin/UserPicker";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
interface Author {
  id?: string;
  slug: string;
  name: string;
  designation: string;
  photo: string;
  short_bio: string;
  bio: string;
  expertise: string[];
  email: string;
  linkedin_url: string;
  twitter_url: string;
  website_url: string;
  display_order: number;
  is_active: boolean;
  user_id?: string | null;
}

const empty: Author = {
  slug: "", name: "", designation: "", photo: "", short_bio: "", bio: "", expertise: [],
  email: "", linkedin_url: "", twitter_url: "", website_url: "", display_order: 0, is_active: true,
  user_id: null,
};

export default function AdminAuthors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [editing, setEditing] = useDraftState<Author | null>('admin.authors.editing.v1', null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("authors").select("*").order("display_order");
    setAuthors((data as Author[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name) { toast.error("Name required"); return; }
    const payload = { ...editing, slug: editing.slug || slugify(editing.name) };
    const { error } = editing.id
      ? await (supabase as any).from("authors").update(payload).eq("id", editing.id)
      : await (supabase as any).from("authors").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this author? Linked content will keep existing entries but show no author.")) return;
    const { error } = await (supabase as any).from("authors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <AdminLayout title="Authors / Team">
      <div className="mb-4">
        <CSVTools table="authors" filename="authors.csv" columns="*" upsertKey="slug" />
      </div>

      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">Editorial bylines visible across articles, colleges, courses, exams, scholarships, careers and study material.</p>
        <Button onClick={() => setEditing({ ...empty })} className="gap-2"><Plus className="w-4 h-4" /> Add Author</Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {authors.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-2xl p-4 flex gap-3">
              {a.photo ? (
                <img src={a.photo} alt={a.name} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><UserCheck className="w-6 h-6 text-primary" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground truncate">{a.designation}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.short_bio}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Link to={`/author/${a.slug}`} target="_blank" className="text-xs text-primary inline-flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" /> View</Link>
                  {a.user_id && (
                    <Link to={`/dashboard?tab=profile`} target="_blank" title="User can manage their profile in dashboard" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">· Dashboard</Link>
                  )}
                  <Button variant="ghost" size="icon" className="w-7 h-7 ml-auto" onClick={() => setEditing({ ...a })}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => remove(a.id!)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
          {authors.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">No authors yet - add your first byline.</div>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" /> {editing?.id ? "Edit" : "Add"} Author</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <UserPicker
                  value={editing.user_id}
                  onChange={(uid, p) => setEditing({
                    ...editing,
                    user_id: uid,
                    name: editing.name || p?.display_name || "",
                    email: editing.email || p?.email || "",
                  })}
                  label="Link to existing user account (optional)"
                />
                {editing.user_id && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>That user can update their author profile from</span>
                    <Link to="/dashboard?tab=profile" target="_blank" className="text-primary hover:underline">their dashboard</Link>
                    <span>or you can edit it here.</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Name *</label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Slug</label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto from name" /></div>
                <div><label className="text-xs text-muted-foreground">Designation</label><Input value={editing.designation} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} placeholder="Senior Counsellor" /></div>
                <div><label className="text-xs text-muted-foreground">Email</label><Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">LinkedIn URL</label><Input value={editing.linkedin_url} onChange={(e) => setEditing({ ...editing, linkedin_url: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Twitter URL</label><Input value={editing.twitter_url} onChange={(e) => setEditing({ ...editing, twitter_url: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Website URL</label><Input value={editing.website_url} onChange={(e) => setEditing({ ...editing, website_url: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Display Order</label><Input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) || 0 })} /></div>
              </div>
              <ImageUploadField label="Profile Photo" value={editing.photo} onChange={(v) => setEditing({ ...editing, photo: v })} folder="authors" preset="article" />
              <div><label className="text-xs text-muted-foreground">Short Bio (1-2 lines, shown next to byline)</label>
                <textarea value={editing.short_bio} onChange={(e) => setEditing({ ...editing, short_bio: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
              </div>
              <ArrayFieldEditor label="Expertise tags" values={editing.expertise} onChange={(v) => setEditing({ ...editing, expertise: v })} placeholder="Engineering, JEE…" />
              <RichTextEditor label="Full Bio" value={editing.bio} onChange={(v) => setEditing({ ...editing, bio: v })} rows={6} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
