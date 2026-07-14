import { useState } from "react";
import { ShieldCheck, ShieldOff, FlaskConical, Loader2, Phone, MessageSquare, Layers, Plus, Eye, EyeOff, Trash2, Save, ExternalLink, CheckCircle2, AlertCircle, Settings2 } from "lucide-react";
import { useLeadFormSettings, useUpdateLeadOtpMode, useUpdateLeadChannel, useUpdateFormOverride, LEAD_FORM_KEYS, type LeadOtpMode, type LeadChannelPreference } from "@/hooks/useLeadFormSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const MODE_OPTIONS: Array<{ value: LeadOtpMode; label: string; desc: string; icon: any; tone: string }> = [
  { value: "on", label: "On", desc: "Send a real OTP before saving any lead.", icon: ShieldCheck, tone: "text-emerald-600" },
  { value: "test", label: "Test", desc: "Show OTP screen, accept any 6-digit code (no SMS cost).", icon: FlaskConical, tone: "text-amber-600" },
  { value: "off", label: "Off", desc: "Skip OTP - save leads directly on submit.", icon: ShieldOff, tone: "text-muted-foreground" },
];

const CHANNEL_OPTIONS: Array<{ value: LeadChannelPreference; label: string; desc: string; icon: any }> = [
  { value: "sms", label: "SMS Only", desc: "Use the active SMS provider.", icon: Phone },
  { value: "whatsapp", label: "WhatsApp Only", desc: "Use the active WhatsApp provider.", icon: MessageSquare },
  { value: "both", label: "Both", desc: "Send via SMS and WhatsApp together.", icon: Layers },
];

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
  config_json?: Record<string, any>;
}

export function LeadOtpModeCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useLeadFormSettings();
  const modeMutation = useUpdateLeadOtpMode();
  const channelMutation = useUpdateLeadChannel();
  const currentMode = data?.otp_mode ?? "off";
  const currentChannel = data?.channel_preference ?? "sms";

  const { data: providers, isLoading: provLoading } = useQuery({
    queryKey: ["otp-providers-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("otp_providers")
        .select("id, channel, provider_name, display_name, api_key, api_secret, sender_id, base_url, template_id, is_active, icon_emoji, config_json")
        .order("channel", { ascending: true });
      if (error) throw error;
      return (data || []) as OtpProvider[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ provider, is_active }: { provider: OtpProvider; is_active: boolean }) => {
      if (is_active && provider.provider_name === "fast2sms" && !provider.api_key) {
        throw new Error("Add the Fast2SMS Authorization Key before activating it.");
      }
      if (is_active) {
        const { error: clearError } = await supabase.from("otp_providers").update({ is_active: false }).eq("channel", provider.channel);
        if (clearError) throw clearError;
      }
      const { error } = await supabase.from("otp_providers").update({ is_active }).eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["otp-providers-overview"] }),
    onError: (e: any) => toast.error(e.message || "Could not update provider"),
  });

  const deleteProv = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("otp_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["otp-providers-overview"] });
      toast.success("Provider removed");
    },
  });

  const [showAdd, setShowAdd] = useState<null | "sms" | "whatsapp">(null);
  const [newP, setNewP] = useState({
    provider_name: "",
    display_name: "",
    api_key: "",
    api_secret: "",
    sender_id: "",
    base_url: "",
    template_id: "",
    config_json: {} as Record<string, any>,
  });
  const resetNew = () => setNewP({ provider_name: "", display_name: "", api_key: "", api_secret: "", sender_id: "", base_url: "", template_id: "", config_json: {} });

  const createProv = useMutation({
    mutationFn: async (channel: "sms" | "whatsapp") => {
      const { error } = await supabase.from("otp_providers").insert({
        ...newP,
        channel,
        icon_emoji: channel === "whatsapp" ? "💬" : newP.provider_name === "fast2sms" ? "⚡" : "📱",
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider added & activated");
      qc.invalidateQueries({ queryKey: ["otp-providers-overview"] });
      setShowAdd(null);
      resetNew();
    },
    onError: (e: any) => toast.error(e.message || "Add failed"),
  });

  const sms = (providers || []).filter((p) => p.channel === "sms");
  const wa = (providers || []).filter((p) => p.channel === "whatsapp");
  const activeSms = sms.find((p) => p.is_active && p.api_key);
  const activeWa = wa.find((p) => p.is_active && p.api_key);

  const channelReady =
    currentChannel === "sms" ? !!activeSms :
    currentChannel === "whatsapp" ? !!activeWa :
    !!(activeSms || activeWa);

  const setMode = async (v: LeadOtpMode) => {
    if (v === currentMode) return;
    if (v === "on" && !channelReady) {
      toast.error("Configure at least one active provider for the selected channel before turning OTP On.");
      return;
    }
    try {
      await modeMutation.mutateAsync(v);
      toast.success(`Lead OTP set to ${v.toUpperCase()}`);
    } catch (e: any) { toast.error(e?.message || "Could not update"); }
  };

  const setChannel = async (v: LeadChannelPreference) => {
    if (v === currentChannel) return;
    try {
      await channelMutation.mutateAsync(v);
      toast.success(`Channel set to ${v.toUpperCase()}`);
    } catch (e: any) { toast.error(e?.message || "Could not update"); }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Lead Form OTP Verification
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Controls mobile-number verification across every lead form (AI chat, sidebar, popup, landing pages).
          </p>
        </div>
        {(isLoading || modeMutation.isPending || channelMutation.isPending) && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Mode */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Verification Mode</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MODE_OPTIONS.map((opt) => {
            const active = currentMode === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                disabled={modeMutation.isPending}
                aria-pressed={active}
                className={`text-left rounded-xl border p-3 transition-all ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:bg-muted/60"}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${active ? "text-primary" : opt.tone}`} />
                  <span className="font-semibold text-sm text-foreground">{opt.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel preference */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Delivery Channel</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CHANNEL_OPTIONS.map((opt) => {
            const active = currentChannel === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setChannel(opt.value)}
                disabled={channelMutation.isPending}
                aria-pressed={active}
                className={`text-left rounded-xl border p-3 transition-all ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:bg-muted/60"}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-semibold text-sm text-foreground">{opt.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-form channel overrides */}
      <PerFormOverrides currentChannel={currentChannel} />



      {/* Providers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Providers</div>
          <Link to="/admin/otp-providers" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            Full settings <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {provLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ProviderColumn
              title="SMS"
              icon={Phone}
              channel="sms"
              providers={sms}
              active={activeSms}
              onToggle={(provider, v) => toggleActive.mutate({ provider, is_active: v })}
              onDelete={(id) => { if (confirm("Remove this provider?")) deleteProv.mutate(id); }}
              onAdd={() => setShowAdd("sms")}
            />
            <ProviderColumn
              title="WhatsApp"
              icon={MessageSquare}
              channel="whatsapp"
              providers={wa}
              active={activeWa}
              onToggle={(provider, v) => toggleActive.mutate({ provider, is_active: v })}
              onDelete={(id) => { if (confirm("Remove this provider?")) deleteProv.mutate(id); }}
              onAdd={() => setShowAdd("whatsapp")}
            />
          </div>
        )}

        {currentMode === "on" && !channelReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs p-2.5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>OTP is set to <strong>On</strong> but no active provider is configured for the selected channel. Add one below or switch to Test mode.</span>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="mt-4 bg-muted/40 rounded-xl border border-primary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Add {showAdd === "sms" ? "SMS" : "WhatsApp"} Provider</h4>
            <Button variant="ghost" size="sm" onClick={() => { setShowAdd(null); resetNew(); }}>Cancel</Button>
          </div>
          {showAdd === "sms" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNewP({
                    provider_name: "aquarite",
                    display_name: "Aquarite SMS",
                    api_key: "Dekhocampus",
                    api_secret: "",
                    sender_id: "DKCMPS",
                    base_url: "",
                    template_id: "1205162271156991282",
                    config_json: {},
                  })}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 font-medium"
                >
                  ⚡ Quick fill: Aquarite
                </button>
                <span className="text-[10px] text-muted-foreground self-center">Spec: GET {`{base_url}/fe/api/v1/send`} - paste the API host shown on your panel's HTTP API page.</span>
              </div>
              <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                <strong>Important:</strong> Base URL must be the exact API host from your Aquarite panel (e.g. <code>http://sms.yourreseller.in</code>). The public site <code>nimbusit.biz</code> does not host the API and will return 404. Login → HTTP API → copy the URL shown.
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Provider key (e.g. aquarite, twilio, msg91, gupshup)" value={newP.provider_name} onChange={(e) => setNewP({ ...newP, provider_name: e.target.value })} className="rounded-lg h-9 text-xs" />
            <Input placeholder="Display name" value={newP.display_name} onChange={(e) => setNewP({ ...newP, display_name: e.target.value })} className="rounded-lg h-9 text-xs" />
            <Input placeholder={newP.provider_name === "aquarite" ? "Aquarite Username" : "API Key / Account SID"} value={newP.api_key} onChange={(e) => setNewP({ ...newP, api_key: e.target.value })} className="rounded-lg h-9 text-xs font-mono" />
            <Input placeholder={newP.provider_name === "aquarite" ? "Aquarite Password" : "API Secret / Auth Token"} value={newP.api_secret} onChange={(e) => setNewP({ ...newP, api_secret: e.target.value })} className="rounded-lg h-9 text-xs font-mono" />
            <Input placeholder={showAdd === "whatsapp" ? "WhatsApp sender number" : "Sender ID (6 alpha chars)"} value={newP.sender_id} onChange={(e) => setNewP({ ...newP, sender_id: e.target.value })} className="rounded-lg h-9 text-xs" />
            <Input placeholder={newP.provider_name === "aquarite" ? "DLT Template ID" : "Template ID (optional)"} value={newP.template_id} onChange={(e) => setNewP({ ...newP, template_id: e.target.value })} className="rounded-lg h-9 text-xs" />
            <Input placeholder={newP.provider_name === "aquarite" ? "Base URL from panel (e.g. http://sms.your-host.in)" : "Base URL (optional)"} value={newP.base_url} onChange={(e) => setNewP({ ...newP, base_url: e.target.value })} className="rounded-lg h-9 text-xs sm:col-span-2" />
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="rounded-lg" disabled={!newP.provider_name || !newP.display_name || !newP.api_key || createProv.isPending} onClick={() => createProv.mutate(showAdd)}>
              {createProv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" /> Save & Activate</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderColumn({
  title, icon: Icon, channel, providers, active, onToggle, onDelete, onAdd,
}: {
  title: string;
  icon: any;
  channel: "sms" | "whatsapp";
  providers: OtpProvider[];
  active?: OtpProvider;
  onToggle: (provider: OtpProvider, v: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{title}</span>
          {active ? (
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">Not Configured</Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {providers.length === 0 ? (
        <p className="text-[11px] text-muted-foreground px-1 py-3">No {title} provider yet. Click <strong>Add</strong> to connect one.</p>
      ) : (
        <ul className="space-y-1.5">
          {providers.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2">
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{p.display_name || p.provider_name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {p.api_key ? `Key •••${p.api_key.slice(-4)}` : "Key missing"} {p.sender_id ? `· ${p.sender_id}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch checked={p.is_active} onCheckedChange={(v) => onToggle(p, v)} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(p.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PerFormOverrides({ currentChannel }: { currentChannel: LeadChannelPreference }) {
  const { data } = useLeadFormSettings();
  const mutate = useUpdateFormOverride();
  const overrides = data?.form_overrides || {};
  const channels: Array<{ value: LeadChannelPreference | "default"; label: string }> = [
    { value: "default", label: "Global" },
    { value: "sms", label: "SMS" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "both", label: "Both" },
  ];

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Per-Form Channel Override
        </div>
        <span className="text-[10px] text-muted-foreground">- falls back to Global ({currentChannel.toUpperCase()})</span>
      </div>
      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {LEAD_FORM_KEYS.map((f) => {
          const current = overrides[f.key];
          return (
            <div key={f.key} className="flex items-center justify-between gap-3 p-2.5 bg-background hover:bg-muted/40">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{f.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{f.description}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {channels.map((c) => {
                  const active = c.value === "default" ? !current : current === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      disabled={mutate.isPending}
                      onClick={() => mutate.mutate({ formKey: f.key, channel: c.value === "default" ? null : (c.value as LeadChannelPreference) })}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
