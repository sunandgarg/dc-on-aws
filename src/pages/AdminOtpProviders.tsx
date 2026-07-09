import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Loader2, Shield, MessageSquare, Phone, Plus, Trash2, Zap, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CSVTools } from "@/components/CSVTools";
interface OtpProvider {
  id: string;
  channel: string;
  provider_name: string;
  display_name: string;
  api_key: string;
  api_secret: string;
  sender_id: string;
  base_url: string;
  template_id: string;
  is_active: boolean;
  icon_emoji: string;
  config_json: Record<string, any>;
  updated_at: string;
}

export default function AdminOtpProviders() {
  const queryClient = useQueryClient();
  const [editFields, setEditFields] = useState<Record<string, Record<string, any>>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newP, setNewP] = useState({ provider_name: "", display_name: "", channel: "sms", api_key: "", api_secret: "", sender_id: "", base_url: "", template_id: "", icon_emoji: "📱", config_json: {} as Record<string, any> });

  const { data: providers, isLoading } = useQuery({
    queryKey: ["otp-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("otp_providers")
        .select("*")
        .order("channel", { ascending: true });
      if (error) throw error;
      return data as OtpProvider[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OtpProvider> }) => {
      const { error } = await supabase.from("otp_providers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-providers"] });
      toast.success("Provider updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async (p: typeof newP) => {
      const { error } = await supabase.from("otp_providers").insert(p as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-providers"] });
      toast.success("Provider added");
      setShowAdd(false);
      setNewP({ provider_name: "", display_name: "", channel: "sms", api_key: "", api_secret: "", sender_id: "", base_url: "", template_id: "", icon_emoji: "📱", config_json: {} });
    },
    onError: (err: Error) => toast.error("Add failed: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("otp_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-providers"] });
      toast.success("Provider deleted");
    },
    onError: (err: Error) => toast.error("Delete failed: " + err.message),
  });

  const handleSave = (provider: OtpProvider) => {
    const fields = editFields[provider.id];
    if (!fields || Object.keys(fields).length === 0) return;
    updateMutation.mutate({ id: provider.id, updates: fields as any });
    setEditFields(prev => ({ ...prev, [provider.id]: {} }));
  };

  const setActiveMutation = useMutation({
    mutationFn: async ({ provider, next }: { provider: OtpProvider; next: boolean }) => {
      if (next && provider.provider_name === "fast2sms" && (!provider.api_key || !provider.sender_id)) {
        throw new Error("Add Fast2SMS Authorization Key and DLT-approved Sender ID before activating it.");
      }
      if (next && provider.provider_name === "msg91" && (!provider.api_key || !provider.template_id)) {
        throw new Error("Add MSG91 Auth Key (API Key) and DLT Template ID before activating it.");
      }
      if (next) {
        const { error: clearError } = await supabase
          .from("otp_providers")
          .update({ is_active: false })
          .eq("channel", provider.channel);
        if (clearError) throw clearError;
      }
      const { error } = await supabase
        .from("otp_providers")
        .update({ is_active: next })
        .eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-providers"] });
      toast.success("Active OTP provider updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createFast2SmsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("otp_providers").insert({
        channel: "sms",
        provider_name: "fast2sms",
        display_name: "OTP Integration with Fast2SMS",
        api_key: "",
        api_secret: "",
        sender_id: "",
        base_url: "https://www.fast2sms.com",
        template_id: "",
        icon_emoji: "⚡",
        is_active: false,
        config_json: { fast2sms_route: "dlt", variables_order: ["otp", "expiry"], otp_length: 6, otp_expiry_minutes: 10, max_verify_attempts: 5, resend_cooldown_seconds: 30, whatsapp_api_version: "v24.0" },
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-providers"] });
      toast.success("Fast2SMS integration added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMsg91Mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("otp_providers").insert({
        channel: "sms",
        provider_name: "msg91",
        display_name: "OTP Integration with MSG91",
        api_key: "",
        api_secret: "",
        sender_id: "",
        base_url: "https://control.msg91.com",
        template_id: "",
        icon_emoji: "📨",
        is_active: false,
        config_json: { otp_length: 6, otp_expiry_minutes: 10, max_verify_attempts: 5, resend_cooldown_seconds: 30, msg91_retrytype: "text" },
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-providers"] });
      toast.success("MSG91 integration added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setField = (id: string, key: string, value: string) => {
    setEditFields(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }));
  };

  const setConfigField = (provider: OtpProvider, key: string, value: any) => {
    const draftCfg = (editFields[provider.id]?.config_json as any) ?? provider.config_json ?? {};
    const merged = { ...draftCfg, [key]: value };
    setEditFields(prev => ({
      ...prev,
      [provider.id]: { ...(prev[provider.id] || {}), config_json: merged as any },
    }));
  };
  const getConfigVal = (provider: OtpProvider, key: string, fallback: any = "") => {
    const draft = editFields[provider.id]?.config_json as any;
    if (draft && key in draft) return draft[key];
    return provider.config_json?.[key] ?? fallback;
  };

  const maskKey = (key: string) => {
    if (!key) return "Not set";
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  const smsProviders = providers?.filter(p => p.channel === "sms") || [];
  const whatsappProviders = providers?.filter(p => p.channel === "whatsapp") || [];
  const fast2SmsProvider = smsProviders.find(p => p.provider_name === "fast2sms");
  const msg91Provider = smsProviders.find(p => p.provider_name === "msg91");


  const renderProvider = (provider: OtpProvider) => {
    const fields = editFields[provider.id] || {};
    const hasChanges = Object.keys(fields).length > 0;

    return (
      <div
        key={provider.id}
        className={`bg-card rounded-2xl border p-5 transition-all ${
          provider.is_active ? "border-primary/30 shadow-sm" : "border-border"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider.icon_emoji}</span>
            <div>
              <h3 className="font-semibold text-foreground">{provider.display_name}</h3>
              <p className="text-xs text-muted-foreground">
                {provider.provider_name} • {provider.channel.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {provider.api_key ? (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">Configured</Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">Not Set</Badge>
            )}
            <Switch
              checked={provider.is_active}
              onCheckedChange={(next) => setActiveMutation.mutate({ provider, next })}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => { if (confirm(`Delete ${provider.display_name}?`)) deleteMutation.mutate(provider.id); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">API Key</label>
            <div className="flex gap-1 mt-0.5">
              <Input
                type={showKeys[provider.id] ? "text" : "password"}
                defaultValue={provider.api_key}
                onChange={e => setField(provider.id, "api_key", e.target.value)}
                placeholder="Enter API Key..."
                className="rounded-xl h-8 text-xs font-mono"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}>
                {showKeys[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">API Secret</label>
            <div className="flex gap-1 mt-0.5">
              <Input
                type={showSecrets[provider.id] ? "text" : "password"}
                defaultValue={provider.api_secret}
                onChange={e => setField(provider.id, "api_secret", e.target.value)}
                placeholder="Enter API Secret..."
                className="rounded-xl h-8 text-xs font-mono"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                onClick={() => setShowSecrets(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}>
                {showSecrets[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Sender ID / Number</label>
            <Input
              defaultValue={provider.sender_id}
              onChange={e => setField(provider.id, "sender_id", e.target.value)}
              placeholder="e.g. DEKHOC or +91..."
              className="rounded-xl h-8 text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Template / OTP ID</label>
            <Input
              defaultValue={provider.template_id}
              onChange={e => setField(provider.id, "template_id", e.target.value)}
              placeholder="Fast2SMS Message ID for DLT or otp_id for OTP route"
              className="rounded-xl h-8 text-xs mt-0.5"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Base URL</label>
            <Input
              defaultValue={provider.base_url}
              onChange={e => setField(provider.id, "base_url", e.target.value)}
              placeholder="https://api.provider.com"
              className="rounded-xl h-8 text-xs mt-0.5"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">DLT-Approved Message Template</label>
            <textarea
              key={provider.id + "-tpl"}
              defaultValue={getConfigVal(provider, "text_template", "DEKHOCAMPUS: Your OTP for verification is {{otp}}. Valid for {{expiry}} minutes. Do not share this OTP with anyone.")}
              onChange={e => setConfigField(provider, "text_template", e.target.value)}
              placeholder="DEKHOCAMPUS: Your OTP for verification is {{otp}}. Valid for {{expiry}} minutes. Do not share this OTP with anyone."
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs mt-0.5 font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use <code>{`{{otp}}`}</code> for the code and <code>{`{{expiry}}`}</code> for minutes. Must match exactly what you registered on the DLT portal.
            </p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">DLT Entity ID (Reference)</label>
            <Input
              defaultValue={getConfigVal(provider, "dlt_content_id", "")}
              onChange={e => setConfigField(provider, "dlt_content_id", e.target.value)}
              placeholder="e.g. 1707171234567890123"
              className="rounded-xl h-8 text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fast2SMS Message ID (DLT)</label>
            <Input
              defaultValue={getConfigVal(provider, "message_id", "")}
              onChange={e => setConfigField(provider, "message_id", e.target.value)}
              placeholder="Message ID from Fast2SMS DLT Manager"
              className="rounded-xl h-8 text-xs mt-0.5"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Required by Fast2SMS DLT API. If empty, backend auto-fetches the approved Message ID from DLT Manager.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">DLT Template Variables Order</label>
            <div className="flex gap-2 mt-0.5">
              <select
                defaultValue={((getConfigVal(provider, "variables_order", ["otp", "expiry"]) as string[])[0]) || "otp"}
                onChange={e => {
                  const cur = ((editFields[provider.id]?.config_json as any)?.variables_order as string[]) || (provider.config_json?.variables_order as string[]) || ["otp", "expiry"];
                  setConfigField(provider, "variables_order", [e.target.value, cur[1] || "expiry"]);
                }}
                className="flex-1 rounded-xl border border-input bg-background h-8 px-2 text-xs"
              >
                <option value="otp">{"{#var#} 1 → OTP code"}</option>
                <option value="expiry">{"{#var#} 1 → Time to exhaust (minutes)"}</option>
              </select>
              <select
                defaultValue={((getConfigVal(provider, "variables_order", ["otp", "expiry"]) as string[])[1]) || "expiry"}
                onChange={e => {
                  const cur = ((editFields[provider.id]?.config_json as any)?.variables_order as string[]) || (provider.config_json?.variables_order as string[]) || ["otp", "expiry"];
                  setConfigField(provider, "variables_order", [cur[0] || "otp", e.target.value]);
                }}
                className="flex-1 rounded-xl border border-input bg-background h-8 px-2 text-xs"
              >
                <option value="expiry">{"{#var#} 2 → Time to exhaust (minutes)"}</option>
                <option value="otp">{"{#var#} 2 → OTP code"}</option>
              </select>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Maps each <code>{"{#var#}"}</code> placeholder in your DLT-approved template (in order). Default matches: "Your OTP is <code>{"{#var#}"}</code>. Valid for <code>{"{#var#}"}</code> minutes."
            </p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">OTP Expiry (minutes)</label>
            <Input
              type="number" min={1} max={10080}
              defaultValue={getConfigVal(provider, "otp_expiry_minutes", provider.provider_name === "fast2sms" ? 15 : 10)}
              onChange={e => setConfigField(provider, "otp_expiry_minutes", Number(e.target.value) || 10)}
              className="rounded-xl h-8 text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">OTP Length (4–10)</label>
            <Input
              type="number" min={4} max={10}
              defaultValue={getConfigVal(provider, "otp_length", 6)}
              onChange={e => setConfigField(provider, "otp_length", Number(e.target.value) || 6)}
              className="rounded-xl h-8 text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Max Verify Attempts (per OTP)</label>
            <Input
              type="number" min={1} max={100}
              defaultValue={getConfigVal(provider, "max_verify_attempts", 5)}
              onChange={e => setConfigField(provider, "max_verify_attempts", Math.min(100, Math.max(1, Number(e.target.value) || 5)))}
              className="rounded-xl h-8 text-xs mt-0.5"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">How many times a user can attempt to verify a single OTP. Min 1, Max 100.</p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">SMS Resend Cooldown (seconds)</label>
            <Input
              type="number" min={10} max={3600}
              defaultValue={getConfigVal(provider, "resend_cooldown_seconds", 30)}
              onChange={e => setConfigField(provider, "resend_cooldown_seconds", Math.min(3600, Math.max(10, Number(e.target.value) || 30)))}
              className="rounded-xl h-8 text-xs mt-0.5"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Time limit between sending two SMS to the same number with the same template. Min 10s, Max 3600s (1 hour).</p>
          </div>
          {provider.provider_name === "fast2sms" && (
            <>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">WABA ID</label>
                <Input
                  defaultValue={getConfigVal(provider, "waba_id", "")}
                  onChange={e => setConfigField(provider, "waba_id", e.target.value)}
                  placeholder="WhatsApp Business Account ID"
                  className="rounded-xl h-8 text-xs mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Phone Number ID</label>
                <Input
                  defaultValue={getConfigVal(provider, "phone_number_id", "")}
                  onChange={e => setConfigField(provider, "phone_number_id", e.target.value)}
                  placeholder="Fast2SMS / Meta phone_number_id"
                  className="rounded-xl h-8 text-xs mt-0.5"
                />
              </div>
              <div className="sm:col-span-2 rounded-xl bg-primary/5 border border-primary/20 p-3 text-[11px] text-foreground">
                <p className="font-semibold mb-1">⚡ Fast2SMS Setup</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground">
                  <li>Get your authorization key from <a className="underline" href="https://www.fast2sms.com/dashboard/dev-api" target="_blank" rel="noreferrer">Fast2SMS → Dev API</a> and paste it in <b>API Key</b>.</li>
                  <li>Add your approved Sender ID + content template in Fast2SMS DLT Manager.</li>
                  <li>For DLT sending, paste Fast2SMS <b>Message ID</b> or leave it empty so the backend auto-fetches it by Sender ID + template text.</li>
                  <li>The only two variables are mapped as <code>otp|expiry</code> by default.</li>
                  <li>WhatsApp metadata endpoints wired for WABA/template lookup and phone numbers.</li>
                </ol>
              </div>
            </>
          )}
          {provider.provider_name === "msg91" && (
            <>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Retry Type (resend)</label>
                <select
                  defaultValue={getConfigVal(provider, "msg91_retrytype", "text")}
                  onChange={e => setConfigField(provider, "msg91_retrytype", e.target.value)}
                  className="w-full h-8 rounded-xl border border-input bg-background px-3 text-xs mt-0.5"
                >
                  <option value="text">SMS (text)</option>
                  <option value="voice">Voice call</option>
                </select>
              </div>
              <div className="sm:col-span-2 rounded-xl bg-primary/5 border border-primary/20 p-3 text-[11px] text-foreground">
                <p className="font-semibold mb-1">📨 MSG91 Setup</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground">
                  <li>Get your <b>Auth Key</b> from <a className="underline" href="https://control.msg91.com/app/" target="_blank" rel="noreferrer">MSG91 → User Settings → Auth Key</a> and paste it in <b>API Key</b>.</li>
                  <li>Create a DLT-approved OTP template in MSG91 → Flow, then paste its <b>Template ID</b>.</li>
                  <li>Set <b>Sender ID</b> (6-char DLT-approved header, e.g. <code>DKCMPS</code>).</li>
                  <li>Endpoints wired: <code>POST /api/v5/otp</code> (send), <code>GET /api/v5/otp/verify</code>, <code>GET /api/v5/otp/retry</code>.</li>
                  <li>Mobile number is auto-prefixed with <code>91</code> country code.</li>
                </ol>
              </div>
            </>
          )}
        </div>

        {hasChanges && (
          <div className="flex justify-end mt-3">
            <Button size="sm" className="rounded-xl h-8" onClick={() => handleSave(provider)}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save Changes
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout title="OTP Providers">
      <div className="mb-4">
        <CSVTools table="otp_providers" filename="otp_providers.csv" columns="*" upsertKey="id" />
      </div>

      <MasterOtpSwitch />



      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-foreground space-y-1 flex-1">
            <p className="font-semibold">OTP Integration Guide</p>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              <li>Add ANY SMS or WhatsApp OTP provider - Twilio, MSG91, Gupshup, Fast2SMS, Aquarite, custom REST API, etc.</li>
              <li>Enter credentials, then toggle active - first active provider per channel is used</li>
              <li><b>Fast2SMS</b>: <code>provider_name=fast2sms</code>, API key = authorization key, Sender ID = DLT-approved header, Message ID = Fast2SMS DLT Manager message ID. Pipe-separated variables are auto-built as <code>{`{otp}|{expiry}`}</code>.</li>
              <li>For custom providers, set Base URL to your endpoint that accepts {`{phone, otp}`}</li>
            </ul>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="rounded-xl gap-1">
            <Plus className="w-4 h-4" /> Add Provider
          </Button>
        </div>
      </div>

      <div className="bg-card border border-primary/20 rounded-2xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">OTP Integration with Fast2SMS</h2>
                {fast2SmsProvider?.is_active ? (
                  <Badge className="rounded-full gap-1"><CheckCircle2 className="w-3 h-3" /> Active SMS route</Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full gap-1 border-border text-muted-foreground"><AlertCircle className="w-3 h-3" /> Not active yet</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Implements Fast2SMS DLT SMS exactly as <code>POST https://www.fast2sms.com/dev/bulkV2</code> with <code>authorization</code>, <code>sender_id</code>, <code>message</code>, <code>variables_values</code>, <code>route=dlt</code>, and <code>numbers</code>.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4 text-xs">
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">API Key</span><p className="font-medium text-foreground">Authorization header</p></div>
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">Message ID</span><p className="font-medium text-foreground">DLT Manager</p></div>
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">Default expiry</span><p className="font-medium text-foreground">10 minutes</p></div>
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">Variables</span><p className="font-medium text-foreground">OTP|expiry</p></div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" asChild className="rounded-xl gap-2">
              <a href="https://docs.fast2sms.com/reference/send-otp" target="_blank" rel="noreferrer">
                Docs <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            {!fast2SmsProvider && (
              <Button className="rounded-xl gap-2" onClick={() => createFast2SmsMutation.mutate()} disabled={createFast2SmsMutation.isPending}>
                {createFast2SmsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Fast2SMS
              </Button>
            )}
            {fast2SmsProvider && !fast2SmsProvider.is_active && (
              <Button className="rounded-xl gap-2" onClick={() => setActiveMutation.mutate({ provider: fast2SmsProvider, next: true })} disabled={setActiveMutation.isPending}>
                {setActiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Make Active
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-primary/20 rounded-2xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">OTP Integration with MSG91</h2>
                {msg91Provider?.is_active ? (
                  <Badge className="rounded-full gap-1"><CheckCircle2 className="w-3 h-3" /> Active SMS route</Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full gap-1 border-border text-muted-foreground"><AlertCircle className="w-3 h-3" /> Not active yet</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Implements MSG91 OTP v5 - <code>POST /api/v5/otp</code> (send), <code>GET /api/v5/otp/verify</code>, <code>GET /api/v5/otp/retry</code> with <code>authkey</code>, <code>template_id</code>, <code>mobile</code> (91-prefixed), <code>otp</code>, <code>otp_length</code>, <code>otp_expiry</code>.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4 text-xs">
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">API Key</span><p className="font-medium text-foreground">authkey header</p></div>
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">Template ID</span><p className="font-medium text-foreground">MSG91 DLT template</p></div>
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">Default expiry</span><p className="font-medium text-foreground">10 minutes</p></div>
                <div className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-muted-foreground">Resend</span><p className="font-medium text-foreground">text / voice</p></div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" asChild className="rounded-xl gap-2">
              <a href="https://docs.msg91.com/reference/sendotp" target="_blank" rel="noreferrer">
                Docs <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            {!msg91Provider && (
              <Button className="rounded-xl gap-2" onClick={() => createMsg91Mutation.mutate()} disabled={createMsg91Mutation.isPending}>
                {createMsg91Mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add MSG91
              </Button>
            )}
            {msg91Provider && !msg91Provider.is_active && (
              <Button className="rounded-xl gap-2" onClick={() => setActiveMutation.mutate({ provider: msg91Provider, next: true })} disabled={setActiveMutation.isPending}>
                {setActiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Make Active
              </Button>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5 mb-6 space-y-3">
          <h3 className="font-semibold text-foreground">Add OTP Provider</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Provider name (e.g. fast2sms)" value={newP.provider_name} onChange={e => setNewP({ ...newP, provider_name: e.target.value })} className="rounded-xl" />
            <Input placeholder="Display name (e.g. Fast2SMS)" value={newP.display_name} onChange={e => setNewP({ ...newP, display_name: e.target.value })} className="rounded-xl" />
            <select value={newP.channel} onChange={e => setNewP({ ...newP, channel: e.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <Input placeholder="Icon emoji" value={newP.icon_emoji} onChange={e => setNewP({ ...newP, icon_emoji: e.target.value })} className="rounded-xl" />
            <Input placeholder="API key" value={newP.api_key} onChange={e => setNewP({ ...newP, api_key: e.target.value })} className="rounded-xl font-mono" />
            <Input placeholder="API secret (optional)" value={newP.api_secret} onChange={e => setNewP({ ...newP, api_secret: e.target.value })} className="rounded-xl font-mono" />
            <Input placeholder="Sender ID / number" value={newP.sender_id} onChange={e => setNewP({ ...newP, sender_id: e.target.value })} className="rounded-xl" />
            <Input placeholder="Template ID (optional)" value={newP.template_id} onChange={e => setNewP({ ...newP, template_id: e.target.value })} className="rounded-xl" />
            <Input placeholder="Base URL (https://api.provider.com/...)" value={newP.base_url} onChange={e => setNewP({ ...newP, base_url: e.target.value })} className="rounded-xl sm:col-span-2" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => createMutation.mutate(newP)} disabled={!newP.provider_name || !newP.display_name} className="rounded-xl">
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="sms" className="space-y-4">
          <TabsList className="rounded-xl">
            <TabsTrigger value="sms" className="rounded-lg gap-2">
              <Phone className="w-4 h-4" /> SMS Providers ({smsProviders.length})
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="rounded-lg gap-2">
              <MessageSquare className="w-4 h-4" /> WhatsApp Providers ({whatsappProviders.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sms" className="space-y-4">
            {smsProviders.map(renderProvider)}
          </TabsContent>
          <TabsContent value="whatsapp" className="space-y-4">
            {whatsappProviders.map(renderProvider)}
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
}

function MasterOtpSwitch() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["lead-form-settings-otp-mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_form_settings")
        .select("id, otp_mode")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; otp_mode: string } | null;
    },
  });

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      const nextMode = enabled ? "on" : "off";
      if (settings?.id) {
        const { error } = await supabase
          .from("lead_form_settings")
          .update({ otp_mode: nextMode })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lead_form_settings")
          .insert({ singleton: true, otp_mode: nextMode } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-form-settings-otp-mode"] });
      toast.success("OTP sending updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enabled = settings?.otp_mode !== "off";

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">Send real SMS OTP</p>
          <p className="text-xs text-muted-foreground">
            Master switch. When OFF, no SMS is dispatched (cost saver). Master test code <b>123456</b> always works for verification.
          </p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={(v) => toggle.mutate(v)} disabled={toggle.isPending} />
    </div>
  );
}

