import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCatUniverseData } from "@/hooks/useCatUniverse";
import { CAT_UNIVERSE_DEFAULT_SETTINGS } from "@/lib/catUniverse";

const tabs = [
  { key: "overview", label: "Overview", href: "/admin/cat-universe" },
  { key: "sections", label: "Sections", href: "/admin/cat-universe/sections" },
  { key: "modules", label: "Modules", href: "/admin/cat-universe/modules" },
  { key: "resources", label: "Resources", href: "/admin/cat-universe/resources" },
  { key: "cutoffs", label: "Cut-offs", href: "/admin/cat-universe/cutoffs" },
];

export default function AdminCatUniverse() {
  const location = useLocation();
  const currentTab = tabs.find((item) => item.href === location.pathname)?.key || "overview";
  const { data, refetch } = useCatUniverseData();
  const [settings, setSettings] = useState(CAT_UNIVERSE_DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data?.settings]);

  const stats = useMemo(() => ({
    sections: (data?.sections || []).filter((item) => item.is_active).length,
    modules: (data?.modules || []).filter((item) => item.is_active).length,
    resources: (data?.resources || []).filter((item) => item.is_active).length,
    cutoffs: (data?.cutoffs || []).filter((item) => item.is_active).length,
  }), [data]);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("cat_universe_settings")
      .upsert(settings, { onConflict: "slug" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("CAT Universe settings saved");
    refetch();
  };

  return (
    <AdminLayout title="CAT Universe">
      <div className="space-y-6">
        <div>
          <div className="text-3xl font-black tracking-tight text-foreground">CAT Universe</div>
          <div className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            This admin area controls the public CAT Universe landing page, homepage spotlight, calculators, resource hubs, post-result workflows and cut-off explorers.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Link key={item.key} to={item.href}>
              <Button variant={currentTab === item.key ? "default" : "outline"} className="rounded-full">
                {item.label}
              </Button>
            </Link>
          ))}
        </div>

        {currentTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Active sections", value: stats.sections, helper: "The 4 top-level MBA intent buckets" },
                { label: "Active modules", value: stats.modules, helper: "Landing-page cards and routeable tools" },
                { label: "Resource cards", value: stats.resources, helper: "Year packs, templates and checklists" },
                { label: "Cut-off rows", value: stats.cutoffs, helper: "Filterable discovery data for MBA colleges" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-border bg-card p-5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</div>
                  <div className="mt-2 text-3xl font-black text-foreground">{item.value}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{item.helper}</div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold text-foreground">Landing and homepage settings</div>
                <Badge variant="outline">Public-facing</Badge>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Hero badge</label>
                  <Input value={settings.hero_badge} onChange={(event) => setSettings((prev) => ({ ...prev, hero_badge: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                  <Input value={settings.title} onChange={(event) => setSettings((prev) => ({ ...prev, title: event.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Subtitle</label>
                  <Textarea value={settings.subtitle} onChange={(event) => setSettings((prev) => ({ ...prev, subtitle: event.target.value }))} rows={4} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Primary CTA label</label>
                  <Input value={settings.primary_cta_label} onChange={(event) => setSettings((prev) => ({ ...prev, primary_cta_label: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Primary CTA href</label>
                  <Input value={settings.primary_cta_href} onChange={(event) => setSettings((prev) => ({ ...prev, primary_cta_href: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Homepage toggle label</label>
                  <Input value={settings.toggle_label} onChange={(event) => setSettings((prev) => ({ ...prev, toggle_label: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Lead title</label>
                  <Input value={settings.lead_title} onChange={(event) => setSettings((prev) => ({ ...prev, lead_title: event.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Lead subtitle</label>
                  <Textarea value={settings.lead_subtitle} onChange={(event) => setSettings((prev) => ({ ...prev, lead_subtitle: event.target.value }))} rows={3} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">SEO title</label>
                  <Input value={settings.seo_title} onChange={(event) => setSettings((prev) => ({ ...prev, seo_title: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Show homepage toggle</label>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={settings.show_home_toggle ? "true" : "false"}
                    onChange={(event) => setSettings((prev) => ({ ...prev, show_home_toggle: event.target.value === "true" }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">SEO description</label>
                  <Textarea value={settings.seo_description} onChange={(event) => setSettings((prev) => ({ ...prev, seo_description: event.target.value }))} rows={4} />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button onClick={saveSettings} disabled={saving} className="rounded-xl">
                  {saving ? "Saving..." : "Save settings"}
                </Button>
                <Link to="/cat-universe" target="_blank" rel="noreferrer">
                  <Button variant="outline" className="rounded-xl">Preview CAT Universe</Button>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {currentTab === "sections" ? (
          <SimpleTableAdmin
            table="cat_universe_sections"
            titleKey="title"
            subtitleKey="slug"
            orderBy={{ column: "display_order", ascending: true }}
            defaultValues={{ display_order: 0, is_active: true, icon_name: "sparkles", accent_class: "from-orange-500 to-rose-500" }}
            fields={[
              { key: "slug", label: "Slug", required: true },
              { key: "title", label: "Title", required: true },
              { key: "description", label: "Description", type: "textarea" },
              { key: "icon_name", label: "Icon name" },
              { key: "accent_class", label: "Accent gradient classes" },
              { key: "lead_hook", label: "Lead hook", type: "textarea" },
              { key: "display_order", label: "Display order", type: "number" },
              { key: "is_active", label: "Active", type: "boolean" },
            ]}
            ioBaseName="cat_universe_sections"
          />
        ) : null}

        {currentTab === "modules" ? (
          <SimpleTableAdmin
            table="cat_universe_modules"
            titleKey="title"
            subtitleKey="slug"
            orderBy={{ column: "display_order", ascending: true }}
            previewBasePath="/cat-universe"
            defaultValues={{ display_order: 0, is_active: true, show_on_home: false, is_featured: false, module_type: "resource_hub", exam_key: "cat", icon_name: "sparkles", lead_source: "cat_universe_module" }}
            fields={[
              { key: "section_slug", label: "Section slug", required: true },
              { key: "slug", label: "Slug", required: true },
              { key: "title", label: "Title", required: true },
              { key: "subtitle", label: "Subtitle" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "module_type", label: "Module type" },
              { key: "exam_key", label: "Exam key" },
              { key: "icon_name", label: "Icon name" },
              { key: "badge", label: "Badge" },
              { key: "stat_label", label: "Stat label" },
              { key: "stat_value", label: "Stat value" },
              { key: "detail_points", label: "Detail points (one per line)", type: "textarea" },
              { key: "audience_text", label: "Audience text", type: "textarea" },
              { key: "primary_cta_label", label: "Primary CTA label" },
              { key: "primary_cta_href", label: "Primary CTA href" },
              { key: "lead_source", label: "Lead source" },
              { key: "display_order", label: "Display order", type: "number" },
              { key: "is_featured", label: "Featured", type: "boolean" },
              { key: "show_on_home", label: "Show on home", type: "boolean" },
              { key: "is_active", label: "Active", type: "boolean" },
            ]}
            ioBaseName="cat_universe_modules"
          />
        ) : null}

        {currentTab === "resources" ? (
          <SimpleTableAdmin
            table="cat_universe_resources"
            titleKey="title"
            subtitleKey="module_slug"
            orderBy={{ column: "display_order", ascending: true }}
            defaultValues={{ display_order: 0, is_active: true, badge: "Add PDF or link in admin" }}
            fields={[
              { key: "module_slug", label: "Module slug", required: true },
              { key: "title", label: "Title", required: true },
              { key: "subtitle", label: "Subtitle", type: "textarea" },
              { key: "resource_type", label: "Resource type" },
              { key: "year", label: "Year", type: "number" },
              { key: "href", label: "Href" },
              { key: "badge", label: "Badge" },
              { key: "meta", label: "Meta" },
              { key: "display_order", label: "Display order", type: "number" },
              { key: "is_active", label: "Active", type: "boolean" },
            ]}
            ioBaseName="cat_universe_resources"
          />
        ) : null}

        {currentTab === "cutoffs" ? (
          <SimpleTableAdmin
            table="cat_universe_cutoffs"
            titleKey="college_name"
            subtitleKey="module_slug"
            orderBy={{ column: "display_order", ascending: true }}
            defaultValues={{ display_order: 0, is_active: true, category: "General", percentile: 0 }}
            fields={[
              { key: "module_slug", label: "Module slug", required: true },
              { key: "college_name", label: "College name", required: true },
              { key: "city", label: "City" },
              { key: "exam_name", label: "Exam name" },
              { key: "category", label: "Category" },
              { key: "percentile", label: "Percentile", type: "number" },
              { key: "cutoff_band", label: "Cut-off band" },
              { key: "fees", label: "Fees" },
              { key: "avg_package", label: "Average package" },
              { key: "college_slug", label: "College slug" },
              { key: "highlight", label: "Highlight", type: "textarea" },
              { key: "display_order", label: "Display order", type: "number" },
              { key: "is_active", label: "Active", type: "boolean" },
            ]}
            ioBaseName="cat_universe_cutoffs"
          />
        ) : null}
      </div>
    </AdminLayout>
  );
}
