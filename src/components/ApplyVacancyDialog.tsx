import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";

interface Props {
  job: any;
  trigger?: React.ReactNode;
}

const empty = {
  full_name: "", email: "", phone: "", current_location: "",
  experience: "", current_company: "", current_designation: "",
  expected_salary: "", notice_period: "",
  resume_url: "", portfolio_url: "", linkedin_url: "", cover_letter: "",
};

export function ApplyVacancyDialog({ job, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(empty);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Name, email and phone are required");
      return;
    }
    const phone = form.phone.replace(/\D/g, "");
    if (phone.length < 10) { toast.error("Enter a valid 10-digit phone"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Invalid email"); return; }

    setSubmitting(true);
    const payload = {
      ...form,
      phone,
      job_id: job?.id,
      job_slug: job?.slug,
      job_title: job?.title,
      company: job?.company,
      source: "website",
    };
    const { error } = await supabase.from("job_applications" as any).insert(payload);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSubmitted(true);
    setForm(empty);
    toast.success("Application submitted!");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSubmitted(false); }}>
      <DialogTrigger asChild>
        {trigger || <Button size="lg"><Send className="w-4 h-4 mr-2" />Apply Now</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {job?.title}</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-1">Application received!</h3>
            <p className="text-sm text-muted-foreground mb-5">Our team will reach out if your profile matches.</p>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Full name *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} required /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} required /></div>
              <div><Label>Phone *</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} required maxLength={15} /></div>
              <div><Label>Current location</Label><Input value={form.current_location} onChange={e => set("current_location", e.target.value)} /></div>
              <div><Label>Total experience</Label><Input value={form.experience} onChange={e => set("experience", e.target.value)} placeholder="e.g. 2 years" /></div>
              <div><Label>Current company</Label><Input value={form.current_company} onChange={e => set("current_company", e.target.value)} /></div>
              <div><Label>Current designation</Label><Input value={form.current_designation} onChange={e => set("current_designation", e.target.value)} /></div>
              <div><Label>Expected salary</Label><Input value={form.expected_salary} onChange={e => set("expected_salary", e.target.value)} placeholder="₹ LPA" /></div>
              <div><Label>Notice period</Label><Input value={form.notice_period} onChange={e => set("notice_period", e.target.value)} placeholder="e.g. 30 days" /></div>
              <div><Label>Resume URL</Label><Input value={form.resume_url} onChange={e => set("resume_url", e.target.value)} placeholder="Google Drive / Dropbox link" /></div>
              <div><Label>Portfolio URL</Label><Input value={form.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} /></div>
              <div><Label>LinkedIn URL</Label><Input value={form.linkedin_url} onChange={e => set("linkedin_url", e.target.value)} /></div>
            </div>
            <div>
              <Label>Why are you a great fit?</Label>
              <Textarea rows={4} value={form.cover_letter} onChange={e => set("cover_letter", e.target.value)} placeholder="A short cover note (optional)" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
