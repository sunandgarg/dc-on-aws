import { useEffect, useState } from "react";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Save, Trash2, ExternalLink, Eye, Loader2, Layers, GraduationCap, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
const empty = {
  slug: "", is_active: true, lp_type: "general",
  multiple_layout: "compact", multiple_colleges: [],
  exam_ad: { free_downloads: [], locked_premium: [], lead_only: [], locked_gate: "form", lead_only_gate: "form" },
  advertiser_name: "", advertiser_address: "", advertiser_contact: "",
  disclosure_text: "This page is an advertisement. Information shown is for educational lead-generation purposes only and is not an offer of admission, scholarship, employment, or guaranteed outcome.",
  brand_name: "DekhoCampus", logo_url: "",
  nav_links: [{ label: "Courses", href: "#courses" }, { label: "Apply", href: "#apply-card" }],
  cta_label: "Get Guidance", cta_href: "#apply-card",
  eyebrow: "", hero_title: "", hero_subtitle: "",
  primary_cta_label: "Talk to an advisor", primary_cta_href: "#apply-card",
  secondary_cta_label: "View application form ↓", secondary_cta_href: "#apply-card",
  stats: [{ value: "40K+", label: "Active learners" }],
  form_title: "Quick application", form_subtitle: "Tell us about you. We respond in under 24 hours.",
  form_courses: ["MBA", "BBA", "BCA", "MCA"], form_submit_label: "SUBMIT",
  form_consent_text: "By submitting, you agree to our Privacy Policy.",
  courses_title: "Explore courses", courses_subtitle: "", courses: [],
  why_title: "Why learners pick us", why_subtitle: "", why_items: [],
  testimonials_title: "Hear from learners", testimonials: [], faqs: [],
  footer_text: "© DekhoCampus", privacy_url: "/legal/privacy", terms_url: "/legal/terms",
  meta_title: "", meta_description: "", meta_keywords: "", og_image: "",
  ga_id: "", gtm_id: "", meta_pixel_id: "",
  theme: { primary: "#ee5a36", ink: "#0e2236", bg: "#ffffff", accent: "#ffeae3" },
};

const TYPE_OPTIONS: { id: "general" | "multiple_colleges" | "exam_ad"; label: string; desc: string; icon: any }[] = [
  { id: "general", label: "General", desc: "Classic single-program landing page with hero + lead form", icon: Layers },
  { id: "multiple_colleges", label: "Multiple colleges", desc: "Compare-style page listing many colleges in one go", icon: GraduationCap },
  { id: "exam_ad", label: "Exam ad (JEE / NEET / CAT)", desc: "Free papers + locked premium + counsellor CTA - lead-funnel optimised", icon: Megaphone },
];

export default function AdminLandingPages() {
  const qc = useQueryClient();
  const [editing, setEditing] = useDraftState<any>('admin.landing-pages.editing.v1', null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["admin-landing-pages"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("landing_pages").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = async () => {
    if (!editing.slug) return toast.error("Slug is required (e.g. lp, lp-mba)");
    if (editing.lp_type && !["general","multiple_colleges","exam_ad"].includes(editing.lp_type)) {
      return toast.error("Invalid landing-page type");
    }
    const payload = { ...editing };
    delete payload.created_at; delete payload.updated_at;
    const { error } = editing.id
      ? await (supabase as any).from("landing_pages").update(payload).eq("id", editing.id)
      : await (supabase as any).from("landing_pages").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-landing-pages"] });
    qc.invalidateQueries({ queryKey: ["landing_page", payload.slug] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this landing page?")) return;
    await (supabase as any).from("landing_pages").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-landing-pages"] });
  };

  const setJson = (key: string, value: string) => {
    try { setEditing({ ...editing, [key]: JSON.parse(value || "[]") }); } catch { /* ignore until valid */ }
  };
  const setExamAdField = (k: string, v: any) =>
    setEditing({ ...editing, exam_ad: { ...(editing.exam_ad || {}), [k]: v } });

  const startNew = (type: "general" | "multiple_colleges" | "exam_ad") => {
    setShowTypePicker(false);
    setEditing({ ...empty, lp_type: type });
  };

  if (editing) {
    const j = (k: string) => JSON.stringify(editing[k] ?? [], null, 2);
    const examAd = editing.exam_ad || {};
    const jExam = (k: string) => JSON.stringify(examAd[k] ?? [], null, 2);
    const isMultiple = editing.lp_type === "multiple_colleges";
    const isExamAd = editing.lp_type === "exam_ad";
    const tabs = ["basics", "hero", "form"];
    if (isMultiple) tabs.push("colleges");
    if (isExamAd) tabs.push("exam_ad");
    tabs.push("sections", "compliance", "tracking", "seo", "theme");

    return (
      <AdminLayout title={editing.id ? `Edit /landing/${editing.slug || "lp"}` : `New ${TYPE_OPTIONS.find(t => t.id === editing.lp_type)?.label || ""} Landing Page`}>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button onClick={save} className="gap-2"><Save className="w-4 h-4" />Save</Button>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          {editing.id && <a href={`/landing/${editing.slug}`} target="_blank" rel="noreferrer"><Button variant="ghost" className="gap-2"><Eye className="w-4 h-4" />Preview</Button></a>}
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
            {TYPE_OPTIONS.find(t => t.id === (editing.lp_type || "general"))?.label}
          </span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
            <span>{editing.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>

        <Tabs defaultValue="basics">
          <TabsList className="flex flex-wrap h-auto">
            {tabs.map(t => <TabsTrigger key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="basics" className="space-y-3 mt-4">
            <Field label="Slug (URL: /slug)" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })} />
            <Field label="Brand Name" value={editing.brand_name} onChange={(v) => setEditing({ ...editing, brand_name: v })} />
            <Field label="Logo URL" value={editing.logo_url} onChange={(v) => setEditing({ ...editing, logo_url: v })} />
            <Field label="Header CTA Label" value={editing.cta_label} onChange={(v) => setEditing({ ...editing, cta_label: v })} />
            <Field label="Header CTA Href" value={editing.cta_href} onChange={(v) => setEditing({ ...editing, cta_href: v })} />
            <JsonField label='Nav Links - [{"label","href"}]' value={j("nav_links")} onChange={(v) => setJson("nav_links", v)} />
          </TabsContent>

          <TabsContent value="hero" className="space-y-3 mt-4">
            <Field label="Eyebrow Tag" value={editing.eyebrow} onChange={(v) => setEditing({ ...editing, eyebrow: v })} />
            <Field label="Hero Title" value={editing.hero_title} onChange={(v) => setEditing({ ...editing, hero_title: v })} textarea />
            <Field label="Hero Subtitle" value={editing.hero_subtitle} onChange={(v) => setEditing({ ...editing, hero_subtitle: v })} textarea />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary CTA Label" value={editing.primary_cta_label} onChange={(v) => setEditing({ ...editing, primary_cta_label: v })} />
              <Field label="Primary CTA Href" value={editing.primary_cta_href} onChange={(v) => setEditing({ ...editing, primary_cta_href: v })} />
              <Field label="Secondary CTA Label" value={editing.secondary_cta_label} onChange={(v) => setEditing({ ...editing, secondary_cta_label: v })} />
              <Field label="Secondary CTA Href" value={editing.secondary_cta_href} onChange={(v) => setEditing({ ...editing, secondary_cta_href: v })} />
            </div>
            <JsonField label='Stats - [{"value","label"}]' value={j("stats")} onChange={(v) => setJson("stats", v)} />
          </TabsContent>

          <TabsContent value="form" className="space-y-3 mt-4">
            <Field label="Form Title" value={editing.form_title} onChange={(v) => setEditing({ ...editing, form_title: v })} />
            <Field label="Form Subtitle" value={editing.form_subtitle} onChange={(v) => setEditing({ ...editing, form_subtitle: v })} />
            <JsonField label='Course Options - ["MBA","BBA"]' value={j("form_courses")} onChange={(v) => setJson("form_courses", v)} />
            <Field label="Submit Button Label" value={editing.form_submit_label} onChange={(v) => setEditing({ ...editing, form_submit_label: v })} />
            <Field label="Consent Text (required for Google/Meta 2026 ad policies)" value={editing.form_consent_text} onChange={(v) => setEditing({ ...editing, form_consent_text: v })} textarea />
            <Field label="Privacy Policy URL" value={editing.privacy_url} onChange={(v) => setEditing({ ...editing, privacy_url: v })} />
            <Field label="Terms URL" value={editing.terms_url} onChange={(v) => setEditing({ ...editing, terms_url: v })} />
          </TabsContent>

          {isMultiple && (
            <TabsContent value="colleges" className="space-y-3 mt-4">
              <div>
                <Label className="text-xs">Layout style</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(["compact", "accordion", "bento"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setEditing({ ...editing, multiple_layout: l })}
                      className={`p-3 border rounded-lg text-sm capitalize text-left ${editing.multiple_layout === l ? "border-orange-500 bg-orange-50" : ""}`}
                    >
                      <div className="font-bold">{l}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {l === "compact" && "Logo + name + city + fees + CTA"}
                        {l === "accordion" && "Tap to expand details inline"}
                        {l === "bento" && "Image-led tiles, GenZ vibe"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <JsonField
                label='Colleges - [{"name","logo","city","state","fees","rating","highlights":["..."],"link","description"}]'
                value={j("multiple_colleges")}
                onChange={(v) => setJson("multiple_colleges", v)}
                rows={16}
              />
              <p className="text-xs text-muted-foreground">
                Tip: link can be an internal slug (<code>/colleges/amity-noida</code>) or external URL. Tapping the card opens it.
              </p>
            </TabsContent>
          )}

          {isExamAd && (
            <TabsContent value="exam_ad" className="space-y-4 mt-4">
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-bold mb-2">Block 1 - Free downloads (no login)</p>
                <JsonField
                  label='Items - [{"title","subtitle","url"}] - last-10-year papers, sample papers, syllabus PDFs'
                  value={jExam("free_downloads")}
                  onChange={(v) => { try { setExamAdField("free_downloads", JSON.parse(v || "[]")); } catch {} }}
                  rows={8}
                />
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold">Block 2 - Locked premium (unlock to view)</p>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span>Gate:</span>
                    {(["form", "otp"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setExamAdField("locked_gate", g)}
                        className={`px-2 py-0.5 border rounded ${examAd.locked_gate === g ? "bg-orange-500 text-white border-orange-500" : ""}`}
                      >{g === "otp" ? "Phone OTP" : "Lead form"}</button>
                    ))}
                  </div>
                </div>
                <JsonField
                  label='Items - [{"title","preview","url"}] - important questions, topper notes, mock-test PDFs'
                  value={jExam("locked_premium")}
                  onChange={(v) => { try { setExamAdField("locked_premium", JSON.parse(v || "[]")); } catch {} }}
                  rows={8}
                />
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold">Block 3 - Lead-only (counsellor call / personalised plan)</p>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span>Gate:</span>
                    {(["form", "otp"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setExamAdField("lead_only_gate", g)}
                        className={`px-2 py-0.5 border rounded ${examAd.lead_only_gate === g ? "bg-orange-500 text-white border-orange-500" : ""}`}
                      >{g === "otp" ? "Phone OTP" : "Lead form"}</button>
                    ))}
                  </div>
                </div>
                <JsonField
                  label='Items - [{"title","subtitle"}] - bullet points shown before they tap "Get a callback"'
                  value={jExam("lead_only")}
                  onChange={(v) => { try { setExamAdField("lead_only", JSON.parse(v || "[]")); } catch {} }}
                  rows={6}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="compliance" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">
              Required for Google Ads policy 2026 (advertiser identity verification, clear ad disclosure, contactable advertiser).
              These appear in the page header strip and the footer of the new LP types.
            </p>
            <Field label="Advertiser legal name (the verified business behind the ad)" value={editing.advertiser_name} onChange={(v) => setEditing({ ...editing, advertiser_name: v })} />
            <Field label="Advertiser registered address" value={editing.advertiser_address} onChange={(v) => setEditing({ ...editing, advertiser_address: v })} textarea />
            <Field label="Advertiser contact (email or phone)" value={editing.advertiser_contact} onChange={(v) => setEditing({ ...editing, advertiser_contact: v })} />
            <Field label="Ad disclosure text (kept short, displayed in footer)" value={editing.disclosure_text} onChange={(v) => setEditing({ ...editing, disclosure_text: v })} textarea />
          </TabsContent>

          <TabsContent value="sections" className="space-y-3 mt-4">
            <Field label="Courses Section Title" value={editing.courses_title} onChange={(v) => setEditing({ ...editing, courses_title: v })} />
            <Field label="Courses Section Subtitle" value={editing.courses_subtitle} onChange={(v) => setEditing({ ...editing, courses_subtitle: v })} />
            <JsonField label='Courses - [{"tag","title","duration","level"}]' value={j("courses")} onChange={(v) => setJson("courses", v)} rows={10} />
            <Field label="Why Us Title" value={editing.why_title} onChange={(v) => setEditing({ ...editing, why_title: v })} />
            <JsonField label='Why Items - [{"title","desc"}]' value={j("why_items")} onChange={(v) => setJson("why_items", v)} rows={8} />
            <Field label="Testimonials Title" value={editing.testimonials_title} onChange={(v) => setEditing({ ...editing, testimonials_title: v })} />
            <JsonField label='Testimonials - [{"name","role","quote"}]' value={j("testimonials")} onChange={(v) => setJson("testimonials", v)} rows={8} />
            <JsonField label='FAQs - [{"q","a"}]' value={j("faqs")} onChange={(v) => setJson("faqs", v)} rows={8} />
            <Field label="Footer Text" value={editing.footer_text} onChange={(v) => setEditing({ ...editing, footer_text: v })} />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-3 mt-4">
            <Field label="Google Analytics ID (G-XXXXXXX)" value={editing.ga_id} onChange={(v) => setEditing({ ...editing, ga_id: v })} />
            <Field label="Google Tag Manager ID (GTM-XXXXX)" value={editing.gtm_id} onChange={(v) => setEditing({ ...editing, gtm_id: v })} />
            <Field label="Meta (Facebook) Pixel ID" value={editing.meta_pixel_id} onChange={(v) => setEditing({ ...editing, meta_pixel_id: v })} />
            <p className="text-xs text-muted-foreground">2026 ad policy: anonymize_ip enabled by default; lead form requires explicit consent text and privacy link before submit. Meta Pixel sends `Lead` event on submit; GA4 sends `generate_lead`.</p>
          </TabsContent>

          <TabsContent value="seo" className="space-y-3 mt-4">
            <Field label="Meta Title (≤60 chars)" value={editing.meta_title} onChange={(v) => setEditing({ ...editing, meta_title: v })} />
            <Field label="Meta Description (≤160 chars)" value={editing.meta_description} onChange={(v) => setEditing({ ...editing, meta_description: v })} textarea />
            <Field label="Meta Keywords" value={editing.meta_keywords} onChange={(v) => setEditing({ ...editing, meta_keywords: v })} />
            <Field label="OG Image URL" value={editing.og_image} onChange={(v) => setEditing({ ...editing, og_image: v })} />
          </TabsContent>

          <TabsContent value="theme" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["primary","ink","bg","accent"] as const).map(k => (
                <div key={k}>
                  <Label className="text-xs uppercase">{k}</Label>
                  <Input type="color" value={editing.theme[k]} onChange={(e) => setEditing({ ...editing, theme: { ...editing.theme, [k]: e.target.value } })} className="h-12" />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Landing Pages (/landing/*)">
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <CSVTools table="landing_pages" filename="landing_pages.csv" columns="*" upsertKey="slug" />
        <AIGenerateDialog entityType="landing_pages" table="landing_pages" upsertKey="slug" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Build unlimited campaign landing pages - fully editable, GA/GTM/Pixel per page, Google Ads policy 2026 compliant.</p>
        <Button onClick={() => setShowTypePicker(true)} className="gap-2"><Plus className="w-4 h-4" />New Landing Page</Button>
      </div>

      {showTypePicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-background rounded-2xl w-full max-w-2xl p-6 relative">
            <button onClick={() => setShowTypePicker(false)} aria-label="Close" className="absolute top-3 right-3 text-2xl opacity-60 hover:opacity-100">×</button>
            <h2 className="font-bold text-xl mb-1">Choose a landing page type</h2>
            <p className="text-sm text-muted-foreground mb-5">Each type uses a different layout and lead-capture flow.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {TYPE_OPTIONS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => startNew(t.id)}
                    className="text-left p-4 rounded-xl border hover:border-orange-500 hover:bg-orange-50 transition group"
                  >
                    <Icon className="w-6 h-6 mb-2 text-orange-500" />
                    <div className="font-bold">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pages.map((p: any) => {
            const typeMeta = TYPE_OPTIONS.find(t => t.id === (p.lp_type || "general"));
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">/landing/{p.slug}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.hero_title || "-"}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{p.is_active ? "Live" : "Draft"}</span>
                  </div>
                  <span className="inline-block text-[10px] mt-2 px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold uppercase tracking-wider">{typeMeta?.label || "General"}</span>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                    <a href={`/landing/${p.slug}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" className="gap-1"><ExternalLink className="w-3 h-3" />Open</Button></a>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="ml-auto text-destructive"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value, onChange, textarea }: any) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {textarea
        ? <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} />
        : <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
function JsonField({ label, value, onChange, rows = 5 }: any) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="font-mono text-xs" />
    </div>
  );
}
