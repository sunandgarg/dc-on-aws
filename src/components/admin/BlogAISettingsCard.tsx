import { useEffect, useState } from "react";
import { Image, Loader2, Newspaper, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type State = { text_model: string; image_model: string; image_quality: "low" | "medium" | "high"; claude_key_set: boolean; openai_key_set: boolean };
const defaults: State = { text_model: "auto-sonnet", image_model: "gpt-image-1", image_quality: "medium", claude_key_set: false, openai_key_set: false };

const TEXT_MODELS = {
  anthropic: [
    { value: "auto-haiku", label: "Claude Haiku - latest available" },
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
  ],
} as const;

function inferProvider(model: string) {
  const value = String(model || "").toLowerCase();
  if (value.startsWith("gemini")) return "gemini" as const;
  return value.startsWith("gpt") || value.startsWith("o") ? "openai" as const : "anthropic" as const;
}


export function BlogAISettingsCard() {
  const [settings, setSettings] = useState(defaults);
  const [claudeKey, setClaudeKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const textProvider = inferProvider(settings.text_model);
  const textModelOptions = TEXT_MODELS[textProvider];

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("admin-blog-ai-settings", { method: "GET" });
    if (!error && data && !data.error) setSettings({ ...defaults, ...data });
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-blog-ai-settings", { body: { claude_api_key: claudeKey, openai_api_key: openaiKey, text_model: settings.text_model, image_model: settings.image_model, image_quality: settings.image_quality } });
      if (error || data?.error) throw error || new Error(data.error);
      setClaudeKey(""); setOpenaiKey(""); await load(); toast.success("Blog AI keys encrypted and saved");
    } catch (error: any) { toast.error(error.message || "Could not save blog AI settings"); }
    finally { setBusy(false); }
  };

  return <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/40 p-5 dark:border-orange-900 dark:bg-orange-950/10">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Newspaper className="h-5 w-5 text-orange-500" /> Blog-only AI providers</h2><p className="mt-1 text-sm text-muted-foreground">Set the default text provider for blog/news generation here, then fine-tune per feature in the Runtime Control Centre above. OpenAI GPT Image continues to power branded DekhoCampus editorial backdrops. Keys are write-only and encrypted before database storage.</p></div><div className="flex gap-2"><Badge variant={settings.claude_key_set ? "default" : "destructive"}>Claude {settings.claude_key_set ? "ready" : "missing"}</Badge><Badge variant="outline">Gemini via env/runtime</Badge><Badge variant={settings.openai_key_set ? "default" : "destructive"}>OpenAI {settings.openai_key_set ? "ready" : "missing"}</Badge></div></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <Label className="flex items-center gap-2"><Newspaper className="h-4 w-4" /> Claude API key</Label>
        <Input type="password" autoComplete="new-password" value={claudeKey} onChange={event => setClaudeKey(event.target.value)} placeholder={settings.claude_key_set ? "Leave blank to keep current key" : "Paste a new Claude key"} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Default text provider</Label><Select value={textProvider} onValueChange={(provider: "anthropic" | "gemini" | "openai") => setSettings({ ...settings, text_model: TEXT_MODELS[provider][0].value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="anthropic">Claude</SelectItem><SelectItem value="gemini">Google Gemini</SelectItem><SelectItem value="openai">OpenAI / GPT</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Default text model</Label><Select value={settings.text_model} onValueChange={(value) => setSettings({ ...settings, text_model: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{textModelOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <p className="text-xs text-muted-foreground">Use the runtime controls above when you want a different provider per feature like Blog Studio, Auto Blog Agent or Data Cleaner.</p>
      </div>
      <div className="space-y-3"><Label className="flex items-center gap-2"><Image className="h-4 w-4" /> OpenAI API key</Label><Input type="password" autoComplete="new-password" value={openaiKey} onChange={event => setOpenaiKey(event.target.value)} placeholder={settings.openai_key_set ? "Leave blank to keep current key" : "Paste a new OpenAI key"} /><div className="grid grid-cols-[1fr_auto] gap-2"><div><Label>Image model</Label><Input value={settings.image_model} onChange={event => setSettings({ ...settings, image_model: event.target.value })} /></div><div><Label>Quality</Label><select value={settings.image_quality} onChange={event => setSettings({ ...settings, image_quality: event.target.value as State["image_quality"] })} className="mt-0 h-10 rounded-md border bg-background px-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div></div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Existing keys are never returned to the browser.</span><Button onClick={save} disabled={busy} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save blog AI settings</Button></div>
  </div>;
}
