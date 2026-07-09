import { useState } from "react";
import { Flag, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AIDisclaimerProps {
  source: string;                 // e.g. "ai_counselor", "eligibility_checker", "predict_colleges"
  content?: string;               // full AI message (stored for admin review)
  excerpt?: string;               // short excerpt (first 240 chars)
  context?: Record<string, any>;  // any extra context (stream, percent, rank, etc.)
  compact?: boolean;              // smaller variant for chat bubbles
}

export function AIDisclaimer({ source, content, excerpt, context, compact }: AIDisclaimerProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Please describe the issue briefly.");
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("ai_content_reports").insert({
        source,
        reason: reason.trim(),
        full_content: content?.slice(0, 8000) ?? null,
        message_excerpt: (excerpt ?? content ?? "").slice(0, 240),
        reporter_name: name.trim() || null,
        reporter_email: email.trim() || null,
        reporter_phone: phone.trim() || null,
        user_id: user?.id ?? null,
        page_url: typeof window !== "undefined" ? window.location.href : null,
        context: context ?? {},
      });
      if (error) throw error;
      toast.success("Thanks! Our team will review this report.");
      setOpen(false);
      setReason(""); setName(""); setEmail(""); setPhone("");
    } catch (e: any) {
      toast.error(e?.message || "Could not submit report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={`mt-2 flex items-start gap-2 ${compact ? "text-[10px]" : "text-[11px]"} text-muted-foreground border-t border-dashed border-border pt-2`}>
        <ShieldAlert className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-amber-600 shrink-0 mt-0.5`} />
        <p className="leading-snug flex-1">
          <span className="font-semibold text-foreground/80">Note:</span> This is AI-generated. We do not guarantee accuracy — actual results depend on cut-offs, latest rules, and official guidelines. Please verify on the authentic source.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition font-semibold"
        >
          <Flag className="w-3 h-3" /> Report
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report an issue with this AI response</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="What's wrong? (e.g. outdated cut-off, wrong college, factual error...)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <div className="grid grid-cols-1 gap-2">
              <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {excerpt && (
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2 line-clamp-3">
                <span className="font-semibold">Reporting:</span> {excerpt.slice(0, 200)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Flag className="w-4 h-4 mr-2" />}
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
