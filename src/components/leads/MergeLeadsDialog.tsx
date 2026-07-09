import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, GitMerge, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export function MergeLeadsDialog({ leads, open, onClose, onMerged }: { leads: any[]; open: boolean; onClose: () => void; onMerged: () => void }) {
  const [primaryId, setPrimaryId] = useState<string>(leads[0]?.id || "");
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const primary = leads.find((l) => l.id === primaryId) || leads[0];
  const duplicates = leads.filter((l) => l.id !== primary?.id);

  const merge = async () => {
    if (!primary || duplicates.length === 0) return;
    setBusy(true);
    try {
      // Move notes from duplicates onto primary
      const dupIds = duplicates.map((d) => d.id);
      await (supabase as any).from("lead_notes").update({ lead_id: primary.id }).in("lead_id", dupIds);
      // Log merge
      await (supabase as any).from("lead_notes").insert({
        lead_id: primary.id, kind: "note",
        body: `Merged ${duplicates.length} duplicate lead${duplicates.length === 1 ? "" : "s"}: ${duplicates.map((d) => `${d.name || d.phone || d.id.slice(0, 6)}`).join(", ")}`,
        meta: { merged_from: dupIds },
      });
      // Delete duplicates
      const { error } = await (supabase as any).from("leads").delete().in("id", dupIds);
      if (error) throw error;
      toast.success(`Merged ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"} into ${primary.name || "lead"}`);
      onMerged();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Merge failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GitMerge className="w-5 h-5 text-primary" /> Merge {leads.length} duplicate leads</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Choose the <strong>primary lead</strong> to keep. All notes &amp; activity from the other records will be moved onto it, then the duplicates will be permanently deleted.</p>
          </div>
          <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="space-y-2 max-h-[400px] overflow-y-auto">
            {leads.map((l) => (
              <label key={l.id} htmlFor={l.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${primaryId === l.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <RadioGroupItem value={l.id} id={l.id} className="mt-0.5" />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold truncate">{l.name || "Unnamed"}</div>
                    {primaryId === l.id && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Primary</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {l.phone && <>+91 {l.phone.replace(/\D/g, "").slice(-10)} · </>}
                    {l.email || "no email"} · {l.city || "no city"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Source: <span className="font-medium">{l.source || "—"}</span> ·
                    Created: {l.created_at ? format(new Date(l.created_at), "MMM d, yyyy HH:mm") : "—"}
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={merge} disabled={busy || duplicates.length === 0} className="gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
            Merge {duplicates.length} into primary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
