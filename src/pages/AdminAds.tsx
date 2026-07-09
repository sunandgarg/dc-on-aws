import { useState, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAllAds } from "@/hooks/useAds";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Pencil, Trash2, X, ExternalLink, Copy, Search,
  Megaphone, HelpCircle, Eye, Info, Upload,
} from "lucide-react";
import { colleges } from "@/data/colleges";
import { courses } from "@/data/courses";
import { exams } from "@/data/exams";
import { articles } from "@/data/articles";

import { CSVTools } from "@/components/CSVTools";
import { useDraftState } from "@/hooks/useDraftState";
// ─── Friendly labels ───────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: "universal", emoji: "🌍", label: "Show Everywhere", help: "This ad will appear on every page as a fallback when no better-matched ad exists." },
  { value: "page", emoji: "📄", label: "Show on a Specific Page", help: "This ad appears only on one listing page - like All Colleges, All Courses, etc." },
  { value: "item", emoji: "🎯", label: "Show on a Specific College / Course / Exam / Article", help: "This ad appears only when someone visits a specific detail page, e.g. the IIT Delhi page." },
  { value: "city", emoji: "📍", label: "Show for a Specific City", help: "This ad appears anywhere on the site for users in the selected city." },
] as const;

const PAGE_OPTIONS = [
  { value: "colleges", label: "Colleges Page" },
  { value: "courses", label: "Courses Page" },
  { value: "exams", label: "Exams Page" },
  { value: "articles", label: "Articles / News Page" },
] as const;

const LOOK_OPTIONS = [
  { value: "horizontal", emoji: "▬", label: "Wide Banner", help: "A horizontal banner shown in the main content area", size: "728 × 90 px or 970 × 250 px" },
  { value: "vertical", emoji: "▮", label: "Tall Sidebar Ad", help: "A vertical ad shown in the sidebar", size: "300 × 600 px or 160 × 600 px" },
  { value: "square", emoji: "⬜", label: "Square Box", help: "A compact square ad, great for sidebars", size: "300 × 250 px or 336 × 280 px" },
  { value: "leaderboard", emoji: "━━", label: "Full-Width Strip", help: "A slim strip across the top of the page", size: "970 × 90 px or 728 × 90 px" },
] as const;

const PLACEMENT_OPTIONS = [
  { value: "leaderboard", label: "Top of Page (strip)" },
  { value: "mid-page", label: "Middle of Page" },
  { value: "sidebar", label: "Sidebar" },
  { value: "top", label: "Top of Content" },
  { value: "bottom", label: "Bottom of Content" },
] as const;

const COLOR_OPTIONS = [
  { value: "from-violet-600 to-purple-600", label: "Purple" },
  { value: "from-teal-500 to-emerald-500", label: "Teal" },
  { value: "from-amber-500 to-orange-500", label: "Orange" },
  { value: "from-rose-500 to-pink-500", label: "Pink" },
  { value: "from-blue-500 to-indigo-500", label: "Blue" },
  { value: "from-green-500 to-teal-500", label: "Green" },
  { value: "from-red-500 to-rose-500", label: "Red" },
  { value: "from-cyan-500 to-blue-500", label: "Cyan" },
  { value: "from-slate-700 to-slate-900", label: "Dark" },
  { value: "from-pink-500 to-violet-500", label: "Magenta" },
] as const;

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune",
  "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Bhopal", "Kochi", "Indore",
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────

function getItems(page: string) {
  switch (page) {
    case "colleges": return colleges.map((c) => ({ slug: c.slug, label: c.name }));
    case "courses": return courses.map((c) => ({ slug: c.slug, label: c.fullName }));
    case "exams": return exams.map((e) => ({ slug: e.slug, label: e.fullName }));
    case "articles": return articles.map((a) => ({ slug: a.slug, label: a.title }));
    default: return [];
  }
}

function audienceLabel(type: string) {
  return AUDIENCE_OPTIONS.find((a) => a.value === type)?.label ?? type;
}

// ─── Form shape ────────────────────────────────────────────────────────

interface AdForm {
  title: string;
  subtitle: string;
  cta_text: string;
  link_url: string;
  image_url: string;
  variant: string;
  bg_gradient: string;
  target_type: string;
  target_page: string;
  target_item_slug: string;
  target_city: string;
  position: string;
  priority: number;
  is_active: boolean;
}

const emptyForm: AdForm = {
  title: "", subtitle: "", cta_text: "Learn More", link_url: "", image_url: "",
  variant: "horizontal", bg_gradient: "from-violet-600 to-purple-600",
  target_type: "universal", target_page: "", target_item_slug: "", target_city: "",
  position: "mid-page", priority: 10, is_active: true,
};

// ─── Inline hint component ────────────────────────────────────────────

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
      <Info className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function AdminAds() {
  const { data: ads, isLoading } = useAllAds();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useDraftState<boolean>('admin.ads.showForm.v1', false);
  const [editingId, setEditingId] = useDraftState<string | null>('admin.ads.editingId.v1', null);
  const [form, setForm] = useDraftState<AdForm>('admin.ads.form.v1', emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useDraftState<string>('admin.ads.search.v1', "");
  const [filterTarget, setFilterTarget] = useDraftState<string>('admin.ads.filterTarget.v1', "all");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Actions ──

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setErrors({}); setShowForm(true); };

  const openEdit = (ad: any) => {
    setForm({
      title: ad.title, subtitle: ad.subtitle || "", cta_text: ad.cta_text, link_url: ad.link_url,
      image_url: ad.image_url || "", variant: ad.variant, bg_gradient: ad.bg_gradient,
      target_type: ad.target_type, target_page: ad.target_page || "",
      target_item_slug: ad.target_item_slug || "", target_city: ad.target_city || "",
      position: ad.position, priority: ad.priority, is_active: ad.is_active,
    });
    setEditingId(ad.id); setErrors({}); setShowForm(true);
  };

  const duplicateAd = (ad: any) => {
    openEdit({ ...ad, title: ad.title + " (Copy)", is_active: false, id: undefined });
    setEditingId(null);
  };

  // ── Image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `ad-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("ad-images").upload(fileName, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("ad-images").getPublicUrl(fileName);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
    toast({ title: "✅ Image uploaded!" });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Please enter a title for your ad";
    if (!form.link_url.trim()) e.link_url = "Please enter the URL people go to when they click the ad";
    else if (!/^https?:\/\/.+/.test(form.link_url.trim()) && form.link_url.trim() !== "#")
      e.link_url = "URL must start with https:// (e.g. https://example.com)";
    if ((form.target_type === "page" || form.target_type === "item") && !form.target_page)
      e.target_page = "Please choose which page this ad should appear on";
    if (form.target_type === "item" && !form.target_item_slug.trim())
      e.target_item_slug = "Please choose the specific item this ad is for";
    if (form.target_type === "city" && !form.target_city.trim())
      e.target_city = "Please choose a city";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      cta_text: form.cta_text.trim() || "Learn More",
      link_url: form.link_url.trim(),
      image_url: form.image_url.trim() || null,
      variant: form.variant,
      bg_gradient: form.bg_gradient,
      target_type: form.target_type,
      target_page: ["page", "item"].includes(form.target_type) && form.target_page ? form.target_page : null,
      target_item_slug: form.target_type === "item" && form.target_item_slug ? form.target_item_slug : null,
      target_city: form.target_city.trim() || null,
      position: form.position,
      priority: form.priority,
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from("ads").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "✅ Ad updated!" });
      } else {
        const { error } = await supabase.from("ads").insert(payload);
        if (error) throw error;
        toast({ title: "✅ Ad created!" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      setShowForm(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ad? This cannot be undone.")) return;
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (!error) {
      toast({ title: "🗑️ Ad deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("ads").update({ is_active: active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    queryClient.invalidateQueries({ queryKey: ["ads"] });
    toast({ title: active ? "✅ Ad is now live" : "⏸️ Ad paused" });
  };

  const filteredAds = (ads ?? []).filter((ad) => {
    const s = searchQuery.toLowerCase();
    const matchSearch = !s || ad.title.toLowerCase().includes(s) || (ad.target_city ?? "").toLowerCase().includes(s);
    const matchTarget = filterTarget === "all" || ad.target_type === filterTarget;
    return matchSearch && matchTarget;
  });

  const items = form.target_page ? getItems(form.target_page) : [];

  const whereText = () => {
    if (form.target_type === "universal") return "This ad will show on every page (as a fallback).";
    if (form.target_type === "page" && form.target_page && form.target_city)
      return `This ad will show on the ${form.target_page} page for users in ${form.target_city}.`;
    if (form.target_type === "page" && form.target_page)
      return `This ad will show on the ${form.target_page} listing page.`;
    if (form.target_type === "item" && form.target_item_slug)
      return `This ad will show only on the detail page of "${form.target_item_slug}".`;
    if (form.target_type === "city" && form.target_city)
      return `This ad will show on all pages for users in ${form.target_city}.`;
    return "Choose targeting options above to see where this ad will appear.";
  };

  const selectedLook = LOOK_OPTIONS.find((l) => l.value === form.variant);

  return (
    <AdminLayout title="Ad Manager">
      <div className="mb-4">
        <CSVTools table="ads" filename="ads.csv" columns="*" upsertKey="id" />
      </div>

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold">{ads?.length ?? 0} ads</span>
          <Badge variant="outline" className="gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {ads?.filter((a) => a.is_active).length ?? 0} live
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGuide(!showGuide)} className="rounded-xl gap-2 text-sm">
            <HelpCircle className="w-4 h-4" />
            {showGuide ? "Hide Guide" : "How do Ads work?"}
          </Button>
          <Button onClick={openCreate} className="rounded-xl gradient-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> New Ad
          </Button>
        </div>
      </div>

      {/* ── Quick Guide ─────────────────────────────────────── */}
      {showGuide && <QuickGuide onClose={() => setShowGuide(false)} />}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search ads..." className="pl-10 rounded-xl" />
        </div>
        <Select value={filterTarget} onValueChange={setFilterTarget}>
          <SelectTrigger className="w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {AUDIENCE_OPTIONS.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.emoji} {a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Create / Edit Form ──────────────────────────────── */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-5 md:p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">{editingId ? "✏️ Edit Ad" : "➕ Create a New Ad"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-8">
            {/* STEP 1 */}
            <Section step={1} title="What does your ad say?">
              <div className="space-y-4">
                <Field label="Ad Headline" error={errors.title} hint="The main text people see. Keep it short and catchy!">
                  <Input value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: "" }); }} placeholder='e.g. "🎓 Get 50% Off Coaching!"' className={`rounded-xl ${errors.title ? "border-destructive" : ""}`} />
                </Field>
                <Field label="Short Description (optional)" hint="A line below the headline. Leave empty if not needed.">
                  <Textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Limited time offer - apply before March 31" className="rounded-xl min-h-[60px]" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Button Text" hint='What the clickable button says, e.g. "Apply Now"'>
                    <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Learn More" className="rounded-xl" />
                  </Field>
                  <Field label="Link URL" error={errors.link_url} hint="Where people go when they click the ad">
                    <Input value={form.link_url} onChange={(e) => { setForm({ ...form, link_url: e.target.value }); setErrors({ ...errors, link_url: "" }); }} placeholder="https://example.com" className={`rounded-xl ${errors.link_url ? "border-destructive" : ""}`} />
                  </Field>
                </div>

                {/* Image upload */}
                <Field label="Ad Image (optional)" hint={`Upload a banner image. Recommended size for "${selectedLook?.label}": ${selectedLook?.size}`}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-xl gap-2">
                      <Upload className="w-4 h-4" />
                      {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                    {form.image_url && (
                      <div className="flex items-center gap-2">
                        <img src={form.image_url} alt="Ad" className="w-20 h-12 object-cover rounded-lg border" />
                        <button onClick={() => setForm({ ...form, image_url: "" })} className="text-destructive hover:text-destructive/80 text-xs">Remove</button>
                      </div>
                    )}
                  </div>
                  {form.image_url && (
                    <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Or paste an image URL" className="rounded-xl mt-2 text-xs" />
                  )}
                  {!form.image_url && (
                    <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Or paste an image URL directly" className="rounded-xl mt-2 text-xs" />
                  )}
                </Field>
              </div>
            </Section>

            {/* STEP 2 */}
            <Section step={2} title="Who should see this ad?">
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, target_type: opt.value, target_page: "", target_item_slug: "", target_city: "" })}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${form.target_type === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <span className="text-lg">{opt.emoji}</span>
                      {opt.label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{opt.help}</p>
                  </button>
                ))}
              </div>

              {(form.target_type === "page" || form.target_type === "item") && (
                <Field label="Which page?" error={errors.target_page}>
                  <Select value={form.target_page} onValueChange={(v) => { setForm({ ...form, target_page: v, target_item_slug: "" }); setErrors({ ...errors, target_page: "" }); }}>
                    <SelectTrigger className={`rounded-xl ${errors.target_page ? "border-destructive" : ""}`}><SelectValue placeholder="Choose a page..." /></SelectTrigger>
                    <SelectContent>
                      {PAGE_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {form.target_type === "item" && form.target_page && (
                <Field label={`Which specific ${form.target_page.slice(0, -1)}?`} error={errors.target_item_slug} hint={`Pick the exact ${form.target_page.slice(0, -1)} this ad is for. The "slug" is the URL-friendly name like "iit-delhi".`}>
                  <Select value={form.target_item_slug} onValueChange={(v) => { setForm({ ...form, target_item_slug: v }); setErrors({ ...errors, target_item_slug: "" }); }}>
                    <SelectTrigger className={`rounded-xl ${errors.target_item_slug ? "border-destructive" : ""}`}><SelectValue placeholder={`Choose a ${form.target_page.slice(0, -1)}...`} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {items.map((i) => <SelectItem key={i.slug} value={i.slug}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {(form.target_type === "city" || form.target_type === "page") && (
                <Field label={form.target_type === "city" ? "Which city?" : "City filter (optional)"} error={errors.target_city} hint={form.target_type === "page" ? "Leave on 'All cities' to show on this page for everyone, or pick a city to narrow down" : undefined}>
                  <Select value={form.target_city || "__all__"} onValueChange={(v) => { setForm({ ...form, target_city: v === "__all__" ? "" : v }); setErrors({ ...errors, target_city: "" }); }}>
                    <SelectTrigger className={`rounded-xl ${errors.target_city ? "border-destructive" : ""}`}><SelectValue placeholder="Choose a city..." /></SelectTrigger>
                    <SelectContent>
                      {form.target_type === "page" && <SelectItem value="__all__">All cities</SelectItem>}
                      {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  {whereText()}
                </p>
              </div>
            </Section>

            {/* STEP 3 */}
            <Section step={3} title="How should it look?">
              <div className="space-y-4">
                <Field label="Ad Shape">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LOOK_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setForm({ ...form, variant: opt.value })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${form.variant === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                      >
                        <span className="text-2xl block mb-1">{opt.emoji}</span>
                        <span className="text-xs font-medium block">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{opt.size}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Where on the page?" hint="Which section of the page should this ad appear in">
                    <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLACEMENT_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Color Theme" hint="Background color if no image is used">
                    <Select value={form.bg_gradient} onValueChange={(v) => setForm({ ...form, bg_gradient: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-4 rounded bg-gradient-to-r ${c.value}`} />
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Priority" hint="Higher number = this ad wins over others. Range: 0–100">
                    <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className="rounded-xl" min={0} max={100} />
                  </Field>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <div>
                      <Label className="text-sm font-medium">{form.is_active ? "🟢 Live" : "⏸️ Paused"}</Label>
                      <p className="text-xs text-muted-foreground">{form.is_active ? "People can see this ad" : "Ad is hidden"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* STEP 4 */}
            <Section step={4} title="Preview">
              <div className="bg-muted rounded-xl p-4">
                <AdPreview form={form} />
              </div>
            </Section>
          </div>

          <div className="flex gap-2 mt-6 pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="rounded-xl gradient-primary text-primary-foreground px-8">
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Ad"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Ads List ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading ads...</div>
      ) : filteredAds.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">{searchQuery || filterTarget !== "all" ? "No ads match" : "No ads yet"}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || filterTarget !== "all" ? "Try a different search or filter" : "Create your first ad to get started!"}
          </p>
          {!searchQuery && filterTarget === "all" && (
            <Button onClick={openCreate} className="rounded-xl gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> Create First Ad</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAds.map((ad) => (
            <div key={ad.id} className={`bg-card rounded-2xl border transition-all ${ad.is_active ? "border-border" : "border-border/50 opacity-60"}`}>
              <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Image or color chip */}
                {ad.image_url ? (
                  <img src={ad.image_url} alt="" className="w-full lg:w-24 h-14 object-cover rounded-xl shrink-0" />
                ) : (
                  <div className={`w-full lg:w-20 h-14 rounded-xl bg-gradient-to-r ${ad.bg_gradient} flex items-center justify-center shrink-0`}>
                    <span className="text-xs text-white/80 uppercase font-medium">
                      {LOOK_OPTIONS.find(l => l.value === ad.variant)?.emoji}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{ad.title}</h4>
                    {!ad.is_active && <Badge variant="outline" className="text-xs shrink-0">Paused</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge variant="secondary" className="capitalize">{audienceLabel(ad.target_type)}</Badge>
                    {ad.target_page && <Badge variant="outline">{ad.target_page}</Badge>}
                    {ad.target_item_slug && <Badge variant="outline" className="font-mono">{ad.target_item_slug}</Badge>}
                    {ad.target_city && <Badge variant="outline">📍 {ad.target_city}</Badge>}
                    <span className="text-muted-foreground">• {PLACEMENT_OPTIONS.find(p => p.value === ad.position)?.label}</span>
                    <span className="text-muted-foreground">• Priority {ad.priority}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={ad.is_active} onCheckedChange={(v) => handleToggle(ad.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => duplicateAd(ad)} className="w-8 h-8" title="Duplicate"><Copy className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(ad)} className="w-8 h-8" title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)} className="w-8 h-8 text-destructive hover:text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                  {ad.link_url && ad.link_url !== "#" && (
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3.5 h-3.5" /></a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{step}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="text-xs text-destructive mt-1">⚠️ {error}</p>}
      {hint && !error && <Hint>{hint}</Hint>}
    </div>
  );
}

function AdPreview({ form }: { form: AdForm }) {
  const { title, subtitle, cta_text, bg_gradient, variant, image_url } = form;
  const t = title || "Your Ad Title";

  const bgStyle = image_url
    ? { backgroundImage: `url(${image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};
  const overlayClass = image_url ? "bg-black/40" : "";

  if (variant === "leaderboard") {
    return (
      <div className={`bg-gradient-to-r ${bg_gradient} h-14 rounded-xl flex items-center justify-center px-4 relative overflow-hidden`} style={bgStyle}>
        <div className={`absolute inset-0 ${overlayClass}`} />
        <div className="relative flex items-center gap-4">
          <p className="text-white text-sm font-medium truncate mr-4">{t}</p>
          <span className="px-4 py-1.5 bg-white text-foreground text-sm font-semibold rounded-full">{cta_text || "Learn More"}</span>
        </div>
      </div>
    );
  }
  if (variant === "vertical") {
    return (
      <div className={`bg-gradient-to-b ${bg_gradient} rounded-xl p-5 max-w-[220px] relative overflow-hidden`} style={bgStyle}>
        <div className={`absolute inset-0 ${overlayClass}`} />
        <div className="relative">
          <h4 className="text-lg font-bold text-white mb-2">{t}</h4>
          {subtitle && <p className="text-white/80 text-sm mb-3">{subtitle}</p>}
          <span className="block w-full py-2 bg-white text-foreground text-sm font-semibold rounded-xl text-center">{cta_text || "Learn More"}</span>
        </div>
      </div>
    );
  }
  if (variant === "square") {
    return (
      <div className={`bg-gradient-to-br ${bg_gradient} aspect-square rounded-xl flex flex-col items-center justify-center p-5 text-center max-w-[180px] relative overflow-hidden`} style={bgStyle}>
        <div className={`absolute inset-0 ${overlayClass}`} />
        <div className="relative">
          <h4 className="text-lg font-bold text-white mb-2">{t}</h4>
          {subtitle && <p className="text-white/80 text-sm mb-3">{subtitle}</p>}
          <span className="px-5 py-1.5 bg-white text-foreground text-sm font-semibold rounded-xl">{cta_text || "Learn More"}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`bg-gradient-to-r ${bg_gradient} h-24 rounded-xl flex items-center justify-between px-6 relative overflow-hidden`} style={bgStyle}>
      <div className={`absolute inset-0 ${overlayClass}`} />
      <div className="relative flex items-center justify-between w-full">
        <div>
          <h4 className="text-lg font-bold text-white">{t}</h4>
          {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}
        </div>
        <span className="flex items-center gap-2 px-5 py-2 bg-white text-foreground font-semibold rounded-xl text-sm">
          {cta_text || "Learn More"}
          <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

function QuickGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="bg-card rounded-2xl border border-primary/20 p-5 md:p-6 mb-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Complete Ad System Guide
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      <div className="space-y-6 text-sm">
        {/* Core concept */}
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
          <p className="font-semibold mb-2">💡 The Big Idea</p>
          <p className="text-muted-foreground">
            You create ads and tell the system <strong className="text-foreground">where</strong> they should appear.
            The system automatically picks the <strong className="text-foreground">most relevant ad</strong> for each page a visitor sees.
            More specific ads always win over generic ones.
          </p>
        </div>

        {/* Detailed targeting flows */}
        <div>
          <p className="font-semibold mb-3">🎯 Targeting Types - Explained in Detail</p>
          <div className="space-y-4">
            <GuideCard
              emoji="🎯" title="1. Item-Specific Ad (Highest Priority)"
              what="Shows ONLY on one specific college, course, exam, or article detail page."
              how={[
                'Click "New Ad" → Step 2 → Choose "Show on a Specific College / Course / Exam / Article"',
                'Select the page type (e.g. Colleges Page)',
                'A dropdown appears listing all items - pick the exact one (e.g. "IIT Delhi")',
                'The system uses the "slug" (URL name like "iit-delhi") to match the ad to that page',
              ]}
              example='Ad for "IIT Delhi Admissions 2026" → only shows when someone visits /colleges/iit-delhi'
            />
            <GuideCard
              emoji="📄📍" title="2. Page + City Ad"
              what="Shows on a specific listing page only for users in a specific city."
              how={[
                'Choose "Show on a Specific Page" → pick the page (e.g. Colleges)',
                'Then in the "City filter" dropdown, pick a city (e.g. Mumbai)',
              ]}
              example='Ad for "Mumbai Colleges Fair" → shows on /colleges only for Mumbai visitors'
            />
            <GuideCard
              emoji="📄" title="3. Page-Only Ad"
              what="Shows on a specific listing page for ALL visitors regardless of city."
              how={[
                'Choose "Show on a Specific Page" → pick the page (e.g. Exams)',
                'Leave the "City filter" on "All cities"',
              ]}
              example='Ad for "JEE Preparation Kit" → shows on /exams page for everyone'
            />
            <GuideCard
              emoji="📍" title="4. City-Only Ad"
              what="Shows on ANY page for visitors in a specific city."
              how={[
                'Choose "Show for a Specific City" → pick the city',
              ]}
              example='Ad for "Delhi Coaching Center" → shows on every page for Delhi visitors'
            />
            <GuideCard
              emoji="🌍" title="5. Universal Ad (Lowest Priority - Fallback)"
              what="Shows on any page when no better-matched ad exists. This is your safety net."
              how={[
                'Choose "Show Everywhere" - no other selection needed',
              ]}
              example='Generic "Download Our App" ad → shows everywhere when nothing else matches'
            />
          </div>
        </div>

        {/* Priority */}
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
          <p className="font-semibold mb-2">📊 Priority Order (most specific wins)</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {["🎯 Item", "📄📍 Page+City", "📄 Page", "📍 City", "🌍 Universal"].map((label, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">{i + 1}</span>
                {label}
                {i < 4 && <span className="text-muted-foreground mx-1">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Image sizes */}
        <div>
          <p className="font-semibold mb-3">🖼️ Recommended Image Sizes</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {LOOK_OPTIONS.map((opt) => (
              <div key={opt.value} className="p-3 bg-muted rounded-xl border">
                <p className="font-medium">{opt.emoji} {opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.help}</p>
                <p className="text-xs font-mono mt-1 text-primary">{opt.size}</p>
              </div>
            ))}
          </div>
          <Hint>Images are optional. Without an image, the ad uses the selected color gradient as background.</Hint>
        </div>

        {/* Quick tips */}
        <div className="p-4 bg-muted rounded-xl">
          <p className="font-semibold mb-2">💡 Quick Tips</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>✅ <strong className="text-foreground">Always create at least 1 Universal ad</strong> - it's the safety net that shows when nothing else matches.</li>
            <li>✅ <strong className="text-foreground">Higher priority number wins</strong> - if two ads match the same spot, the one with higher priority shows.</li>
            <li>✅ <strong className="text-foreground">Pause instead of delete</strong> - you can turn ads off temporarily with the toggle.</li>
            <li>✅ <strong className="text-foreground">Use the Duplicate button</strong> - faster than creating from scratch.</li>
            <li>✅ <strong className="text-foreground">Upload images</strong> for better-looking ads, or use gradient colors for quick setup.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function GuideCard({ title, what, how, example }: { emoji: string; title: string; what: string; how: string[]; example: string }) {
  return (
    <div className="p-4 bg-muted/50 rounded-xl border border-border">
      <p className="font-semibold text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-2"><strong>What:</strong> {what}</p>
      <p className="text-xs text-muted-foreground mb-1"><strong>How to create:</strong></p>
      <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5 ml-2 mb-2">
        {how.map((step, i) => <li key={i}>{step}</li>)}
      </ol>
      <p className="text-xs bg-primary/5 rounded-lg px-2 py-1 border border-primary/10">
        <strong>Example:</strong> {example}
      </p>
    </div>
  );
}
