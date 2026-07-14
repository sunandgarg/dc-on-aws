import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Power, ShieldCheck, Square } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Control = {
  feature: string;
  display_name: string;
  is_enabled: boolean;
  provider: string | null;
  model: string | null;
  stop_reason: string | null;
  updated_at: string;
};

const PROVIDERS: Record<string, string[]> = {
  counselor: ["gemini"],
  "data-cleaner": ["anthropic"],
  "blog-studio": ["anthropic"],
  "blog-agent": ["anthropic"],
  "admin-ai-generate": ["anthropic", "gemini", "openai"],
  "blog-image": ["openai"],
};

const MODELS: Record<string, Array<{ value: string; label: string }>> = {
  anthropic: [
    { value: "auto-haiku", label: "Claude Haiku - latest available ($1 / $5 per MTok)" },
    { value: "auto-sonnet", label: "Claude Sonnet - latest available" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  ],
  gemini: [
    { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  openai: [
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { value: "gpt-image-1", label: "GPT Image 1" },
  ],
};

export function AIRuntimeControls() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["ai-runtime-controls"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ai_runtime_controls").select("*").order("feature");
      if (error) throw error;
      return (data || []) as Control[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ feature, values }: { feature: string; values: Partial<Control> }) => {
      const { error } = await (supabase as any).from("ai_runtime_controls").update({ ...values, updated_at: new Date().toISOString() }).eq("feature", feature);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-runtime-controls"] });
      toast.success("AI runtime control saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const emergency = useMutation({
    mutationFn: async (stopped: boolean) => {
      const { error } = await (supabase as any).rpc("set_ai_emergency_stop", {
        _stopped: stopped,
        _reason: stopped ? "Emergency stop from Admin - AI Providers" : null,
      });
      if (error) throw error;
    },
    onSuccess: (_, stopped) => {
      queryClient.invalidateQueries({ queryKey: ["ai-runtime-controls"] });
      toast.success(stopped ? "AI stopped - new calls and background work are blocked" : "AI calls resumed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const global = data.find((row) => row.feature === "global");
  const globallyEnabled = global?.is_enabled !== false;
  const features = data.filter((row) => row.feature !== "global");

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className={`flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between ${globallyEnabled ? "bg-emerald-50/50" : "bg-destructive/5"}`}>
        <div className="flex items-start gap-3">
          {globallyEnabled ? <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />}
          <div>
            <div className="flex items-center gap-2"><h2 className="font-semibold">AI Runtime Control Centre</h2><Badge variant={globallyEnabled ? "outline" : "destructive"}>{globallyEnabled ? "Running" : "Stopped"}</Badge></div>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">Emergency stop blocks every new provider call, cancels queued data-cleaning work and disables the auto-blog agent. A provider request already sent may still return once.</p>
          </div>
        </div>
        <Button disabled={emergency.isPending || isLoading} variant={globallyEnabled ? "destructive" : "default"} className="rounded-xl" onClick={() => emergency.mutate(globallyEnabled)}>
          {emergency.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : globallyEnabled ? <Square className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
          {globallyEnabled ? "Stop all AI now" : "Resume AI"}
        </Button>
      </div>

      <div className="divide-y">
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : features.map((control) => {
          const providers = PROVIDERS[control.feature] || [];
          const provider = control.provider || providers[0] || "anthropic";
          const models = (MODELS[provider] || []).filter((item) => control.feature === "blog-image" ? item.value.includes("image") : !item.value.includes("image"));
          return (
            <div key={control.feature} className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_minmax(280px,1fr)_auto] lg:items-center">
              <div><p className="text-sm font-medium">{control.display_name}</p><p className="text-[11px] text-muted-foreground">{control.feature}</p></div>
              <Select value={provider} onValueChange={(next) => update.mutate({ feature: control.feature, values: { provider: next, model: MODELS[next]?.[0]?.value || null } })}>
                <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{providers.map((item) => <SelectItem key={item} value={item}>{item === "anthropic" ? "Claude" : item === "gemini" ? "Google Gemini" : "OpenAI"}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={control.model || models[0]?.value} onValueChange={(model) => update.mutate({ feature: control.feature, values: { model } })}>
                <SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="Use provider default" /></SelectTrigger>
                <SelectContent>{models.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-2 lg:justify-end"><span className="text-xs text-muted-foreground">{control.is_enabled ? "On" : "Paused"}</span><Switch checked={control.is_enabled} disabled={!globallyEnabled || update.isPending} onCheckedChange={(is_enabled) => update.mutate({ feature: control.feature, values: { is_enabled, stop_reason: is_enabled ? null : "Paused from Admin - AI Providers" } })} /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
