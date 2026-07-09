import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, IndianRupee, MessageSquare, GraduationCap, Users, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-amber-100 text-amber-700 border-amber-200",
  converted: "bg-purple-100 text-purple-700 border-purple-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const statusIcons: Record<string, any> = {
  submitted: Clock,
  contacted: MessageSquare,
  converted: CheckCircle,
  paid: IndianRupee,
  rejected: XCircle,
};

export default function AdminReferrals() {
  const queryClient = useQueryClient();
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rewardAmount, setRewardAmount] = useState<string>("");
  const [search, setSearch] = useDraftState<string>('admin.referrals.search.v1', "");

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referrer:profiles(display_name, email, phone)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes, reward_amount, reward_paid }: any) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;
      if (reward_amount !== undefined) updates.reward_amount = parseFloat(reward_amount);
      if (reward_paid !== undefined) updates.reward_paid = reward_paid;

      const { error } = await supabase
        .from("referrals")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      if (status === "paid") {
        const { error: txError } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: selectedReferral.referrer_id,
            referral_id: id,
            amount: parseFloat(reward_amount || selectedReferral.reward_amount || "0"),
            type: "credit",
            status: "completed",
            description: `Referral reward for ${selectedReferral.friend_name}`
          });
        if (txError) throw txError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success("Referral updated successfully");
      setSelectedReferral(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleUpdate = (status: string) => {
    updateMutation.mutate({ 
      id: selectedReferral.id, 
      status, 
      admin_notes: adminNotes,
      reward_amount: rewardAmount,
      reward_paid: status === "paid"
    });
  };

  const filtered = (referrals ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.friend_name?.toLowerCase().includes(q) || r.friend_mobile?.includes(q) || r.friend_email?.toLowerCase().includes(q) || r.referrer?.[0]?.display_name?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout title="Referrals Management">
      <div className="mb-4">
        <CSVTools table="referrals" filename="referrals.csv" columns="*" upsertKey="id" />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search referrals..." className="pl-10 rounded-xl" />
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} referrals</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">Referrer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Friend (Student)</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Desired College</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ref) => {
                  const StatusIcon = statusIcons[ref.status] || Clock;
                  return (
                    <tr key={ref.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {ref.referrer?.[0]?.display_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{ref.referrer?.[0]?.display_name || "Unknown"}</div>
                            <div className="text-[10px] text-muted-foreground">{ref.referrer?.[0]?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-foreground">{ref.friend_name}</div>
                        <div className="text-[10px] text-muted-foreground">{ref.friend_mobile}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">
                            {Array.isArray(ref.desired_colleges) && ref.desired_colleges.length > 0 
                              ? (ref.desired_colleges[0] as string) 
                              : "N/A"}
                            {Array.isArray(ref.desired_colleges) && ref.desired_colleges.length > 1 && ` +${ref.desired_colleges.length - 1}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit capitalize font-normal ${statusColors[ref.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {ref.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {format(new Date(ref.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg"
                          onClick={() => {
                            setSelectedReferral(ref);
                            setAdminNotes(ref.admin_notes || "");
                            setRewardAmount(ref.reward_amount?.toString() || "");
                          }}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>{search ? "No referrals match your search." : "No referrals submitted yet."}</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Update Referral Status</DialogTitle>
            <DialogDescription>
              Managing referral for <strong>{selectedReferral?.friend_name}</strong> submitted by {selectedReferral?.referrer?.[0]?.display_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Friend Mobile</label>
                <div className="text-sm font-medium">{selectedReferral?.friend_mobile}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Friend Email</label>
                <div className="text-sm font-medium">{selectedReferral?.friend_email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reward Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">Amount will be credited to user's wallet when status is set to "Paid".</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes</label>
              <Textarea 
                placeholder="Internal notes about this lead..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="rounded-xl min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex flex-wrap gap-2 w-full justify-between sm:justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleUpdate("rejected")}
              >
                Reject
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl"
                  onClick={() => handleUpdate("contacted")}
                >
                  Mark Contacted
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50"
                  onClick={() => handleUpdate("converted")}
                >
                  Converted
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleUpdate("paid")}
                >
                  Approve & Pay
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
