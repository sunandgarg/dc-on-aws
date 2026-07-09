import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Mail, Phone, EyeOff, Eye, X, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { AddTeamMemberDialog } from "./AddTeamMemberDialog";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  editor: "Editor",
  contributor: "Contributor",
  lead_push: "Lead Push Only",
};

export function TeamPanel() {
  const qc = useQueryClient();
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["team_invites"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("team_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const revoke = async (id: string) => {
    if (!confirm("Revoke this team member? They will lose admin-panel access on next login.")) return;
    const { error } = await (supabase as any)
      .from("team_invites")
      .update({ status: "revoked" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revoked");
    qc.invalidateQueries({ queryKey: ["team_invites"] });
  };

  const reactivate = async (id: string) => {
    const { error } = await (supabase as any)
      .from("team_invites")
      .update({ status: "pending", accepted_user_id: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Re-activated. They'll get access on next sign-in.");
    qc.invalidateQueries({ queryKey: ["team_invites"] });
  };

  const pending = invites.filter((i: any) => i.status === "pending");
  const accepted = invites.filter((i: any) => i.status === "accepted");

  return (
    <Card className="mb-6 border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Team Dekhocampus
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pre-approved teammates. Add an email or mobile here - when they sign in with that ID, they'll automatically get admin-panel access with the role &amp; permissions you set.
            </p>
          </div>
          <AddTeamMemberDialog onSaved={() => qc.invalidateQueries({ queryKey: ["team_invites"] })} />
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading team…</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No teammates yet. Click "Add Teammate" to invite the first one.</div>
        ) : (
          <div className="space-y-4">
            {accepted.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Active ({accepted.length})</div>
                <div className="grid gap-2">
                  {accepted.map((i: any) => <Row key={i.id} invite={i} onRevoke={() => revoke(i.id)} />)}
                </div>
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Pending sign-in ({pending.length})</div>
                <div className="grid gap-2">
                  {pending.map((i: any) => <Row key={i.id} invite={i} onRevoke={() => revoke(i.id)} />)}
                </div>
              </div>
            )}
            {invites.filter((i: any) => i.status === "revoked").length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Revoked</div>
                <div className="grid gap-2">
                  {invites.filter((i: any) => i.status === "revoked").map((i: any) => (
                    <Row key={i.id} invite={i} onReactivate={() => reactivate(i.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ invite, onRevoke, onReactivate }: { invite: any; onRevoke?: () => void; onReactivate?: () => void }) {
  return (
    <div className="border border-border rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="font-medium text-sm">{invite.display_name || invite.email || invite.phone}</div>
        <Badge variant={invite.role === "admin" ? "default" : "secondary"} className="text-[10px]">
          {ROLE_LABEL[invite.role] || invite.role}
        </Badge>
        {invite.mask_leads ? (
          <Badge variant="outline" className="text-[10px] gap-1"><EyeOff className="w-3 h-3" /> Masked leads</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] gap-1"><Eye className="w-3 h-3" /> Full leads</Badge>
        )}
        {invite.status === "accepted" && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 border gap-1"><CheckCircle2 className="w-3 h-3" />Active</Badge>}
        {invite.status === "pending" && <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3" />Awaiting sign-in</Badge>}
        {invite.status === "revoked" && <Badge variant="destructive" className="text-[10px]">Revoked</Badge>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {invite.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{invite.email}</span>}
        {invite.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{invite.phone}</span>}
        {invite.permissions?.length > 0 && <span>+{invite.permissions.length} custom perms</span>}
        {invite.status !== "revoked" && onRevoke && (
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={onRevoke}>
            <X className="w-3 h-3 mr-1" /> Revoke
          </Button>
        )}
        {invite.status === "revoked" && onReactivate && (
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={onReactivate}>
            Re-activate
          </Button>
        )}
      </div>
    </div>
  );
}
