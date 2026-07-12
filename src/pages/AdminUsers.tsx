import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Phone, Mail, MapPin, Calendar, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { AppRole } from "@/lib/rbac";
import { PermissionEditor } from "@/components/admin/PermissionEditor";
import { TeamPanel } from "@/components/admin/TeamPanel";
import { isSyntheticPhoneEmail } from "@/lib/authIdentity";

import { CSVTools } from "@/components/CSVTools";
const ASSIGNABLE_ROLES: AppRole[] = ["admin", "manager", "editor", "contributor"];

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const toggleRole = async (userId: string, role: AppRole, hasIt: boolean) => {
    if (hasIt) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
      toast.success(`Removed ${role}`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
      toast.success(`Granted ${role}`);
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes, leadsRes, appsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("leads").select("phone, email, source, created_at"),
        supabase.from("college_applications").select("user_id, college_name, created_at"),
      ]);

      const rolesMap = new Map<string, string[]>();
      (rolesRes.data || []).forEach((r: any) => {
        const arr = rolesMap.get(r.user_id) || [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });

      // Aggregate leads & apps per phone/user_id
      const leadCountByPhone = new Map<string, number>();
      const sourceByPhone = new Map<string, string>();
      (leadsRes.data || []).forEach((l: any) => {
        if (l.phone) {
          leadCountByPhone.set(l.phone, (leadCountByPhone.get(l.phone) || 0) + 1);
          if (!sourceByPhone.has(l.phone)) sourceByPhone.set(l.phone, l.source);
        }
      });

      const appsByUser = new Map<string, number>();
      (appsRes.data || []).forEach((a: any) => {
        if (a.user_id) appsByUser.set(a.user_id, (appsByUser.get(a.user_id) || 0) + 1);
      });

      return (profilesRes.data || []).map((p: any) => ({
        ...p,
        roles: rolesMap.get(p.user_id) || [],
        leadCount: p.phone ? (leadCountByPhone.get(p.phone) || 0) : 0,
        loginSource: isSyntheticPhoneEmail(p.email) ? "Mobile OTP" : (p.email ? "Google / Email" : "Unknown"),
        applicationCount: appsByUser.get(p.user_id) || 0,
      }));
    },
  });

  const filtered = users.filter((u: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.display_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.includes(s)
    );
  });

  return (
    <AdminLayout title="Users">
      <div className="mb-4">
        <CSVTools table="profiles" filename="profiles.csv" columns="*" upsertKey="user_id" />
      </div>

      {isAdmin && <TeamPanel />}
      <div className="mb-2"><h2 className="text-lg font-bold">All Users</h2><p className="text-xs text-muted-foreground">Everyone who signed up on dekhocampus. Team members appear above.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-foreground">{users.length}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-foreground">{users.filter((u: any) => u.loginSource === "Mobile OTP").length}</div>
          <div className="text-xs text-muted-foreground">Mobile OTP</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-foreground">{users.filter((u: any) => u.loginSource === "Google / Email").length}</div>
          <div className="text-xs text-muted-foreground">Google / Email</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-foreground">{users.filter((u: any) => u.kyc_completed).length}</div>
          <div className="text-xs text-muted-foreground">KYC Done</div>
        </CardContent></Card>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u: any) => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-foreground">{u.display_name || u.phone || "Unnamed"}</h3>
                      {u.roles.map((r: string) => (
                        <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>
                      ))}
                      <Badge variant="outline" className="text-[10px]">{u.loginSource}</Badge>
                      {u.kyc_completed && <Badge className="text-[10px] bg-success">KYC ✓</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                      {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>}
                      {u.email && !isSyntheticPhoneEmail(u.email) && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>}
                      {(u.city || u.state) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {[u.city, u.state].filter(Boolean).join(", ")}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                    {isAdmin && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mr-1">Roles:</span>
                          {ASSIGNABLE_ROLES.map(r => {
                            const has = u.roles.includes(r);
                            return (
                              <Button key={r} size="sm" variant={has ? "default" : "outline"} className="h-6 px-2 text-[10px]"
                                onClick={() => toggleRole(u.user_id, r, has)}>
                                {has && <X className="w-2.5 h-2.5 mr-0.5" />}{r}
                              </Button>
                            );
                          })}
                        </div>
                        <PermissionEditor userId={u.user_id} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 text-center shrink-0">
                    <div>
                      <div className="text-lg font-bold text-primary">{u.leadCount}</div>
                      <div className="text-[10px] text-muted-foreground">Leads</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary">{u.applicationCount}</div>
                      <div className="text-[10px] text-muted-foreground">Applications</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
