import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Briefcase, Search } from "lucide-react";
import { slugify } from "@/lib/slugify";

interface Job {
  id: string;
  slug: string;
  title: string;
  company: string;
  company_logo?: string | null;
  location?: string | null;
  job_type?: string | null;
  experience?: string | null;
  salary?: string | null;
  category?: string | null;
  short_description?: string | null;
  description?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
  skills?: string[] | null;
  apply_url?: string | null;
  apply_email?: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_remote: boolean;
  display_order: number;
  posted_at: string;
  expires_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
}

const empty: Partial<Job> = {
  title: "", company: "", slug: "", location: "", job_type: "Full-time",
  experience: "", salary: "", category: "", short_description: "", description: "",
  requirements: "", responsibilities: "", skills: [], apply_url: "", apply_email: "",
  is_active: true, is_featured: false, is_remote: false, display_order: 0,
};

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Job>>(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("jobs" as any).select("*").order("posted_at", { ascending: false });
    if (error) toast.error(error.message);
    setJobs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onEdit = (j: Job) => { setForm(j); setOpen(true); };
  const onNew = () => { setForm(empty); setOpen(true); };

  const onSave = async () => {
    if (!form.title || !form.company) { toast.error("Title & company required"); return; }
    const payload: any = {
      ...form,
      slug: form.slug?.trim() || slugify(form.title!),
      skills: typeof form.skills === "string" ? (form.skills as any).split(",").map((s: string) => s.trim()).filter(Boolean) : (form.skills || []),
    };
    delete payload.id;
    const op = (form as any).id
      ? supabase.from("jobs" as any).update(payload).eq("id", (form as any).id)
      : supabase.from("jobs" as any).insert(payload);
    const { error } = await op;
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    const { error } = await supabase.from("jobs" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted"); load();
  };

  const filtered = jobs.filter(j => !q || [j.title, j.company, j.location, j.category].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminLayout title="Vacancies">
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Vacancies</h1>
            <Badge variant="secondary">{jobs.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." className="pl-8 w-64" />
            </div>
            <Button onClick={onNew} className="gap-1"><Plus className="w-4 h-4" /> New Vacancy</Button>
          </div>
        </div>

        {loading ? <p>Loading...</p> : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No vacancies yet. Click "New Vacancy" to add one.</Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(j => (
              <Card key={j.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{j.title}</h3>
                    {!j.is_active && <Badge variant="outline">Inactive</Badge>}
                    {j.is_featured && <Badge>Featured</Badge>}
                    {j.is_remote && <Badge variant="secondary">Remote</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{j.company} • {j.location || "-"} • {j.job_type}</p>
                  <p className="text-xs text-muted-foreground mt-1">/vacancies/{j.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(j)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete(j.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{(form as any).id ? "Edit Vacancy" : "New Vacancy"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Title *</Label><Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Company *</Label><Input value={form.company || ""} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={form.slug || ""} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" /></div>
                <div><Label>Company Logo URL</Label><Input value={form.company_logo || ""} onChange={e => setForm({ ...form, company_logo: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Bangalore, IN" /></div>
                <div><Label>Job Type</Label><Input value={form.job_type || ""} onChange={e => setForm({ ...form, job_type: e.target.value })} placeholder="Full-time / Internship" /></div>
                <div><Label>Experience</Label><Input value={form.experience || ""} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="0-2 years" /></div>
                <div><Label>Salary</Label><Input value={form.salary || ""} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="₹6-12 LPA" /></div>
                <div><Label>Category</Label><Input value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Engineering" /></div>
                <div><Label>Apply URL</Label><Input value={form.apply_url || ""} onChange={e => setForm({ ...form, apply_url: e.target.value })} /></div>
                <div><Label>Apply Email</Label><Input value={form.apply_email || ""} onChange={e => setForm({ ...form, apply_email: e.target.value })} /></div>
                <div><Label>Display Order</Label><Input type="number" value={form.display_order ?? 0} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Short Description</Label><Textarea rows={2} value={form.short_description || ""} onChange={e => setForm({ ...form, short_description: e.target.value })} /></div>
              <div><Label>Full Description (HTML allowed)</Label><Textarea rows={5} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Responsibilities</Label><Textarea rows={3} value={form.responsibilities || ""} onChange={e => setForm({ ...form, responsibilities: e.target.value })} /></div>
              <div><Label>Requirements</Label><Textarea rows={3} value={form.requirements || ""} onChange={e => setForm({ ...form, requirements: e.target.value })} /></div>
              <div><Label>Skills (comma separated)</Label><Input value={Array.isArray(form.skills) ? form.skills.join(", ") : (form.skills || "")} onChange={e => setForm({ ...form, skills: e.target.value as any })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} /><Label>Featured</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!form.is_remote} onCheckedChange={v => setForm({ ...form, is_remote: v })} /><Label>Remote</Label></div>
              </div>
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs text-muted-foreground font-semibold">SEO</p>
                <div><Label>Meta Title</Label><Input value={form.meta_title || ""} onChange={e => setForm({ ...form, meta_title: e.target.value })} /></div>
                <div><Label>Meta Description</Label><Textarea rows={2} value={form.meta_description || ""} onChange={e => setForm({ ...form, meta_description: e.target.value })} /></div>
                <div><Label>Meta Keywords</Label><Input value={form.meta_keywords || ""} onChange={e => setForm({ ...form, meta_keywords: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={onSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
