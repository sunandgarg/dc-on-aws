import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Flag, Check, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Report = {
  id: string;
  source: string;
  reason: string | null;
  message_excerpt: string | null;
  full_content: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  page_url: string | null;
  context: any;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export default function AdminAIReports() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin_ai_content_reports"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_content_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (notes[id] !== undefined) patch.admin_notes = notes[id];
    const { error } = await (supabase as any).from("ai_content_reports").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    qc.invalidateQueries({ queryKey: ["admin_ai_content_reports"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report permanently?")) return;
    const { error } = await (supabase as any).from("ai_content_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin_ai_content_reports"] });
  };

  const open = reports.filter((r) => r.status === "open");
  const resolved = reports.filter((r) => r.status === "resolved");
  const dismissed = reports.filter((r) => r.status === "dismissed");

  const list = tab === "open" ? open : tab === "resolved" ? resolved : tab === "dismissed" ? dismissed : reports;

  if (isLoading) {
    return (
      <AdminLayout title="AI Content Reports">
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="AI Content Reports">
      <p className="text-sm text-muted-foreground mb-4">
        User-submitted reports flagging issues in AI-generated responses (chatbot, eligibility checker, predictors).
      </p>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="open">Open <Badge variant="destructive" className="ml-2">{open.length}</Badge></TabsTrigger>
          <TabsTrigger value="resolved">Resolved <Badge variant="outline" className="ml-2">{resolved.length}</Badge></TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed <Badge variant="outline" className="ml-2">{dismissed.length}</Badge></TabsTrigger>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2">{reports.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {!list.length && <p className="text-sm text-muted-foreground py-8 text-center">Nothing here.</p>}
          <div className="space-y-3 mt-3">
            {list.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant="outline" className="text-[10px] uppercase"><Flag className="w-2.5 h-2.5 mr-1" />{r.source}</Badge>
                      <Badge
                        variant={r.status === "open" ? "destructive" : r.status === "resolved" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                      {r.page_url && (
                        <a href={r.page_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline">
                          <ExternalLink className="w-2.5 h-2.5" /> page
                        </a>
                      )}
                    </div>
                    {r.reason && <p className="text-sm font-medium text-foreground">"{r.reason}"</p>}
                    {r.message_excerpt && (
                      <p className="text-xs text-muted-foreground mt-1.5 bg-muted/40 rounded p-2 whitespace-pre-line">
                        <span className="font-semibold">AI said:</span> {r.message_excerpt}
                      </p>
                    )}
                    {r.full_content && r.full_content !== r.message_excerpt && (
                      <details className="mt-1.5">
                        <summary className="text-[11px] text-primary cursor-pointer">View full AI response</summary>
                        <pre className="text-[11px] text-muted-foreground mt-1 bg-muted/30 rounded p-2 whitespace-pre-wrap">{r.full_content}</pre>
                      </details>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Reporter: {r.reporter_name || "Anonymous"}
                      {r.reporter_email && ` · ${r.reporter_email}`}
                      {r.reporter_phone && ` · ${r.reporter_phone}`}
                    </p>
                    {r.context && Object.keys(r.context || {}).length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Context: <code>{JSON.stringify(r.context)}</code></p>
                    )}
                    <Textarea
                      placeholder="Internal notes..."
                      className="mt-2 text-xs"
                      rows={2}
                      defaultValue={r.admin_notes || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.status !== "resolved" && (
                      <Button size="sm" onClick={() => setStatus(r.id, "resolved")} className="bg-success text-success-foreground">
                        <Check className="w-3.5 h-3.5 mr-1" /> Resolve
                      </Button>
                    )}
                    {r.status !== "dismissed" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
