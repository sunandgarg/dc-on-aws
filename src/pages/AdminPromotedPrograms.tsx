import { useEffect, useState } from "react";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GraduationCap, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { CSVTools } from "@/components/CSVTools";
import { SlugSearchInput } from "@/components/admin/SlugSearchInput";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { RepeaterField } from "@/components/admin/RepeaterField";
import { ArrayFieldEditor } from "@/components/ArrayFieldEditor";
import { Link } from "react-router-dom";
import { useDraftState } from "@/hooks/useDraftState";

const BADGES = ["New", "Popular", "Best Seller", "Featured", "Trending"];
const PROGRAM_TYPES = ["Bachelor's Degree", "Master's Degree", "Diploma", "Certificate", "PhD", "Doctorate"];
const TAG_PRESETS = ["IIT", "IIM", "Dr."];
const DELIVERY_MODES = ["Online", "Hybrid", "Offline"];
const COUNTRIES = ["India", "USA", "UK", "Canada", "Australia", "Germany", "Singapore", "UAE", "France", "Ireland", "New Zealand", "Netherlands"];

function slugify(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseJsonField(v: any, fallback: any) {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

const empty: any = {
  title: "", college_name: "", college_slug: "", course_slug: "", slug: "",
  category_slug: "",
  badge: "New", badge_variant: "default", program_type: "Bachelor's Degree",
  tag: "IIT", delivery_mode: "Online", country: "India",
  duration: "24 Months", original_price: 0, discount_percent: 0,
  display_order: 0, is_active: true, image_url: "",
  hero_image: "", hero_video_url: "", youtube_url: "", brochure_url: "", apply_url: "", contact_phone: "",
  summary: "", about_program: "", eligibility: "", batch_start_date: "",
  schedule: "", emi_starts_at: 0, certificate_image: "", degree_image: "",
  rating: 0, learners_count: "", ranking_text: "", why_this_program: "",
  highlights: [], learning_outcomes: [], curriculum: [], faculty: [],
  faqs: [], fee_breakdown: [], partner_logos: [], tools_taught: [],
  placement_stats: {}, who_should_apply: [], application_steps: [],
  program_stats: {}, top_companies: [], mentors: [], testimonials: [],
  institute_logo: "", institute_legacy_title: "", institute_legacy_points: [],
  meta_title: "", meta_description: "",
};

export default function AdminPromotedPrograms() {
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [editing, setEditing] = useDraftState<any | null>('admin.promoted-programs.editing.v1', null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [{ data: pData }, { data: cData }] = await Promise.all([
      (supabase as any).from("promoted_programs").select("*").order("display_order"),
      (supabase as any).from("program_categories").select("slug,name,icon_emoji").eq("is_active", true).order("display_order"),
    ]);
    setRows(pData || []);
    setCats(cData || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const openEditor = (row: any) => {
    // Coerce JSON-ish fields to in-memory arrays/objects so repeaters can edit them.
    const coerce = (v: any, fallback: any) => {
      if (v === null || v === undefined || v === "") return fallback;
      if (typeof v === "string") { try { return JSON.parse(v); } catch { return fallback; } }
      return v;
    };
    setEditing({
      ...empty,
      ...row,
      highlights: coerce(row.highlights, []),
      learning_outcomes: coerce(row.learning_outcomes, []),
      curriculum: (coerce(row.curriculum, []) as any[]).map((c: any) => ({
        ...c,
        modules_text: Array.isArray(c?.modules) ? c.modules.join("\n") : (c?.modules_text || ""),
      })),
      faculty: coerce(row.faculty, []),
      faqs: coerce(row.faqs, []),
      fee_breakdown: coerce(row.fee_breakdown, []),
      partner_logos: coerce(row.partner_logos, []),
      tools_taught: coerce(row.tools_taught, []),
      placement_stats: coerce(row.placement_stats, {}),
      who_should_apply: coerce(row.who_should_apply, []),
      application_steps: coerce(row.application_steps, []),
      program_stats: coerce(row.program_stats, {}),
      top_companies: coerce(row.top_companies, []),
      mentors: coerce(row.mentors, []),
      testimonials: coerce(row.testimonials, []),
      institute_legacy_points: coerce(row.institute_legacy_points, []),
    });
  };

  const save = async () => {
    if (!editing.title || !editing.college_name) { toast.error("Title and College Name required"); return; }
    const tag = (editing.tag || "").trim();
    if (!tag) { toast.error("Tag is required (IIT / IIM / Dr. or custom)"); return; }
    let finalSlug = (editing.slug || "").trim() || slugify(`${editing.title}-${editing.college_name}`);

    // Curriculum items use a multi-line `modules_text` field in the admin UI -
    // split to the structured `modules` array the detail page expects.
    const curriculum = Array.isArray(editing.curriculum) ? editing.curriculum.map((c: any) => {
      const modules = Array.isArray(c.modules) ? c.modules
        : (c.modules_text ? String(c.modules_text).split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean) : []);
      const { modules_text, ...rest } = c || {};
      return { ...rest, modules };
    }) : [];

    const { id, created_at, updated_at, ...rest } = { ...editing, slug: finalSlug, tag, curriculum };
    const { error } = id
      ? await (supabase as any).from("promoted_programs").update(rest).eq("id", id)
      : await (supabase as any).from("promoted_programs").insert(rest);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    const { error } = await (supabase as any).from("promoted_programs").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  const update = (k: string, v: any) => setEditing((p: any) => ({ ...p, [k]: v }));

  return (
    <AdminLayout title="Popular Programs">
      <div className="mb-3"><AIGenerateDialog entityType="promoted_programs" table="promoted_programs" upsertKey="slug" /></div>
      <p className="text-sm text-muted-foreground mb-3">
        Premium programs shown on the homepage carousel. Each program also has a detail page at <code>/premium-programs/&lt;slug&gt;</code>.
        Manage chip categories in <Link to="/admin/program-categories" className="text-primary underline">Program Categories</Link>.
      </p>

      <div className="mb-3">
        <CSVTools
          table="promoted_programs"
          filename="promoted-programs.csv"
          columns="*"
          typeHints={{ original_price: "number", discount_percent: "number", display_order: "number", is_active: "boolean" }}
          upsertKey="id"
          onImported={reload}
        />
      </div>

      <Button onClick={() => openEditor({ ...empty })} className="rounded-xl gap-2 mb-3"><Plus className="w-4 h-4" /> Add Program</Button>

      <div className="space-y-2">
        {loading ? <p className="text-muted-foreground">Loading…</p> : rows.map((r) => (
          <div key={r.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <GraduationCap className="w-8 h-8 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{r.title}</span>
                <Badge variant="outline" className="text-[10px]">{r.badge}</Badge>
                {r.category_slug && <Badge variant="secondary" className="text-[10px]">{r.category_slug}</Badge>}
                {!r.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{r.college_name} · {r.program_type} · ₹{Number(r.original_price).toLocaleString("en-IN")} ({r.discount_percent}% off)</p>
            </div>
            {r.slug && (
              <Link to={`/premium-programs/${r.slug}`} target="_blank" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Preview <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            <Button size="icon" variant="ghost" onClick={() => openEditor(r)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Premium Program</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* CORE */}
              <Section title="Core">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Title *"><Input value={editing.title} onChange={(e) => update("title", e.target.value)} placeholder="Doctor of Business Administration" /></Field>
                  <Field label="College Name *"><Input value={editing.college_name} onChange={(e) => update("college_name", e.target.value)} placeholder="ESGCI Paris" /></Field>
                  <Field label="URL Slug (auto-generated if empty)">
                    <Input value={editing.slug} onChange={(e) => update("slug", e.target.value)} placeholder="dba-esgci-paris" />
                  </Field>
                  <Field label="Category (chip above cards)">
                    <select value={editing.category_slug || ""} onChange={(e) => update("category_slug", e.target.value)} className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm">
                      <option value="">- Uncategorised -</option>
                      {cats.map((c) => <option key={c.slug} value={c.slug}>{c.icon_emoji} {c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="College (search)">
                    <SlugSearchInput table="colleges" value={editing.college_slug} onChange={(slug, row) => setEditing((p:any)=>({ ...p, college_slug: slug, college_name: row?.name || p.college_name }))} />
                  </Field>
                  <Field label="Course (search)">
                    <SlugSearchInput table="courses" value={editing.course_slug} onChange={(slug) => update("course_slug", slug)} />
                  </Field>
                  <Field label="Badge">
                    <select value={editing.badge} onChange={(e) => update("badge", e.target.value)} className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm">
                      {BADGES.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Program Type">
                    <select value={editing.program_type} onChange={(e) => update("program_type", e.target.value)} className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm">
                      {PROGRAM_TYPES.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Tag (shown on card)</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {TAG_PRESETS.map(t => (
                        <button key={t} type="button" onClick={() => update("tag", t)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${editing.tag === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}
                        >{t}</button>
                      ))}
                      <button type="button" onClick={() => update("tag", TAG_PRESETS.includes(editing.tag) ? "" : editing.tag)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${!TAG_PRESETS.includes(editing.tag) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}
                      >Other</button>
                      {!TAG_PRESETS.includes(editing.tag) && (
                        <Input value={editing.tag || ""} onChange={(e) => update("tag", e.target.value)} placeholder="Custom tag" className="h-8 max-w-[200px] text-xs" />
                      )}
                    </div>
                  </div>
                  <Field label="Duration"><Input value={editing.duration} onChange={(e) => update("duration", e.target.value)} placeholder="24 Months" /></Field>
                  <Field label="Delivery Mode">
                    <select value={editing.delivery_mode || "Online"} onChange={(e) => update("delivery_mode", e.target.value)} className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm">
                      {DELIVERY_MODES.map(m => <option key={m} value={m}>{m === "Hybrid" ? "Hybrid (Online + Offline)" : m}</option>)}
                    </select>
                  </Field>
                  <Field label="Country">
                    <select value={editing.country || "India"} onChange={(e) => update("country", e.target.value)} className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm">
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Original Price (₹)"><Input type="number" value={editing.original_price} onChange={(e) => update("original_price", parseFloat(e.target.value) || 0)} /></Field>
                  <Field label="Discount %"><Input type="number" value={editing.discount_percent} onChange={(e) => update("discount_percent", parseInt(e.target.value) || 0)} /></Field>
                  <Field label="EMI starts at (₹/mo, optional)"><Input type="number" value={editing.emi_starts_at} onChange={(e) => update("emi_starts_at", parseFloat(e.target.value) || 0)} /></Field>
                  <Field label="Display Order"><Input type="number" value={editing.display_order} onChange={(e) => update("display_order", parseInt(e.target.value) || 0)} /></Field>
                </div>
                <ImageUploadField label="Card Image (recommended 600×400)" value={editing.image_url || ""} onChange={(v) => update("image_url", v)} folder="promoted-programs" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => update("is_active", e.target.checked)} />
                  <label className="text-sm">Active</label>
                </div>
              </Section>

              {/* DETAIL PAGE */}
              <Section title="Detail Page Hero">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Brochure URL"><Input value={editing.brochure_url} onChange={(e) => update("brochure_url", e.target.value)} placeholder="https://…/brochure.pdf" /></Field>
                  <Field label="Apply URL (optional)"><Input value={editing.apply_url} onChange={(e) => update("apply_url", e.target.value)} placeholder="https://…/apply" /></Field>
                  <Field label="Contact Phone (shows Call button)"><Input value={editing.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="+91 98765 43210" /></Field>
                  <Field label="Batch Start Date"><Input value={editing.batch_start_date} onChange={(e) => update("batch_start_date", e.target.value)} placeholder="15 Aug 2026" /></Field>
                  <Field label="Schedule"><Input value={editing.schedule} onChange={(e) => update("schedule", e.target.value)} placeholder="Weekend, Sun 10AM–1PM" /></Field>
                  <Field label="Hero Video URL (YouTube embed)"><Input value={editing.hero_video_url} onChange={(e) => update("hero_video_url", e.target.value)} placeholder="https://www.youtube.com/embed/…" /></Field>
                  <Field label="YouTube Popup URL (Watch button)"><Input value={editing.youtube_url} onChange={(e) => update("youtube_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></Field>
                  <Field label="Rating (e.g. 4.7)"><Input type="number" step="0.1" value={editing.rating} onChange={(e) => update("rating", parseFloat(e.target.value) || 0)} /></Field>
                  <Field label="Learners Count (e.g. 1500+)"><Input value={editing.learners_count} onChange={(e) => update("learners_count", e.target.value)} /></Field>
                  <Field label="Ranking Text"><Input value={editing.ranking_text} onChange={(e) => update("ranking_text", e.target.value)} placeholder="Ranked #3 globally" /></Field>
                </div>
                <Field label="Why this program (long-form pitch)">
                  <Textarea rows={4} value={editing.why_this_program} onChange={(e) => update("why_this_program", e.target.value)} placeholder="What makes this program special and how it changes careers" />
                </Field>
                <ImageUploadField label="Hero Image (1200×600)" value={editing.hero_image || ""} onChange={(v) => update("hero_image", v)} folder="promoted-programs" />
                <Field label="Short Summary (shown under hero)">
                  <Textarea rows={3} value={editing.summary} onChange={(e) => update("summary", e.target.value)} placeholder="One-line summary that sells the outcome" />
                </Field>
                <Field label="About the Program (long-form, plain text or HTML)">
                  <Textarea rows={5} value={editing.about_program} onChange={(e) => update("about_program", e.target.value)} />
                </Field>
                <Field label="Eligibility">
                  <Textarea rows={3} value={editing.eligibility} onChange={(e) => update("eligibility", e.target.value)} placeholder="Bachelor's degree + 3 years experience" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <ImageUploadField label="Sample Certificate Image" value={editing.certificate_image || ""} onChange={(v) => update("certificate_image", v)} folder="promoted-programs" />
                  <ImageUploadField label="Sample Degree Image" value={editing.degree_image || ""} onChange={(v) => update("degree_image", v)} folder="promoted-programs" />
                </div>
              </Section>

              <Section title="About the Institute (logo + legacy points)">
                <div className="grid sm:grid-cols-2 gap-3">
                  <ImageUploadField label="Institute Logo (transparent PNG works best)" value={editing.institute_logo || ""} onChange={(v) => update("institute_logo", v)} folder="promoted-programs" />
                  <Field label="Section Headline (optional - defaults to 'College : Legacy That Nurtures Excellence')">
                    <Input value={editing.institute_legacy_title} onChange={(e) => update("institute_legacy_title", e.target.value)} placeholder="IIM Kozhikode : Legacy That Nurtures Excellence" />
                  </Field>
                </div>
                <RepeaterField
                  label="Legacy points (checkmark bullets)" addLabel="Add point"
                  items={Array.isArray(editing.institute_legacy_points) ? editing.institute_legacy_points : []}
                  onChange={(v) => update("institute_legacy_points", v)}
                  defaultItem={{ title: "", description: "" }}
                  fields={[
                    { key: "title", label: "Title", placeholder: "A Premier IIM Institution" },
                    { key: "description", label: "Description", placeholder: "Established in 1996, IIM Kozhikode is one of India's leading…", type: "textarea" },
                  ]}
                />
              </Section>


              {/* STRUCTURED LISTS - repeaters, no JSON required */}
              <Section title="Highlights, Outcomes & Tools (simple lists)">
                <ArrayFieldEditor label="Program highlights (chips on detail page)" values={Array.isArray(editing.highlights) ? editing.highlights : []} onChange={(v) => update("highlights", v)} placeholder="e.g. Live mentor sessions" />
                <ArrayFieldEditor label="Learning outcomes" values={Array.isArray(editing.learning_outcomes) ? editing.learning_outcomes : []} onChange={(v) => update("learning_outcomes", v)} placeholder="e.g. Lead cross-functional teams" />
                <ArrayFieldEditor label="Tools / Technologies taught" values={Array.isArray(editing.tools_taught) ? editing.tools_taught : []} onChange={(v) => update("tools_taught", v)} placeholder="e.g. Python" />
              </Section>

              <Section title="Hero & Program Stats">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Field label="Hours"><Input value={editing.program_stats?.hours || ""} onChange={(e) => update("program_stats", { ...(editing.program_stats||{}), hours: e.target.value })} placeholder="400+" /></Field>
                  <Field label="Modules"><Input value={editing.program_stats?.modules || ""} onChange={(e) => update("program_stats", { ...(editing.program_stats||{}), modules: e.target.value })} placeholder="12" /></Field>
                  <Field label="Projects"><Input value={editing.program_stats?.projects || ""} onChange={(e) => update("program_stats", { ...(editing.program_stats||{}), projects: e.target.value })} placeholder="15+" /></Field>
                  <Field label="Live sessions"><Input value={editing.program_stats?.sessions || ""} onChange={(e) => update("program_stats", { ...(editing.program_stats||{}), sessions: e.target.value })} placeholder="50+" /></Field>
                </div>
              </Section>

              <Section title="Who Should Apply">
                <RepeaterField
                  label="Personas" addLabel="Add persona"
                  items={Array.isArray(editing.who_should_apply) ? editing.who_should_apply : []}
                  onChange={(v) => update("who_should_apply", v)}
                  defaultItem={{ title: "", desc: "", icon: "🎯" }}
                  fields={[
                    { key: "icon", label: "Icon emoji", placeholder: "🎯" },
                    { key: "title", label: "Title", placeholder: "Working Professionals" },
                    { key: "desc", label: "Description", type: "textarea", placeholder: "3+ yrs of experience…" },
                  ]}
                />
              </Section>

              <Section title="Curriculum">
                <RepeaterField
                  label="Terms / Modules" addLabel="Add module"
                  items={Array.isArray(editing.curriculum) ? editing.curriculum : []}
                  onChange={(v) => update("curriculum", v)}
                  defaultItem={{ term: "", title: "", modules_text: "" }}
                  fields={[
                    { key: "term", label: "Term / Year", placeholder: "Year 1" },
                    { key: "title", label: "Module title", placeholder: "Foundations of Strategy" },
                    { key: "modules_text", label: "Sub-modules (one per line)", type: "textarea", placeholder: "Strategy\nFinance\nMarketing" },
                  ]}
                />
                <p className="text-[11px] text-muted-foreground">Sub-modules are auto-split by line and rendered as bullets on the detail page.</p>
              </Section>

              <Section title="Faculty">
                <RepeaterField
                  label="Faculty members" addLabel="Add faculty"
                  items={Array.isArray(editing.faculty) ? editing.faculty : []}
                  onChange={(v) => update("faculty", v)}
                  defaultItem={{ name: "", title: "", photo: "", linkedin_url: "" }}
                  fields={[
                    { key: "name", label: "Name", placeholder: "Dr. A. Sharma" },
                    { key: "title", label: "Title / Designation", placeholder: "Professor of Strategy" },
                    { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/…" },
                    { key: "photo", label: "Photo", type: "image", folder: "promoted-programs/faculty" },
                  ]}
                />
              </Section>

              <Section title="Industry Mentors">
                <RepeaterField
                  label="Mentors" addLabel="Add mentor"
                  items={Array.isArray(editing.mentors) ? editing.mentors : []}
                  onChange={(v) => update("mentors", v)}
                  defaultItem={{ name: "", title: "", company: "", photo: "", linkedin_url: "" }}
                  fields={[
                    { key: "name", label: "Name", placeholder: "Riya Mehta" },
                    { key: "title", label: "Role", placeholder: "VP Engineering" },
                    { key: "company", label: "Company", placeholder: "Microsoft" },
                    { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/…" },
                    { key: "photo", label: "Photo", type: "image", folder: "promoted-programs/mentors" },
                  ]}
                />
              </Section>

              <Section title="Top Hiring Companies">
                <RepeaterField
                  label="Companies" addLabel="Add company"
                  items={Array.isArray(editing.top_companies) ? editing.top_companies : []}
                  onChange={(v) => update("top_companies", v)}
                  defaultItem={{ name: "", logo: "" }}
                  fields={[
                    { key: "name", label: "Company name", placeholder: "Google" },
                    { key: "logo", label: "Logo", type: "image", folder: "promoted-programs/companies" },
                  ]}
                />
              </Section>

              <Section title="Placement Stats">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Field label="Avg. salary hike (%)"><Input type="number" value={editing.placement_stats?.avg_hike_pct || 0} onChange={(e) => update("placement_stats", { ...(editing.placement_stats||{}), avg_hike_pct: parseFloat(e.target.value) || 0 })} /></Field>
                  <Field label="Highest CTC"><Input value={editing.placement_stats?.highest_ctc || ""} onChange={(e) => update("placement_stats", { ...(editing.placement_stats||{}), highest_ctc: e.target.value })} placeholder="42 LPA" /></Field>
                  <Field label="Transitions / Placed"><Input value={editing.placement_stats?.transitions || ""} onChange={(e) => update("placement_stats", { ...(editing.placement_stats||{}), transitions: e.target.value })} placeholder="500+" /></Field>
                </div>
              </Section>

              <Section title="Testimonials">
                <RepeaterField
                  label="Alumni testimonials" addLabel="Add testimonial"
                  items={Array.isArray(editing.testimonials) ? editing.testimonials : []}
                  onChange={(v) => update("testimonials", v)}
                  defaultItem={{ name: "", role: "", company: "", quote: "", photo: "" }}
                  fields={[
                    { key: "name", label: "Name", placeholder: "Aman Verma" },
                    { key: "role", label: "Role", placeholder: "Product Manager" },
                    { key: "company", label: "Company", placeholder: "Flipkart" },
                    { key: "quote", label: "Quote", type: "textarea", placeholder: "This program transformed my career…" },
                    { key: "photo", label: "Photo", type: "image", folder: "promoted-programs/testimonials" },
                  ]}
                />
              </Section>

              <Section title="Application Process">
                <RepeaterField
                  label="Steps" addLabel="Add step"
                  items={Array.isArray(editing.application_steps) ? editing.application_steps : []}
                  onChange={(v) => update("application_steps", v)}
                  defaultItem={{ title: "", desc: "" }}
                  fields={[
                    { key: "title", label: "Step title", placeholder: "Submit application" },
                    { key: "desc", label: "Description", type: "textarea", placeholder: "Fill the form and upload documents." },
                  ]}
                />
              </Section>

              <Section title="Fee Breakdown">
                <RepeaterField
                  label="Fee line items" addLabel="Add line"
                  items={Array.isArray(editing.fee_breakdown) ? editing.fee_breakdown : []}
                  onChange={(v) => update("fee_breakdown", v)}
                  defaultItem={{ label: "", amount: 0 }}
                  fields={[
                    { key: "label", label: "Label", placeholder: "Tuition fee" },
                    { key: "amount", label: "Amount (₹)", type: "number", placeholder: "600000" },
                  ]}
                />
              </Section>

              <Section title="Accreditation / Partner Logos">
                <RepeaterField
                  label="Partners" addLabel="Add partner"
                  items={Array.isArray(editing.partner_logos) ? editing.partner_logos : []}
                  onChange={(v) => update("partner_logos", v)}
                  defaultItem={{ name: "", logo: "" }}
                  fields={[
                    { key: "name", label: "Partner name", placeholder: "NSDC" },
                    { key: "logo", label: "Logo", type: "image", folder: "promoted-programs/partners" },
                  ]}
                />
              </Section>

              <Section title="FAQs">
                <RepeaterField
                  label="Frequently asked questions" addLabel="Add FAQ"
                  items={Array.isArray(editing.faqs) ? editing.faqs : []}
                  onChange={(v) => update("faqs", v)}
                  defaultItem={{ q: "", a: "" }}
                  fields={[
                    { key: "q", label: "Question", placeholder: "Is the program 100% online?" },
                    { key: "a", label: "Answer", type: "textarea", placeholder: "Yes, with monthly optional immersions." },
                  ]}
                />
              </Section>

              {/* SEO */}
              <Section title="SEO">
                <Field label="Meta Title"><Input value={editing.meta_title} onChange={(e) => update("meta_title", e.target.value)} /></Field>
                <Field label="Meta Description"><Textarea rows={2} value={editing.meta_description} onChange={(e) => update("meta_description", e.target.value)} /></Field>
              </Section>

              <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background py-2 -mx-6 px-6 border-t border-border">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3 bg-muted/30">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function JsonField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Textarea rows={4} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono text-xs" />
    </div>
  );
}
