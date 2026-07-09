import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Mail, Phone, ExternalLink, Trash2, FileText, Inbox } from "lucide-react";

const STATUSES = ["new", "shortlisted", "interview", "offered", "hired", "rejected"];

export default function AdminJobApplications() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("job_applications" as any).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setApps((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("job_applications" as any).update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setApps(a => a.map(x => x.id === id ? { ...x, status } : x));
    if (open?.id === id) setOpen({ ...open, status });
  };

  const saveNotes = async (id: string, admin_notes: string) => {
    const { error } = await supabase.from("job_applications" as any).update({ admin_notes }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    const { error } = await supabase.from("job_applications" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setApps(a => a.filter(x => x.id !== id));
    setOpen(null);
  };

  const filtered = apps.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (!q) return true;
    const hay = [a.full_name, a.email, a.phone, a.job_title, a.company, a.current_company].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <AdminLayout title="Vacancy Applications">
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Vacancy Applications</h1>
            <Badge variant="secondary">{apps.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search applicant, job..." className="pl-8 w-64" />
            </div>
          </div>
        </div>

        {loading ? <p>Loading...</p> : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No applications yet.</Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(a => (
              <Card key={a.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{a.full_name}</h3>
                    <Badge variant={a.status === "new" ? "default" : "secondary"}>{a.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Applied to <span className="font-medium text-foreground">{a.job_title}</span>{a.company ? ` @ ${a.company}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</span>
                    {a.experience && <span>{a.experience}</span>}
                    {a.current_location && <span>{a.current_location}</span>}
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={a.status} onValueChange={(v) => setStatus(a.id, v)}>
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setOpen(a)}>View</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {open && (
              <>
                <DialogHeader>
                  <DialogTitle>{open.full_name} - {open.job_title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${open.email}`} className="text-primary">{open.email}</a></div>
                    <div><span className="text-muted-foreground">Phone:</span> <a href={`tel:${open.phone}`} className="text-primary">{open.phone}</a></div>
                    <div><span className="text-muted-foreground">Location:</span> {open.current_location || "-"}</div>
                    <div><span className="text-muted-foreground">Experience:</span> {open.experience || "-"}</div>
                    <div><span className="text-muted-foreground">Current company:</span> {open.current_company || "-"}</div>
                    <div><span className="text-muted-foreground">Designation:</span> {open.current_designation || "-"}</div>
                    <div><span className="text-muted-foreground">Expected salary:</span> {open.expected_salary || "-"}</div>
                    <div><span className="text-muted-foreground">Notice period:</span> {open.notice_period || "-"}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {open.resume_url && <Button asChild size="sm" variant="outline"><a href={open.resume_url} target="_blank" rel="noreferrer"><FileText className="w-4 h-4 mr-1" />Resume</a></Button>}
                    {open.portfolio_url && <Button asChild size="sm" variant="outline"><a href={open.portfolio_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />Portfolio</a></Button>}
                    {open.linkedin_url && <Button asChild size="sm" variant="outline"><a href={open.linkedin_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />LinkedIn</a></Button>}
                  </div>
                  {open.cover_letter && (
                    <div>
                      <p className="text-muted-foreground mb-1">Cover letter</p>
                      <div className="p-3 rounded-md bg-muted whitespace-pre-wrap">{open.cover_letter}</div>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground mb-1">Admin notes</p>
                    <Textarea
                      rows={3}
                      defaultValue={open.admin_notes || ""}
                      onBlur={(e) => saveNotes(open.id, e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
