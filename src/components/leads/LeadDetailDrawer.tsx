import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MessageCircle, Copy, MapPin, Calendar, Tag, ExternalLink, Sparkles, StickyNote, ActivitySquare, Send, User, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const LEAD_STATUSES = [
  { value: "new",        label: "New",        color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { value: "contacted",  label: "Contacted",  color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { value: "qualified",  label: "Qualified",  color: "bg-violet-500/10 text-violet-700 border-violet-500/30" },
  { value: "won",        label: "Won",        color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  { value: "lost",       label: "Lost",       color: "bg-rose-500/10 text-rose-700 border-rose-500/30" },
] as const;

export const statusBadge = (s?: string | null) => {
  const m = LEAD_STATUSES.find((x) => x.value === (s || "new"));
  return m ?? LEAD_STATUSES[0];
};

type Note = { id: string; kind: string; body: string | null; created_at: string; author_id: string | null; meta: any };

export function LeadDetailDrawer({ lead, onClose, onChanged }: { lead: any | null; onClose: () => void; onChanged?: () => void }) {
  const { user } = useAuth();
  const open = !!lead;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState<string>(lead?.status || "new");

  useEffect(() => {
    setStatus(lead?.status || "new");
    if (!lead?.id) { setNotes([]); return; }
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("lead_notes")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      setNotes((data as Note[]) || []);
      setLoading(false);
    })();
  }, [lead?.id]);

  if (!lead) return null;
  const tel = (lead.phone || "").replace(/\D/g, "").slice(-10);
  const sb = statusBadge(status);

  const log = async (kind: string, body: string, meta: any = {}) => {
    await (supabase as any).from("lead_notes").insert({ lead_id: lead.id, author_id: user?.id ?? null, kind, body, meta });
    const { data } = await (supabase as any).from("lead_notes").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    setNotes((data as Note[]) || []);
  };

  const addNote = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    try { await log("note", draft.trim()); setDraft(""); }
    finally { setPosting(false); }
  };

  const changeStatus = async (next: string) => {
    setStatus(next);
    const { error } = await (supabase as any).from("leads").update({ status: next }).eq("id", lead.id);
    if (error) { toast.error("Could not update status"); return; }
    await log("status_change", `Status → ${LEAD_STATUSES.find((s) => s.value === next)?.label || next}`, { from: lead.status, to: next });
    toast.success("Status updated");
    onChanged?.();
  };

  const quickLog = async (kind: "call" | "email" | "whatsapp") => {
    const label = kind === "call" ? "Logged a call" : kind === "email" ? "Sent email" : "WhatsApp message";
    await log(kind, label);
    toast.success(label);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto p-0">
        {/* Hero */}
        <div className="px-5 pt-5 pb-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <SheetHeader className="text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl font-bold text-foreground truncate">{lead.name || "Unnamed lead"}</SheetTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {(lead.city || lead.state) && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[lead.city, lead.state].filter(Boolean).join(", ")}</span>}
                  {lead.created_at && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>}
                  {lead.source && <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{lead.source}</span>}
                </div>
              </div>
              <Badge className={`text-[11px] border ${sb.color} shrink-0`}>{sb.label}</Badge>
            </div>
          </SheetHeader>

          {/* Quick actions */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {tel && (
              <a href={`tel:+91${tel}`} onClick={() => quickLog("call")} className="flex flex-col items-center gap-1 py-2 rounded-lg border border-border bg-card hover:border-emerald-500/50 hover:text-emerald-600 transition">
                <Phone className="w-4 h-4 text-emerald-600" /><span className="text-[10px] font-medium">Call</span>
              </a>
            )}
            {tel && (
              <a href={`https://wa.me/91${tel}`} target="_blank" rel="noopener noreferrer" onClick={() => quickLog("whatsapp")} className="flex flex-col items-center gap-1 py-2 rounded-lg border border-border bg-card hover:border-emerald-500/50 hover:text-emerald-600 transition">
                <MessageCircle className="w-4 h-4 text-emerald-600" /><span className="text-[10px] font-medium">WhatsApp</span>
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} onClick={() => quickLog("email")} className="flex flex-col items-center gap-1 py-2 rounded-lg border border-border bg-card hover:border-blue-500/50 hover:text-blue-600 transition">
                <Mail className="w-4 h-4 text-blue-600" /><span className="text-[10px] font-medium">Email</span>
              </a>
            )}
            <button
              onClick={() => {
                const text = `${lead.name || ""} ${tel ? "+91" + tel : ""} ${lead.email || ""}`.trim();
                navigator.clipboard?.writeText(text); toast.success("Copied");
              }}
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-border bg-card hover:border-primary/50 hover:text-primary transition"
            >
              <Copy className="w-4 h-4" /><span className="text-[10px] font-medium">Copy</span>
            </button>
          </div>
        </div>

        {/* Status + details */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lifecycle Stage</label>
            <Select value={status} onValueChange={changeStatus}>
              <SelectTrigger className="mt-1 h-9 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Mobile" value={tel ? `+91 ${tel}` : "—"} />
            <Field label="Email" value={lead.email || "—"} />
            <Field label="City" value={lead.city || "—"} />
            <Field label="State" value={lead.state || "—"} />
            <Field label="Source" value={lead.source || "—"} />
            <Field label="Mode" value={(lead.program_mode || "regular")} />
            <Field label="Interested College" value={lead.interested_college_slug || "—"} />
            <Field label="Interested Course" value={lead.interested_course_slug || "—"} />
            {lead.page_url && (
              <div className="col-span-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Landing Page</div>
                <a href={lead.page_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 break-all"><ExternalLink className="w-3 h-3 shrink-0" />{lead.page_url}</a>
              </div>
            )}
            {lead.initial_query && (
              <div className="col-span-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Initial Query</div>
                <p className="text-xs text-foreground bg-muted/40 rounded-md px-2 py-1.5">{lead.initial_query}</p>
              </div>
            )}
          </div>
        </div>

        {/* Note composer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <StickyNote className="w-3 h-3" /> Add note
          </label>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Spoke with student about admissions… (Cmd/Ctrl+Enter to post)"
            className="mt-1.5 min-h-[70px] text-sm"
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote(); }}
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={addNote} size="sm" disabled={!draft.trim() || posting} className="rounded-full gap-1.5">
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Post note
            </Button>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="px-5 py-4 border-t border-border">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
            <ActivitySquare className="w-3 h-3" /> Activity Timeline
          </div>
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : notes.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No activity yet. Add the first note above.</div>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="ml-3">
                  <span className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full ${kindDot(n.kind)} ring-2 ring-background`} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-foreground capitalize">{kindLabel(n.kind)}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), "MMM d, HH:mm")}</span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground truncate" title={value}>{value}</div>
    </div>
  );
}

function kindDot(kind: string) {
  switch (kind) {
    case "call": return "bg-emerald-500";
    case "whatsapp": return "bg-emerald-600";
    case "email": return "bg-blue-500";
    case "status_change": return "bg-violet-500";
    case "assignment": return "bg-orange-500";
    default: return "bg-primary";
  }
}
function kindLabel(k: string) {
  return ({ call: "Call", whatsapp: "WhatsApp", email: "Email", status_change: "Status change", assignment: "Assignment", note: "Note" } as Record<string, string>)[k] || k;
}
