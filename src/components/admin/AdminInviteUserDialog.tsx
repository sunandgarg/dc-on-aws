import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeIndianMobile } from "@/lib/phone";

export function AdminInviteUserDialog({ onInvited }: { onInvited?: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("editor");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  const submit = async () => {
    if (!email && !phone) return toast.error("Provide email or 10-digit phone");
    setBusy(true);
    const { data, error } = await (supabase as any).functions.invoke("admin-invite-user", {
      body: { email: email || undefined, phone: phone || undefined, role, display_name: name },
    });
    setBusy(false);
    if (error || data?.error) return toast.error(error?.message || data?.error || "Failed");
    setTempPwd(data?.password ?? null);
    toast.success("User invited");
    onInvited?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setTempPwd(null); setEmail(""); setPhone(""); setName(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><UserPlus className="w-4 h-4" />Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a team member</DialogTitle></DialogHeader>
        {tempPwd ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share these temporary credentials with the user. They can change the password after first login.</p>
            <div className="bg-muted rounded-lg p-3 text-sm font-mono break-all flex items-start gap-2">
              <span className="flex-1">{tempPwd}</span>
              <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(tempPwd); toast.success("Copied"); }}><Copy className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input placeholder="Display name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="email" placeholder="Email (preferred)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Or 10-digit mobile" value={phone} onChange={(e) => setPhone(normalizeIndianMobile(e.target.value))} />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - full access</SelectItem>
                <SelectItem value="manager">Manager - most modules, no destructive</SelectItem>
                <SelectItem value="editor">Editor - content modules only</SelectItem>
                <SelectItem value="contributor">Contributor - own articles only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          {!tempPwd && <Button onClick={submit} disabled={busy}>{busy ? "Inviting…" : "Send Invite"}</Button>}
          {tempPwd && <Button onClick={() => setOpen(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
