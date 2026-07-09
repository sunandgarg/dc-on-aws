import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, Module } from "@/lib/rbac";
import { normalizeIndianMobile } from "@/lib/phone";

const ROLES: { value: AppRole; label: string; desc: string }[] = [
  { value: "admin", label: "Admin", desc: "Full access to everything" },
  { value: "manager", label: "Manager", desc: "Most modules, no destructive deletes" },
  { value: "editor", label: "Editor", desc: "Content modules only" },
  { value: "contributor", label: "Contributor", desc: "Add & edit own articles only" },
  { value: "lead_push", label: "Lead Push Only", desc: "Sees only Lead Push + All Leads" },
];

const PERM_MODULES: Module[] = [
  "articles","colleges","courses","exams","study_material","leads","ads","banners",
  "promoted_programs","featured","applications","referrals","careers","companies",
  "placements","faculty","facilities","contacts","course_fees","partners","content","legal",
];
const ACTIONS = [
  { key: "can_view", label: "View" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_publish", label: "Publish" },
  { key: "can_delete", label: "Delete" },
] as const;

interface PermRow { resource: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_publish: boolean; can_delete: boolean; }

export function AddTeamMemberDialog({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>("lead_push");
  const [maskLeads, setMaskLeads] = useState(true);
  const [perms, setPerms] = useState<Record<string, PermRow>>({});
  const [busy, setBusy] = useState(false);

  const togglePerm = (resource: string, action: keyof PermRow) => {
    setPerms((prev) => {
      const row = prev[resource] || { resource, can_view: false, can_create: false, can_edit: false, can_publish: false, can_delete: false };
      const updated = { ...row, [action]: !row[action] };
      const empty = !updated.can_view && !updated.can_create && !updated.can_edit && !updated.can_publish && !updated.can_delete;
      const next = { ...prev };
      if (empty) delete next[resource]; else next[resource] = updated;
      return next;
    });
  };

  const reset = () => {
    setEmail(""); setPhone(""); setName(""); setRole("lead_push"); setMaskLeads(true); setPerms({});
  };

  const submit = async () => {
    const cleanPhone = normalizeIndianMobile(phone);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail && cleanPhone.length !== 10) {
      toast.error("Provide an email or a valid 10-digit mobile");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any).from("team_invites").insert({
      email: cleanEmail || null,
      phone: cleanPhone || null,
      display_name: name || null,
      role,
      mask_leads: maskLeads,
      permissions: Object.values(perms),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Teammate added. They'll get access on next sign-in.");
    reset();
    setOpen(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><UserPlus className="w-4 h-4" />Add Teammate</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Team Dekhocampus</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Pre-approve a teammate by email or mobile. When they sign up using that email/number, they'll automatically get the role and permissions you choose here.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Display name (optional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col"><span className="font-medium">{r.label}</span><span className="text-[10px] text-muted-foreground">{r.desc}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Email (Google login)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@gmail.com" />
            </div>
            <div>
              <Label className="text-xs">Mobile (10 digits, OTP login)</Label>
              <Input value={phone} onChange={(e) => setPhone(normalizeIndianMobile(e.target.value))} placeholder="9876543210" />
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
            <div>
              <div className="text-sm font-medium">Mask lead contact info</div>
              <div className="text-xs text-muted-foreground">Hide phone/email on the All Leads view for this teammate.</div>
            </div>
            <Switch checked={maskLeads} onCheckedChange={setMaskLeads} />
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Custom module permissions (optional)</div>
            <p className="text-xs text-muted-foreground mb-2">Fine-grained access on top of the role. Leave blank to use the role's defaults.</p>
            <div className="border rounded-lg overflow-auto max-h-[280px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Module</th>
                    {ACTIONS.map(a => <th key={a.key} className="p-2 text-center">{a.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERM_MODULES.map(m => {
                    const row = perms[m];
                    return (
                      <tr key={m} className="border-t">
                        <td className="p-2 capitalize">{m.replace(/_/g, " ")}</td>
                        {ACTIONS.map(a => (
                          <td key={a.key} className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!row?.[a.key]}
                              onChange={() => togglePerm(m, a.key)}
                              className="cursor-pointer"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Add Teammate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
