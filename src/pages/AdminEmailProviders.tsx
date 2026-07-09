import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Loader2, Mail, Plus, Trash2, Send } from "lucide-react";

interface EmailProvider {
  id: string;
  provider_name: string;
  display_name: string;
  api_key: string;
  api_secret: string;
  region: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  is_active: boolean;
  icon_emoji: string;
  config_json: Record<string, any>;
}

export default function AdminEmailProviders() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Partial<EmailProvider>>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["email-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_providers" as any).select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as EmailProvider[];
    },
  });

  const addAws = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_providers" as any).insert({
        provider_name: "aws_ses",
        display_name: "AWS SES (Email)",
        region: "ap-south-1",
        icon_emoji: "☁️",
        is_active: false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-providers"] }); toast.success("AWS SES added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmailProvider> }) => {
      const { error } = await supabase.from("email_providers" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-providers"] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setActive = useMutation({
    mutationFn: async ({ provider, next }: { provider: EmailProvider; next: boolean }) => {
      if (next && (!provider.api_key || !provider.api_secret || !provider.region || !provider.from_email)) {
        throw new Error("Add Access Key, Secret, Region and From Email before activating.");
      }
      if (next) await supabase.from("email_providers" as any).update({ is_active: false } as any).neq("id", provider.id);
      const { error } = await supabase.from("email_providers" as any).update({ is_active: next } as any).eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-providers"] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("email_providers" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-providers"] }); toast.success("Deleted"); },
  });

  const sendTest = async () => {
    if (!testTo) return toast.error("Enter a test email address");
    setTesting(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("send-email", {
        body: { to: testTo, subject: "DekhoCampus test email", text: "This is a test email from your AWS SES integration." },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Failed");
      toast.success(`Test email sent (id: ${data?.message_id || "ok"})`);
    } catch (e: any) { toast.error(e.message); } finally { setTesting(false); }
  };

  const setField = (id: string, key: keyof EmailProvider, value: any) =>
    setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), [key]: value } }));

  return (
    <AdminLayout title="Email Providers (AWS SES)">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 flex flex-col lg:flex-row items-start gap-4 justify-between">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Transactional email via AWS SES</p>
            <p className="text-sm text-muted-foreground">Add your AWS Access Key + Secret + Region (e.g. <code>ap-south-1</code>) and a verified From email. The website's <code>send-email</code> function will route every transactional email through SES.</p>
          </div>
        </div>
        {!providers?.length && (
          <Button onClick={() => addAws.mutate()} disabled={addAws.isPending} className="rounded-xl gap-2">
            {addAws.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add AWS SES
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        (providers || []).map((p) => {
          const fields = edits[p.id] || {};
          const hasChanges = Object.keys(fields).length > 0;
          return (
            <div key={p.id} className={`bg-card rounded-2xl border p-5 mb-4 ${p.is_active ? "border-primary/30" : "border-border"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon_emoji}</span>
                  <div>
                    <h3 className="font-semibold">{p.display_name}</h3>
                    <p className="text-xs text-muted-foreground">{p.provider_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.api_key ? <Badge variant="outline" className="border-primary/30 text-primary">Configured</Badge> : <Badge variant="outline" className="border-destructive/30 text-destructive">Not Set</Badge>}
                  <Switch checked={p.is_active} onCheckedChange={(next) => setActive.mutate({ provider: p, next })} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete?")) del.mutate(p.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">AWS Access Key ID</label>
                  <div className="flex gap-1 mt-0.5">
                    <Input type={showKey[p.id] ? "text" : "password"} defaultValue={p.api_key} onChange={(e) => setField(p.id, "api_key", e.target.value)} placeholder="AKIA..." className="rounded-xl h-8 text-xs font-mono" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowKey((s) => ({ ...s, [p.id]: !s[p.id] }))}>{showKey[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</Button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">AWS Secret Access Key</label>
                  <div className="flex gap-1 mt-0.5">
                    <Input type={showSecret[p.id] ? "text" : "password"} defaultValue={p.api_secret} onChange={(e) => setField(p.id, "api_secret", e.target.value)} placeholder="••••" className="rounded-xl h-8 text-xs font-mono" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowSecret((s) => ({ ...s, [p.id]: !s[p.id] }))}>{showSecret[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</Button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">Region</label>
                  <Input defaultValue={p.region} onChange={(e) => setField(p.id, "region", e.target.value)} placeholder="ap-south-1" className="rounded-xl h-8 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">From Email (verified in SES)</label>
                  <Input defaultValue={p.from_email} onChange={(e) => setField(p.id, "from_email", e.target.value)} placeholder="noreply@dekhocampus.com" className="rounded-xl h-8 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">From Name</label>
                  <Input defaultValue={p.from_name} onChange={(e) => setField(p.id, "from_name", e.target.value)} placeholder="DekhoCampus" className="rounded-xl h-8 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">Reply-To</label>
                  <Input defaultValue={p.reply_to} onChange={(e) => setField(p.id, "reply_to", e.target.value)} placeholder="support@dekhocampus.com" className="rounded-xl h-8 text-xs mt-0.5" />
                </div>
              </div>

              {hasChanges && (
                <div className="flex justify-end mt-3">
                  <Button size="sm" className="rounded-xl h-8" onClick={() => { save.mutate({ id: p.id, updates: fields }); setEdits((prev) => ({ ...prev, [p.id]: {} })); }}>
                    <Save className="w-3.5 h-3.5 mr-1" /> Save Changes
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold mb-2">Send test email</h3>
        <div className="flex gap-2">
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="rounded-xl" />
          <Button onClick={sendTest} disabled={testing} className="rounded-xl gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Uses the active provider above. SES sandbox requires the recipient to be verified too.</p>
      </div>
    </AdminLayout>
  );
}
