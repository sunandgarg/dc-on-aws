import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { CSVTools } from "@/components/CSVTools";
const HELP: Record<string, string> = {
  ga4_measurement_id: "Format: G-XXXXXXX. Find it in Google Analytics → Admin → Data Streams.",
  gtm_container_id: "Format: GTM-XXXXXX. From tagmanager.google.com.",
  gsc_verification: "Paste the content of the Google site-verification meta tag.",
  google_ads_id: "Format: AW-XXXXXXXXXX. From Google Ads → Tools → Conversions → Tag setup. Combine with the Conversion Label below.",
  google_ads_conversion_label: "The conversion event label (e.g. abcDEFghi) shown next to the Conversion ID. Lead form submissions automatically fire this conversion.",
  google_adsense_id: "Format: ca-pub-XXXXXXXXXXXX.",
  ms_clarity_id: "From clarity.microsoft.com → Settings → Setup.",
  bing_verification: "Bing Webmaster meta tag content.",
  bing_uet_tag: "Microsoft Ads UET Tag ID (digits only).",
  linkedin_partner_id: "LinkedIn Insight Partner ID (digits).",
  facebook_pixel_id: "Meta Pixel ID (digits).",
  hotjar_id: "Hotjar Site ID (digits).",
  plausible_domain: "Domain registered in Plausible (e.g. dekhocampus.com).",
  google_review_url: "Public Google Reviews link (e.g. https://g.co/kgs/yourbiz). Used by the homepage 'Google Reviews' widget.",
  whatsapp_phone: "WhatsApp number with country code, no '+' (e.g. 919990109393). Used by the floating WhatsApp button.",
  whatsapp_message: "Pre-filled message users send when they tap the WhatsApp button.",
  news_call_phone: "Phone number (with country code, no '+') for the floating Call button shown ONLY on News & article pages. Example: 919990109393.",
  premium_program_fallback_phone: "Fallback phone number for Premium Program pages. Used by the floating Call button when an individual program has no contact phone set. Include country code, e.g. +919990109393.",
  youtube_default_url: "Global default YouTube link used when no entity-specific or category fallback is set.",
  youtube_fallback_college: "Default YouTube video used on College pages when a college has no specific video URL.",
  youtube_fallback_course: "Default YouTube video used on Course pages when a course has no specific video URL.",
  youtube_fallback_exam: "Default YouTube video used on Exam pages when an exam has no specific video URL.",
  youtube_fallback_career: "Default YouTube video used on Career pages when a career has no specific video URL.",
  youtube_fallback_how_to_apply_exam: "Default YouTube video used as the 'How to Apply' fallback on Exam pages when an exam has no specific URL.",
  google_places_api_key: "Google Places API key used to fetch live Google reviews on the homepage. Restrict it to Places API in Google Cloud Console.",
  google_places_site_id: "Google Place ID for your business profile (used by the homepage Google Reviews widget). Find it via place-id-finder on Google Maps.",
  online_degree_redirect_url: "Where to send the user after they submit the Online Degrees lead form (e.g. partner landing page or program detail). Leave empty to just show a thank-you toast.",
  study_abroad_redirect_url: "Where to send the user after they submit the Study Abroad lead form (e.g. partner landing page). Leave empty to just show a thank-you toast.",
  content_copy_protection: "Toggle ON to stop text selection, copy/cut and right-click on public pages. Admin pages and form inputs stay usable.",
  lead_popup_delays_ms: "Comma-separated delays in milliseconds for the 3-stage lead popup. Default: 12000,60000,240000 (12s, 60s, 4min). Leave blank to use defaults.",
};

export default function AdminIntegrations() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["site_integrations_admin"],
    queryFn: async () => (await supabase.from("site_integrations" as any).select("*").order("category").order("label")).data ?? [],
  });

  const grouped = rows.reduce((acc: any, r: any) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <AdminLayout title="Integrations & Tracking">
      <div className="mb-4">
        <CSVTools table="site_integrations" filename="site_integrations.csv" columns="*" upsertKey="id" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Locked once saved</p>
          <p className="text-muted-foreground">For safety each tracking ID is locked after saving. Click <Lock className="inline w-3 h-3" /> Unlock to confirm before editing again.</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {Object.entries(grouped).map(([cat, items]: any) => (
        <section key={cat} className="mb-8">
          <h3 className="text-lg font-bold text-foreground capitalize mb-3">{cat}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {items.map((row: any) => <IntegrationRow key={row.id} row={row} onChanged={() => qc.invalidateQueries({ queryKey: ["site_integrations_admin"] })} />)}
          </div>
        </section>
      ))}
    </AdminLayout>
  );
}

function IntegrationRow({ row, onChanged }: { row: any; onChanged: () => void }) {
  const isCopyProtection = row.key === "content_copy_protection";
  const [value, setValue] = useState(row.value || "");
  const [enabled, setEnabled] = useState(!!row.enabled);
  const [locked, setLocked] = useState(!isCopyProtection && !!row.value);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = isCopyProtection
      ? { value: enabled ? "copy_blocked" : "copy_allowed", enabled }
      : { value, enabled };
    const { error } = await (supabase as any).from("site_integrations").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isCopyProtection ? "Copy protection setting saved" : `${row.label} saved & locked`);
    if (!isCopyProtection) setLocked(true);
    onChanged();
  };

  if (isCopyProtection) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Content copy protection</p>
            <p className="text-[11px] text-muted-foreground mt-1">{HELP[row.key]}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <Button size="sm" onClick={save} disabled={saving} className="w-full mt-2">
          <Save className="w-4 h-4 mr-2" /> Save {enabled ? "Protected" : "Copy Allowed"}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-foreground">{row.label}</p>
        <Switch checked={enabled} onCheckedChange={setEnabled} disabled={locked} />
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">{HELP[row.key] || row.key}</p>
      <div className="flex gap-2">
        <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Paste ID / tag" disabled={locked} className="font-mono text-xs" />
        {locked ? (
          <Button variant="outline" size="icon" onClick={() => setConfirmUnlock(true)}><Lock className="w-4 h-4" /></Button>
        ) : (
          <Button size="icon" onClick={save} disabled={saving}><Save className="w-4 h-4" /></Button>
        )}
      </div>

      <AlertDialog open={confirmUnlock} onOpenChange={setConfirmUnlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock {row.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing tracking IDs can break analytics & conversion data. Are you sure you need to change it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep locked</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setLocked(false); setConfirmUnlock(false); }}>
              <Unlock className="w-4 h-4 mr-1" /> Yes, unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
