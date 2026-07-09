import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Check, X, Flag, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
export default function AdminReviews() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [collegeQ, setCollegeQ] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<string>("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin_college_reviews"],
    queryFn: async () => (await (supabase as any).from("college_reviews").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["admin_review_reports"],
    queryFn: async () => (await (supabase as any).from("review_reports").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await (supabase as any).from("college_reviews").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Review ${status}`);
    qc.invalidateQueries({ queryKey: ["admin_college_reviews"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    const { error } = await (supabase as any).from("college_reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin_college_reviews"] });
  };

  const resolveReport = async (id: string) => {
    const { error } = await (supabase as any).from("review_reports").update({ status: "resolved" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Report resolved");
    qc.invalidateQueries({ queryKey: ["admin_review_reports"] });
  };

  const pending = reviews.filter((r: any) => r.status === "pending");
  const approved = reviews.filter((r: any) => r.status === "approved");
  const rejected = reviews.filter((r: any) => r.status === "rejected");
  const reported = reviews.filter((r: any) => (r.report_count || 0) > 0);

  // Aggregate distinct college slugs from existing reviews for the by-college tab
  const collegesInReviews = useMemo(() => {
    const map = new Map<string, number>();
    reviews.forEach((r: any) => map.set(r.college_slug, (map.get(r.college_slug) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [reviews]);
  const collegeMatches = collegeQ ? collegesInReviews.filter(([s]) => s.toLowerCase().includes(collegeQ.toLowerCase())).slice(0, 8) : collegesInReviews.slice(0, 8);
  const reviewsForCollege = selectedCollege ? reviews.filter((r: any) => r.college_slug === selectedCollege) : [];
  const allSorted = [...reviews].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (isLoading) return <AdminLayout title="Reviews Moderation">
      <div className="mb-4">
        <CSVTools table="college_reviews" filename="college_reviews.csv" columns="*" upsertKey="id" />
      </div>
<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout title="Reviews Moderation">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All Reviews <Badge variant="secondary" className="ml-2">{reviews.length}</Badge></TabsTrigger>
          <TabsTrigger value="by_college">By College</TabsTrigger>
          <TabsTrigger value="pending">Pending <Badge variant="secondary" className="ml-2">{pending.length}</Badge></TabsTrigger>
          <TabsTrigger value="reported">Reported <Badge variant="destructive" className="ml-2">{reported.length}</Badge></TabsTrigger>
          <TabsTrigger value="approved">Approved <Badge variant="outline" className="ml-2">{approved.length}</Badge></TabsTrigger>
          <TabsTrigger value="rejected">Rejected <Badge variant="outline" className="ml-2">{rejected.length}</Badge></TabsTrigger>
          <TabsTrigger value="reports">Report Inbox <Badge variant="outline" className="ml-2">{reports.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="all"><ReviewList items={allSorted} onApprove={(id) => setStatus(id, "approved")} onReject={(id) => setStatus(id, "rejected")} onDelete={remove} /></TabsContent>

        <TabsContent value="by_college">
          <div className="mt-3">
            <div className="relative max-w-md mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={collegeQ} onChange={(e) => setCollegeQ(e.target.value)} placeholder="Search college slug..." className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {collegeMatches.map(([slug, count]) => (
                <Button key={slug} size="sm" variant={selectedCollege === slug ? "default" : "outline"} onClick={() => setSelectedCollege(slug)} className="text-xs">
                  {slug} <Badge variant="secondary" className="ml-1.5 text-[10px]">{count}</Badge>
                </Button>
              ))}
            </div>
            {selectedCollege ? (
              <ReviewList items={reviewsForCollege} onApprove={(id) => setStatus(id, "approved")} onReject={(id) => setStatus(id, "rejected")} onDelete={remove} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Pick a college above to see its reviews.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending"><ReviewList items={pending} onApprove={(id) => setStatus(id, "approved")} onReject={(id) => setStatus(id, "rejected")} onDelete={remove} /></TabsContent>
        <TabsContent value="reported"><ReviewList items={reported} onApprove={(id) => setStatus(id, "approved")} onReject={(id) => setStatus(id, "rejected")} onDelete={remove} /></TabsContent>
        <TabsContent value="approved"><ReviewList items={approved} onApprove={(id) => setStatus(id, "approved")} onReject={(id) => setStatus(id, "rejected")} onDelete={remove} /></TabsContent>
        <TabsContent value="rejected"><ReviewList items={rejected} onApprove={(id) => setStatus(id, "approved")} onReject={(id) => setStatus(id, "rejected")} onDelete={remove} /></TabsContent>

        <TabsContent value="reports">
          <div className="space-y-2 mt-3">
            {reports.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No reports yet.</p>}
            {reports.map((rep: any) => (
              <div key={rep.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">By {rep.reporter_name || "Guest"} • {new Date(rep.created_at).toLocaleString()}</p>
                    <p className="text-sm text-foreground mt-1"><Flag className="inline w-3 h-3 mr-1 text-destructive" />{rep.reason}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Review id: {rep.review_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={rep.status === "open" ? "destructive" : "outline"}>{rep.status}</Badge>
                    {rep.status === "open" && <Button size="sm" variant="outline" onClick={() => resolveReport(rep.id)}>Resolve</Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function ReviewList({ items, onApprove, onReject, onDelete }: { items: any[]; onApprove: (id: string) => void; onReject: (id: string) => void; onDelete: (id: string) => void }) {
  if (!items.length) return <p className="text-sm text-muted-foreground py-8 text-center">Nothing here.</p>;
  return (
    <div className="space-y-3 mt-3">
      {items.map((r) => (
        <div key={r.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-foreground">{r.reviewer_name || "Anonymous"}</span>
                <Badge variant="outline" className="text-[10px]">{r.college_slug}</Badge>
                {r.report_count > 0 && <Badge variant="destructive" className="text-[10px]"><Flag className="w-2.5 h-2.5 mr-0.5" /> {r.report_count}</Badge>}
                <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-golden fill-golden" : "text-muted-foreground"}`} />)}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.title && <p className="text-sm font-medium text-foreground">{r.title}</p>}
              {r.body && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{r.body}</p>}
              {r.last_report_reason && <p className="text-[11px] text-destructive mt-1">Last report: {r.last_report_reason}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {r.status !== "approved" && <Button size="sm" onClick={() => onApprove(r.id)} className="bg-success text-success-foreground"><Check className="w-3.5 h-3.5 mr-1" /> Approve</Button>}
              {r.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => onReject(r.id)}><X className="w-3.5 h-3.5 mr-1" /> Reject</Button>}
              <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
