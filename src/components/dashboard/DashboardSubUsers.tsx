import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Users, Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeIndianMobile } from "@/lib/phone";

type SubUser = {
  id: string;
  parent_user_id: string;
  name: string;
  email: string;
  phone: string;
  type: "family" | "team";
  role: "viewer" | "manager";
  status: string;
  created_at: string;
};

export function DashboardSubUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<"family" | "team">("family");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sub_users", user?.id],
    enabled: !!user,
    queryFn: async () => (await (supabase as any).from("sub_users").select("*").eq("parent_user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const reset = () => { setName(""); setEmail(""); setPhone(""); };

  const add = async () => {
    if (!user) return;
    if (name.trim().length < 2) return toast.error("Enter a name");
    if (phone && !/^\d{10}$/.test(phone)) return toast.error("Phone must be 10 digits");
    if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return toast.error("Invalid email");
    setSaving(true);
    const { error } = await (supabase as any).from("sub_users").insert({
      parent_user_id: user.id,
      type,
      role: type === "team" ? "manager" : "viewer",
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Sub-user added");
    reset();
    qc.invalidateQueries({ queryKey: ["sub_users", user.id] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this sub-user?")) return;
    const { error } = await (supabase as any).from("sub_users").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["sub_users", user?.id] });
  };

  const family = items.filter((i: SubUser) => i.type === "family");
  const team = items.filter((i: SubUser) => i.type === "team");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Sub-users</h2>
        <p className="text-sm text-muted-foreground">Add family members (read-only - they can see your applications & saved colleges) or team members (managers - they can manage on your behalf).</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Add sub-user</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <div className="flex gap-2">
              <Button type="button" variant={type === "family" ? "default" : "outline"} size="sm" onClick={() => setType("family")} className="rounded-full"><Users className="w-3.5 h-3.5 mr-1" /> Family (view)</Button>
              <Button type="button" variant={type === "team" ? "default" : "outline"} size="sm" onClick={() => setType("team")} className="rounded-full"><Briefcase className="w-3.5 h-3.5 mr-1" /> Team (manage)</Button>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" />
          <Input value={phone} onChange={(e) => setPhone(normalizeIndianMobile(e.target.value))} placeholder="10-digit phone" inputMode="numeric" />
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={add} disabled={saving} className="gradient-primary text-primary-foreground rounded-full">
            {saving ? "Adding..." : "Add sub-user"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <SubUserGroup title="Family members (view-only)" icon={<Users className="w-4 h-4 text-emerald-600" />} items={family} onRemove={remove} emptyText="No family members added yet." />
          <SubUserGroup title="Team members (managers)" icon={<Briefcase className="w-4 h-4 text-primary" />} items={team} onRemove={remove} emptyText="No team members yet." />
        </div>
      )}
    </div>
  );
}

function SubUserGroup({ title, icon, items, onRemove, emptyText }: { title: string; icon: any; items: SubUser[]; onRemove: (id: string) => void; emptyText: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">{icon} {title} <Badge variant="outline" className="ml-auto">{items.length}</Badge></h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{[s.phone, s.email].filter(Boolean).join(" • ")} • {s.role}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => onRemove(s.id)} className="text-destructive shrink-0"><Trash2 className="w-4 h-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
