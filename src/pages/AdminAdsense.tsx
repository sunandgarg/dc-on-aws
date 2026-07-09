import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, MousePointerClick, TrendingUp, Settings as SettingsIcon, Megaphone, BarChart3 } from "lucide-react";
import { useDraftState } from "@/hooks/useDraftState";

/* ---------- Tab 1: Setup ---------- */
function SetupTab() {
  const [row, setRow] = useDraftState<any>('admin.adsense.row.v1', null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("adsense_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) setRow(data);
      else {
        const { data: created } = await (supabase as any)
          .from("adsense_settings")
          .insert({})
          .select()
          .single();
        setRow(created);
      }
    })();
  }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { id, created_at, updated_at, ...payload } = row;
    // Auto-derive client_id from publisher_id if missing
    if (!payload.client_id && payload.publisher_id) {
      payload.client_id = payload.publisher_id.startsWith("ca-")
        ? payload.publisher_id
        : `ca-${payload.publisher_id}`;
    }
    if (!payload.verification_meta && payload.client_id) {
      payload.verification_meta = payload.client_id;
    }
    const { error } = await (supabase as any)
      .from("adsense_settings")
      .update(payload)
      .eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setRow({ ...row, ...payload }); }
  };

  if (!row) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const upd = (k: string, v: any) => setRow({ ...row, [k]: v });

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="font-semibold">Step 1 - Your AdSense Publisher ID</h3>
          <p className="text-sm text-muted-foreground">Paste your AdSense ID. We'll handle the rest automatically.</p>
        </div>
        <div>
          <Label>Publisher ID</Label>
          <Input
            value={row.publisher_id || ""}
            onChange={(e) => upd("publisher_id", e.target.value)}
            placeholder="pub-4858806955717066"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Found in AdSense → Account. Example: <code>pub-4858806955717066</code>
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Step 2 - Turn ads on or off</h3>
        {[
          ["ads_globally_enabled", "Show ads on the website"],
          ["auto_ads_enabled", "Let Google place ads automatically (recommended)"],
          ["enabled_on_mobile", "Show on mobile"],
          ["enabled_on_desktop", "Show on desktop"],
          ["lazy_load_enabled", "Load ads only when visible (faster site)"],
        ].map(([k, lbl]) => (
          <div key={k} className="flex items-center justify-between border rounded-lg px-3 py-2">
            <Label className="cursor-pointer">{lbl}</Label>
            <Switch checked={!!row[k]} onCheckedChange={(v) => upd(k, v)} />
          </div>
        ))}
      </Card>

      <Card className="p-5 space-y-3">
        <details>
          <summary className="font-semibold cursor-pointer">Advanced (optional)</summary>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div>
              <Label>Client ID (auto-filled)</Label>
              <Input value={row.client_id || ""} onChange={(e) => upd("client_id", e.target.value)} placeholder="ca-pub-..." />
            </div>
            <div>
              <Label>Verification meta (auto-filled)</Label>
              <Input value={row.verification_meta || ""} onChange={(e) => upd("verification_meta", e.target.value)} placeholder="ca-pub-..." />
            </div>
          </div>
          <div className="mt-3">
            <Label>Extra HTML for &lt;head&gt; (verification snippets, etc.)</Label>
            <Textarea rows={3} value={row.head_scripts || ""} onChange={(e) => upd("head_scripts", e.target.value)} />
          </div>
        </details>
      </Card>

      <Button onClick={save} disabled={saving} size="lg" className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
      </Button>

      <Card className="p-4 bg-muted/40">
        <p className="text-sm">
          <strong>ads.txt</strong> is already live at{" "}
          <a href="/ads.txt" target="_blank" rel="noopener noreferrer" className="underline">/ads.txt</a>.
          Google AdSense script is loaded sitewide automatically once enabled above.
        </p>
      </Card>
    </div>
  );
}

/* ---------- Tab 2: Ad Slots ---------- */
function SlotsTab() {
  return (
    <div className="space-y-3">
      <Card className="p-4 bg-muted/40">
        <p className="text-sm">
          Add an ad slot for any page area. Just give it a <strong>name</strong>, pick where it shows, and paste your <strong>AdSense Slot ID</strong>. Leave Slot ID empty if you only want Auto Ads.
        </p>
      </Card>
      <SimpleTableAdmin
        table="ad_units"
        titleKey="name"
        subtitleKey="placement"
        orderBy={{ column: "priority", ascending: false }}
        defaultValues={{
          name: "",
          ad_type: "display",
          placement: "homepage",
          position: "middle",
          ad_slot_id: "",
          ad_format: "auto",
          full_width_responsive: true,
          priority: 0,
          is_active: true,
          target_devices: ["mobile", "desktop", "tablet"],
          url_pattern: "",
        }}
        fields={[
          { key: "name", label: "Name (your reference)", required: true, placeholder: "Homepage middle banner" },
          { key: "placement", label: "Where to show", type: "combobox", options: ["homepage", "article", "search", "study", "course", "exam", "college-detail", "sidebar", "footer", "header"] },
          { key: "position", label: "Position on page", type: "combobox", options: ["top", "middle", "bottom", "before-content", "after-content"] },
          { key: "ad_slot_id", label: "AdSense Slot ID (optional)", placeholder: "1234567890" },
          { key: "url_pattern", label: "Limit to URLs containing (optional)", placeholder: "/colleges" },
          { key: "priority", label: "Priority (higher wins)", type: "number" },
        ]}
      />
    </div>
  );
}

/* ---------- Tab 3: Stats ---------- */
function StatsTab() {
  const [stats, setStats] = useState<{ impressions: number; clicks: number; ctr: number; top: any[] } | null>(null);
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("ad_analytics_events")
        .select("event_type, ad_unit_id")
        .gte("created_at", since);
      const events = data || [];
      const impressions = events.filter((e: any) => e.event_type === "impression").length;
      const clicks = events.filter((e: any) => e.event_type === "click").length;
      const ctr = impressions ? (clicks / impressions) * 100 : 0;
      const byUnit: Record<string, { impressions: number; clicks: number }> = {};
      events.forEach((e: any) => {
        if (!e.ad_unit_id) return;
        byUnit[e.ad_unit_id] = byUnit[e.ad_unit_id] || { impressions: 0, clicks: 0 };
        if (e.event_type === "impression") byUnit[e.ad_unit_id].impressions++;
        else if (e.event_type === "click") byUnit[e.ad_unit_id].clicks++;
      });
      const ids = Object.keys(byUnit);
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: us } = await (supabase as any).from("ad_units").select("id,name").in("id", ids);
        (us || []).forEach((u: any) => (names[u.id] = u.name));
      }
      const top = Object.entries(byUnit)
        .map(([id, v]) => ({ id, name: names[id] || id.slice(0, 8), ...v }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10);
      setStats({ impressions, clicks, ctr, top });
    })();
  }, []);

  if (!stats) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const tiles = [
    { label: "Impressions (30 days)", value: stats.impressions, icon: Eye },
    { label: "Clicks (30 days)", value: stats.clicks, icon: MousePointerClick },
    { label: "Click rate", value: `${stats.ctr.toFixed(2)}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><t.icon className="w-4 h-4" /> {t.label}</div>
            <div className="text-3xl font-bold mt-1">{typeof t.value === "number" ? t.value.toLocaleString() : t.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Top ad slots</h3>
        {stats.top.length === 0 ? (
          <div className="text-sm text-muted-foreground">No data yet - stats appear once ads start showing.</div>
        ) : (
          <div className="space-y-2">
            {stats.top.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
                <span className="font-medium">{u.name}</span>
                <span className="text-muted-foreground">{u.impressions} views · {u.clicks} clicks</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Need official earnings data? Sign in to{" "}
          <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="underline">Google AdSense</a>.
        </p>
      </Card>
    </div>
  );
}

export default function AdminAdsense() {
  const [params, setParams] = useSearchParams();
  // Backward-compat: old deep-links (settings/units/analytics/...) map to the 3 new tabs
  const raw = params.get("tab") || "setup";
  const map: Record<string, string> = {
    overview: "setup", settings: "setup", scripts: "setup",
    units: "slots", context: "slots", college: "slots",
    analytics: "stats",
  };
  const tab = ["setup", "slots", "stats"].includes(raw) ? raw : (map[raw] || "setup");
  const setTab = (v: string) => { params.set("tab", v); setParams(params, { replace: true }); };

  return (
    <AdminLayout title="Google Ads">
      <p className="text-sm text-muted-foreground mb-4">
        Simple, 3-step Google AdSense control: set up your account, manage ad slots, and check stats.
      </p>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="setup" className="gap-2"><SettingsIcon className="w-4 h-4" /> Setup</TabsTrigger>
          <TabsTrigger value="slots" className="gap-2"><Megaphone className="w-4 h-4" /> Ad Slots</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><BarChart3 className="w-4 h-4" /> Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="setup" className="mt-4"><SetupTab /></TabsContent>
        <TabsContent value="slots" className="mt-4"><SlotsTab /></TabsContent>
        <TabsContent value="stats" className="mt-4"><StatsTab /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
