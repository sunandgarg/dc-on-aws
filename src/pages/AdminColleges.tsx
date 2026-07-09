import { PermGate } from "@/components/PermGate";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAllDbColleges, useSaveCollege, useDeleteCollege, type DbCollege } from "@/hooks/useCollegesData";
import { AdminFormSection } from "@/components/AdminFormSection";
import { RichTextEditor } from "@/components/RichTextEditor";
import { PageSummaryField } from "@/components/admin/PageSummaryField";
import { ArrayFieldEditor } from "@/components/ArrayFieldEditor";
import { EntitySlugMultiSearch } from "@/components/admin/EntitySlugMultiSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, GraduationCap, Info, MapPin, FileText, Image, Award, Settings, BarChart, CheckCircle2, Eye, Layers, Sparkles, Youtube, Phone, UserCheck, DollarSign, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { ImageHint } from "@/components/ImageHint";
import { UploadOrUrlField, YouTubeField } from "@/components/UploadOrUrlField";
import { AdminStatsBar, QuickFilterPills } from "@/components/AdminStats";
import { CSVTools } from "@/components/CSVTools";
import { RowDataIO } from "@/components/admin/RowDataIO";
import { SlugScopedTableEditor } from "@/components/admin/SlugScopedTableEditor";
import { CourseFeePicker } from "@/components/admin/CourseFeePicker";
import { MultiCategoryPicker } from "@/components/admin/MultiCategoryPicker";
import { FaqInlineEditor } from "@/components/admin/FaqInlineEditor";
import { MultiImageUploader } from "@/components/admin/MultiImageUploader";
import { ApprovalBodyPicker } from "@/components/admin/ApprovalBodyPicker";
import { ParentUniversityPicker } from "@/components/admin/ParentUniversityPicker";
import { OpenOnSiteButton } from "@/components/admin/OpenOnSiteButton";
import { AuthorPicker } from "@/components/admin/AuthorPicker";
import { BulkEditToggle } from "@/components/admin/BulkEditToggle";
import { FeaturedRankPicker } from "@/components/admin/FeaturedRankPicker";
import { FeaturedRankPanel } from "@/components/admin/FeaturedRankPanel";
import { AdminPageSizePicker } from "@/components/admin/AdminPageSizePicker";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = ["Engineering", "Medical", "Management", "Law", "Design", "Science", "Commerce", "Arts", "Pharmacy", "Agriculture"];
const TYPES = ["Government", "Private", "Deemed", "Autonomous"];
const NAAC_GRADES = ["A++", "A+", "A", "B++", "B+", "B", "C", ""];
const STATUSES = ["Draft", "Published"];
const APPROVAL_SUGGESTIONS = ["AICTE", "UGC", "NAAC", "MCI", "BCI", "NMC", "PCI", "AACSB", "EQUIS", "NBA", "COA", "ICAR", "NCTE", "AIU", "INC", "AMBA", "ACBSP", "CRISIL", "RICS", "WASC"];
const FACILITY_SUGGESTIONS = ["Library", "Hostel", "Sports Complex", "Wi-Fi Campus", "Medical Center", "Cafeteria", "Labs", "Auditorium", "Swimming Pool", "Gymnasium", "Incubation Center", "Innovation Lab", "Smart Classrooms", "Research Center", "Conference Hall", "Seminar Hall", "Indoor Stadium", "Outdoor Sports", "ATM on Campus", "Bus Service", "Cab Service", "Bank Branch", "Bookstore", "Photocopy Center", "Print Shop", "Convenience Store", "Power Backup", "24x7 Security", "CCTV Surveillance", "AC Classrooms", "Music Room", "Dance Studio", "Art Studio", "Maker Space", "Robotics Lab", "AI/ML Lab", "Language Lab", "Placement Cell", "Career Counselling", "Yoga Hall", "Meditation Center", "Open-Air Theatre"];
// Industry-standard reusable suggestions for Tags & Highlights - admins can pick or add custom.
const TAG_SUGGESTIONS = ["Top Ranked", "Premium", "NIRF Top 100", "Placement Heavy", "International Exposure", "Industry Mentorship", "Co-ed", "Girls Only", "Boys Only", "Residential", "Day Scholar", "Scholarship Available", "Need-Based Aid", "Merit Aid", "Govt. Funded", "Private", "Deemed", "Autonomous", "Foreign Tie-Up", "Dual Degree", "Online Mode", "Hybrid", "Research Focus", "Startup Friendly", "Incubation Hub", "Smart Campus", "Eco Campus", "Heritage Campus", "Metro Connectivity", "City Center", "Tier-1 City", "Tier-2 City", "Affordable Fees", "High ROI", "Quick Admission", "CUET Accepted", "JEE Accepted", "NEET Accepted", "CAT Accepted", "Direct Admission", "Management Quota"];
const HIGHLIGHT_SUGGESTIONS = ["Top 10 in NIRF", "100% Placement Record", "Average Package ₹10 LPA+", "Highest Package ₹50 LPA+", "International MoUs with 30+ Universities", "Industry-Endorsed Curriculum", "Live Project-Based Learning", "Foreign Faculty Visits", "Modern Smart Classrooms", "AI & Robotics Lab", "Dedicated Placement Cell", "Strong Alumni Network", "Hostel Available for Boys & Girls", "100+ Active Student Clubs", "Sports Scholarships Offered", "Need-Based Financial Aid", "Merit-Based Scholarships up to 100%", "Industry-Mentored Capstone Projects", "Internship Guarantee", "Wi-Fi Enabled Smart Campus", "On-Campus Startup Incubator", "Dual Degree / Twinning Programs", "Semester Abroad Option", "PhD-Qualified Faculty", "Low Student-to-Faculty Ratio", "Center of Excellence Recognized", "Research Grants from Govt. Bodies", "Patents Filed by Faculty/Students", "Strong Industry Partnerships", "Personality Development Workshops"];
import { indianStates as STATES, citiesByState as CITIES_BY_STATE } from "@/data/indianLocations";
import { useDraftState } from "@/hooks/useDraftState";

const emptyCollege: Partial<DbCollege> = {
  slug: "", name: "", short_name: "", location: "", city: "", state: "", type: "Private", category: "Engineering",
  rating: 0, reviews: 0, courses_count: 0, fees: "", placement: "", ranking: "", image: "", logo: "",
  tags: [], established: 2000, description: "", highlights: [], facilities: [], approvals: [], naac_grade: "",
  top_recruiters: [], is_active: true, status: "Draft", carousel_images: [], brochure_url: "",
  eligibility_criteria: "", admission_process: "", scholarship_details: "", hostel_life: "",
  gallery_images: [], cutoff: "", course_fee_content: "", placement_content: "", rankings_content: "",
  facilities_content: "", meta_title: "", meta_description: "", meta_keywords: "",
  banner_ad_image: "", square_ad_image: "", youtube_video_url: "",
  ...({ approval_logos: [], approval_logo_names: [], priority: 50, apply_cta_mode: "lead", apply_url: "", admission_criteria_points: [], admission_deadline: null, affiliation_kind: "standalone", parent_university_slug: null, is_partner: false } as any),
};

export default function AdminColleges() {
  const { data: colleges, isLoading } = useAllDbColleges();
  const saveCollege = useSaveCollege();
  const deleteCollege = useDeleteCollege();
  const { can, isAdmin } = useAuth();
  const canPublish = isAdmin || can("colleges", "publish") || can("colleges", "edit");
  const [editing, setEditing] = useDraftState<Partial<DbCollege> | null>('admin.colleges.editing.v1', null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Published" | "Draft">("all");
  const [visibleCount, setVisibleCount] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem("admin_page_size_colleges") || "", 10);
    return saved > 0 ? saved : 50;
  });
  const setPageSize = (n: number) => {
    setVisibleCount(n);
    try { localStorage.setItem("admin_page_size_colleges", String(n)); } catch {}
  };

  const stats = useMemo(() => {
    const all = colleges ?? [];
    const published = all.filter((c) => c.status === "Published").length;
    const draft = all.filter((c) => c.status !== "Published").length;
    const inactive = all.filter((c) => !c.is_active).length;
    const cats = all.reduce<Record<string, number>>((m, c) => { m[c.category] = (m[c.category] || 0) + 1; return m; }, {});
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    return { total: all.length, published, draft, inactive, topCat };
  }, [colleges]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (colleges ?? []).filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q)
        || c.slug.toLowerCase().includes(q)
        || (c.city || "").toLowerCase().includes(q)
        || (c.state || "").toLowerCase().includes(q);
    });
  }, [colleges, search, statusFilter]);

  const visible = filtered.slice(0, visibleCount);

  const handleSave = () => {
    if (!editing?.slug || !editing?.name) { toast.error("Slug and Name required"); return; }
    if (editing.status === "Published" && !canPublish) {
      toast.error("You don't have permission to publish. Save as Draft instead.");
      return;
    }
    // Hard clamp priority into 1..100 - out-of-range values are rejected before
    // hitting the DB so a stray "0" or "999" can never break sort order.
    const rawPriority = (editing as any).priority;
    const priorityNum = Number.isFinite(Number(rawPriority)) ? Math.round(Number(rawPriority)) : 50;
    if (priorityNum < 1 || priorityNum > 100) {
      toast.error("Priority must be between 1 and 100");
      return;
    }
    const desiredRank = (editing as any).featured_rank ?? null;
    if (desiredRank != null && (desiredRank < 1 || desiredRank > 4)) {
      toast.error("Featured slot must be 1–4 or empty");
      return;
    }
    const { featured_rank: _omit, ...payload } = editing as any;
    payload.priority = priorityNum;
    saveCollege.mutate(payload, {
      onSuccess: async () => {
        let id = (editing as any).id;
        if (!id && editing.slug) {
          const { data: row } = await supabase.from("colleges").select("id").eq("slug", editing.slug).maybeSingle();
          id = row?.id;
        }
        if (id) {
          const { error } = await (supabase as any).rpc("set_featured_rank", { _table: "colleges", _id: id, _rank: desiredRank });
          if (error) toast.error(`Featured: ${error.message}`);
        }
        setEditing(null);
        // No full reload - useSaveCollege already invalidates every cached
        // colleges query so listings refresh in place without a page refresh.
      },
    });
  };

  const update = (field: string, value: any) => setEditing((prev) => {
    if (!prev) return prev;
    const next: any = { ...prev, [field]: value };
    // Auto-derive slug from name when creating a new college (no id) and slug
    // is either empty or still matches the previously derived slug from the old name.
    if (field === "name" && !(prev as any).id) {
      const prevAutoSlug = slugify(prev.name || "");
      const currentSlug = (prev.slug || "").trim();
      if (!currentSlug || currentSlug === prevAutoSlug) {
        next.slug = slugify(value || "");
      }
    }
    return next;
  });

  return (
    <AdminLayout title="Colleges Manager">
      <div className="mb-3"><AIGenerateDialog entityType="colleges" table="colleges" /></div>
      <AdminStatsBar
        stats={[
          { label: "Total", value: stats.total, icon: GraduationCap, tone: "primary" },
          { label: "Published", value: stats.published, icon: CheckCircle2, tone: "success" },
          { label: "Drafts", value: stats.draft, icon: Layers, tone: "warning" },
          { label: "Inactive", value: stats.inactive, icon: Eye, tone: "muted" },
          { label: "Top Category", value: stats.topCat, icon: Sparkles, tone: "primary" },
        ]}
      />

      <div className="mb-3">
        <CSVTools
          table="colleges"
          filename="colleges.csv"
          columns="*"
          typeHints={{ established: "number", rating: "number", reviews: "number", courses_count: "number", priority: "number", is_active: "boolean", tags: "array", facilities: "array", approvals: "array", top_recruiters: "array", carousel_images: "array", gallery_images: "array", highlights: "array" }}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(50); }} placeholder="Search by name, slug, city or state..." className="pl-10 rounded-xl h-10" />
        </div>
        <Button onClick={() => setEditing({ ...emptyCollege })} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add College
        </Button>
        <BulkEditToggle
          table="colleges"
          searchKeys={["name","slug","city","state"]}
          columns={[
            { key: "name", label: "Name", width: 220 },
            { key: "slug", label: "Slug", width: 180 },
            { key: "city", label: "City", width: 120 },
            { key: "state", label: "State", width: 130 },
            { key: "category", label: "Category", width: 120 },
            { key: "type", label: "Type", type: "select", options: ["Government","Private","Deemed","Autonomous"], width: 110 },
            { key: "priority", label: "Priority", type: "number", width: 90 },
            { key: "rating", label: "Rating", type: "number", width: 80 },
            { key: "status", label: "Status", type: "select", options: ["Draft","Published"], width: 110 },
            { key: "is_active", label: "Active", type: "boolean", width: 80 },
          ]}
        />
      </div>

      <QuickFilterPills
        value={statusFilter}
        onChange={(v) => { setStatusFilter(v); setVisibleCount(50); }}
        options={[
          { label: "All", value: "all", count: stats.total },
          { label: "Published", value: "Published", count: stats.published },
          { label: "Drafts", value: "Draft", count: stats.draft },
        ]}
      />

      <FeaturedRankPanel table="colleges" detailPath={(slug) => `/colleges/${slug}`} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end">
            <AdminPageSizePicker
              value={visibleCount}
              onChange={setPageSize}
              totalLabel={`Showing ${Math.min(visible.length, filtered.length)} of ${filtered.length}`}
            />
          </div>
          {visible.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              {c.image && <img src={c.image} alt={c.name} className="w-12 h-12 rounded-lg object-cover hidden sm:block" loading="lazy" />}
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{c.name}</span>
                  <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                  <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                  <Badge variant={c.status === "Published" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                  {!c.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                  <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">⭐ P {(c as any).priority ?? 50}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.location} • {c.state} • {c.ranking}</p>
              </div>
              <div className="flex gap-1">
                <OpenOnSiteButton href={`/colleges/${c.slug}`} />
                <RowDataIO row={c} base="college" columns="*" />
                <Button variant="ghost" size="icon" onClick={() => setEditing({ ...c })} className="w-8 h-8"><Pencil className="w-3.5 h-3.5" /></Button>
                <PermGate module="colleges" action="delete"><Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteCollege.mutate(c.id); }} className="w-8 h-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></PermGate>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No colleges found</div>}
          {visible.length < filtered.length && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setVisibleCount((n) => n + visibleCount)} className="rounded-xl">
                Load {visibleCount} more ({filtered.length - visible.length} left)
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> {editing?.id ? "Edit" : "Add"} College</span>
              {editing?.slug && <OpenOnSiteButton href={`/colleges/${editing.slug}`} size="sm" variant="outline" label="Open public page" />}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* ── Basic Info ── */}
              <AdminFormSection title="Basic Information" icon={<Info className="w-4 h-4 text-primary" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <select value={editing.status || "Draft"} onChange={(e) => update("status", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {STATUSES.map((s) => (
                        <option key={s} value={s} disabled={s === "Published" && !canPublish}>
                          {s}{s === "Published" && !canPublish ? " (no permission)" : ""}
                        </option>
                      ))}
                    </select>
                    {!canPublish && <p className="text-[10px] text-muted-foreground mt-1">Only managers/admins can publish.</p>}
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Name *</label><Input value={editing.name || ""} onChange={(e) => update("name", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><Input value={editing.slug || ""} onChange={(e) => update("slug", e.target.value)} placeholder="iit-delhi" className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Short Name</label><Input value={editing.short_name || ""} onChange={(e) => update("short_name", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div className="sm:col-span-2"><UploadOrUrlField label="Logo" value={editing.logo || ""} onChange={(v) => update("logo", v)} kind="image" preset="logo" folder="college-logos" /></div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <select value={editing.type || ""} onChange={(e) => update("type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <select value={editing.category || ""} onChange={(e) => update("category", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Rating</label><Input value={editing.rating ?? ""} onChange={(e) => update("rating", parseFloat(e.target.value) || 0)} className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Rating Count</label><Input value={editing.reviews ?? ""} onChange={(e) => update("reviews", parseInt(e.target.value) || 0)} className="rounded-lg h-9 text-sm" /></div>
                  <div className="sm:col-span-2 pt-1 border-t border-border mt-1">
                    <label className="text-xs font-medium text-muted-foreground">University Affiliation</label>
                    <select
                      value={(editing as any).affiliation_kind || "standalone"}
                      onChange={(e) => {
                        const v = e.target.value;
                        update("affiliation_kind" as any, v);
                        if (v !== "affiliated") update("parent_university_slug" as any, null);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9 mt-1"
                    >
                      <option value="standalone">None - standalone college</option>
                      <option value="university">This is a University (other colleges can affiliate to it)</option>
                      <option value="affiliated">Affiliated to a University</option>
                    </select>
                    {(editing as any).affiliation_kind === "affiliated" && (
                      <div className="mt-2">
                        <ParentUniversityPicker
                          value={(editing as any).parent_university_slug || null}
                          onChange={(slug) => update("parent_university_slug" as any, slug)}
                          excludeSlug={editing.slug}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <MultiCategoryPicker value={(editing as any).categories || []} onChange={(v) => update("categories" as any, v)} primary={editing.category} />
                <RichTextEditor label="Description *" value={editing.description || ""} onChange={(v) => update("description", v)} rows={3} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="college-priority-input">Listing Priority (1-100)</label>
                    <Input
                      id="college-priority-input"
                      value={String((editing as any).priority ?? 50)}
                      onChange={(e) => update("priority" as any, e.target.value === "" ? "" : parseInt(e.target.value))}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value);
                        if (!Number.isFinite(n)) update("priority" as any, 50);
                      }}
                      aria-invalid={(() => {
                        const n = Number((editing as any).priority);
                        return !Number.isFinite(n) || n < 1 || n > 100;
                      })()}
                      data-testid="admin-priority-input"
                      className={`rounded-lg h-9 text-sm ${(() => {
                        const n = Number((editing as any).priority);
                        return !Number.isFinite(n) || n < 1 || n > 100 ? "border-destructive focus-visible:ring-destructive" : "";
                      })()}`}
                    />
                    {(() => {
                      const n = Number((editing as any).priority);
                      const invalid = !Number.isFinite(n) || n < 1 || n > 100;
                      return invalid ? (
                        <p className="text-[11px] text-destructive mt-1" data-testid="admin-priority-error">
                          Priority must be a whole number between 1 and 100. Lower number = higher rank (1 is the top).
                        </p>
                      ) : (
                        <p className="text-[10.5px] text-muted-foreground mt-1">Lower number = appears first in listings & filters. Default 50.</p>
                      );
                    })()}
                  </div>
                  <div className="flex flex-col gap-2 mt-5">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => update("is_active", e.target.checked)} className="rounded" />
                      <label className="text-sm text-foreground">Active</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="college-is-partner"
                        checked={!!(editing as any).is_partner}
                        onChange={(e) => update("is_partner" as any, e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="college-is-partner" className="text-sm text-foreground font-medium">
                        🤝 Partner College
                      </label>
                      <span className="text-[10.5px] text-muted-foreground">
                        Promoted in recommendations (eligibility, predictors, "Top for you")
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 max-w-md"><AuthorPicker value={(editing as any).author_id} onChange={(v) => update("author_id" as any, v)} label="Author profile (byline)" /></div>
                <div className="mt-3"><FeaturedRankPicker value={(editing as any).featured_rank} onChange={(v) => update("featured_rank" as any, v)} label="Featured slot in college listings" maxSlots={5} /></div>
              </AdminFormSection>
              <AdminFormSection title="Location" icon={<MapPin className="w-4 h-4 text-primary" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Location</label><Input value={editing.location || ""} onChange={(e) => update("location", e.target.value)} placeholder="Coimbatore, Tamil Nadu" className="rounded-lg h-9 text-sm" /></div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">State</label>
                    <select value={editing.state || ""} onChange={(e) => update("state", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      <option value="">Select</option>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">City</label>
                    <Input
                      list="college-city-options"
                      value={editing.city || ""}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder={editing.state ? `Select or type a city in ${editing.state}` : "Select state first"}
                      className="rounded-lg h-9 text-sm"
                    />
                    <datalist id="college-city-options">
                      {(CITIES_BY_STATE[editing.state || ""] || []).map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  {editing.state === "Delhi NCR" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Secondary State <span className="text-muted-foreground/70">(physical state, e.g. Haryana for Gurgaon, UP for Noida)</span></label>
                        <select value={(editing as any).secondary_state || ""} onChange={(e) => update("secondary_state" as any, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                          <option value="">None</option>
                          {STATES.filter((s) => s !== "Delhi NCR").map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Secondary City</label>
                        <Input
                          list="college-secondary-city-options"
                          value={(editing as any).secondary_city || ""}
                          onChange={(e) => update("secondary_city" as any, e.target.value)}
                          placeholder={(editing as any).secondary_state ? `City in ${(editing as any).secondary_state}` : "Select secondary state first"}
                          className="rounded-lg h-9 text-sm"
                        />
                        <datalist id="college-secondary-city-options">
                          {(CITIES_BY_STATE[(editing as any).secondary_state || ""] || []).map((c) => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                    </>
                  )}
                  <div><label className="text-xs font-medium text-muted-foreground">Established In</label><Input value={editing.established ?? ""} onChange={(e) => update("established", parseInt(e.target.value) || 2000)} className="rounded-lg h-9 text-sm" /></div>
                </div>
              </AdminFormSection>

              {/* ── Approvals & Accreditation ── */}
              <AdminFormSection title="Approvals & Accreditation" icon={<Award className="w-4 h-4 text-primary" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">NAAC Grade</label>
                    <select value={editing.naac_grade || ""} onChange={(e) => update("naac_grade", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {NAAC_GRADES.map((g) => <option key={g} value={g}>{g || "None"}</option>)}
                    </select>
                  </div>
                </div>
                <ApprovalBodyPicker selectedCodes={editing.approvals || []} onCodesChange={(v) => update("approvals", v)} />
                <details className="rounded-lg border border-border bg-muted/20 p-2 mt-2">
                  <summary className="text-xs font-medium cursor-pointer text-muted-foreground">Advanced: add custom logos (only for bodies missing from the library)</summary>
                  <div className="mt-2">
                    <ArrayFieldEditor label="Custom approvals (text only)" values={editing.approvals || []} onChange={(v) => update("approvals", v)} suggestions={APPROVAL_SUGGESTIONS} />
                    <MultiImageUploader
                      label="Custom Logos"
                      value={(editing as any).approval_logos || []}
                      onChange={(v) => update("approval_logos" as any, v)}
                      names={(editing as any).approval_logo_names || []}
                      onNamesChange={(v) => update("approval_logo_names" as any, v)}
                      namePlaceholder="Body name"
                      folder="approval-logos"
                      hint="Use the picker above for AICTE/UGC/NAAC etc. Use this only for bodies you can't find in the library."
                    />
                  </div>
                </details>
              </AdminFormSection>

              {/* ── Images & Media ── */}
              <AdminFormSection title="Images & Media" icon={<Image className="w-4 h-4 text-primary" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UploadOrUrlField label="Featured Image" value={editing.image || ""} onChange={(v) => update("image", v)} kind="image" preset="collegeMain" folder="college-images" />
                  <UploadOrUrlField label="Brochure (PDF)" value={editing.brochure_url || ""} onChange={(v) => update("brochure_url", v)} kind="file" folder="college-brochures" accept="application/pdf" maxSizeMb={15} />
                </div>
                <YouTubeField label="YouTube Video URL" value={editing.youtube_video_url || ""} onChange={(v) => update("youtube_video_url", v)} />
                <ArrayFieldEditor label="Carousel Images" values={editing.carousel_images || []} onChange={(v) => update("carousel_images", v)} placeholder="Paste image URL or use Upload →" imageUpload={{ folder: "college-images" }} />
                <ImageHint preset="carousel" />
                <ArrayFieldEditor label="Gallery Images" values={editing.gallery_images || []} onChange={(v) => update("gallery_images", v)} placeholder="Paste image URL or use Upload →" imageUpload={{ folder: "college-images" }} />
                <ImageHint preset="gallery" />
                <p className="text-[10px] text-muted-foreground">Tip: Use the Upload button to add images directly, or the Library button to pick previously uploaded ones.</p>

              </AdminFormSection>

              {/* ── Courses & Fees ── */}
              <AdminFormSection title="Courses & Fees" icon={<FileText className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Courses Count</label><Input value={editing.courses_count ?? ""} onChange={(e) => update("courses_count", parseInt(e.target.value) || 0)} className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Fees</label><Input value={editing.fees || ""} onChange={(e) => update("fees", e.target.value)} placeholder="₹2.5L/year" className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Ranking</label><Input value={editing.ranking || ""} onChange={(e) => update("ranking", e.target.value)} placeholder="NIRF #1" className="rounded-lg h-9 text-sm" /></div>
                </div>
                <RichTextEditor label="Course & Fee Content" value={editing.course_fee_content || ""} onChange={(v) => update("course_fee_content", v)} />
                <div className="pt-3 border-t border-border">
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" /> Course-with-fee Picker</h4>
                  <CourseFeePicker collegeSlug={editing.slug || ""} />
                </div>
              </AdminFormSection>

              {/* ── Faculty (linked to this college) ── */}
              <AdminFormSection title="Faculty (Professors)" icon={<UserCheck className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <SlugScopedTableEditor
                  table="faculty"
                  scopeColumn="college_slug"
                  scopeValue={editing.slug || ""}
                  titleKey="name"
                  subtitleKey="designation"
                  orderColumn="display_order"
                  defaultValues={{ name: "", designation: "", department: "", qualification: "", photo: "", gender: "male", display_order: 0, is_active: true }}
                  fields={[
                    { key: "name", label: "Name", placeholder: "Dr. Sharma" },
                    { key: "designation", label: "Designation", placeholder: "Professor" },
                    { key: "department", label: "Department" },
                    { key: "qualification", label: "Qualification", placeholder: "PhD" },
                    { key: "gender", label: "Gender (male/female)", type: "select", options: ["male", "female"] },
                    { key: "photo", label: "Photo URL (optional)" },
                    { key: "display_order", label: "Display Order", type: "number" },
                    { key: "is_active", label: "Active", type: "boolean" },
                  ]}
                  csvColumns={["college_slug","name","designation","department","qualification","gender","photo","bio","display_order","is_active"]}
                  csvTypeHints={{ display_order: "number", is_active: "boolean" }}
                  emptyMessage="No professors yet. Faculty appears in an animated carousel on the college page."
                />
              </AdminFormSection>

              {/* ── Contact (single row) ── */}
              <AdminFormSection title="Contact Details" icon={<Phone className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <SlugScopedTableEditor
                  table="college_contacts"
                  scopeColumn="college_slug"
                  scopeValue={editing.slug || ""}
                  titleKey="address"
                  subtitleKey="phone"
                  defaultValues={{ address: "", phone: "", email: "", website: "", map_embed: "" }}
                  fields={[
                    { key: "address", label: "Address", cols: 3 },
                    { key: "phone", label: "Phone" },
                    { key: "email", label: "Email" },
                    { key: "website", label: "Website" },
                    { key: "map_embed", label: "Google Maps embed URL", cols: 3 },
                  ]}
                  csvColumns={["college_slug","address","phone","email","website","map_embed"]}
                  emptyMessage="No contact details. Add one row - it appears at the end of the college page."
                />
              </AdminFormSection>

              {/* ── Placement ── */}
              <AdminFormSection title="Placement" icon={<BarChart className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <div><label className="text-xs font-medium text-muted-foreground">Placement Summary</label><Input value={editing.placement || ""} onChange={(e) => update("placement", e.target.value)} placeholder="₹25 LPA avg" className="rounded-lg h-9 text-sm" /></div>
                <RichTextEditor label="Placement Content" value={editing.placement_content || ""} onChange={(v) => update("placement_content", v)} />
                <ArrayFieldEditor label="Top Recruiters" values={editing.top_recruiters || []} onChange={(v) => update("top_recruiters", v)} suggestions={["Google","Microsoft","Amazon","TCS","Infosys","Wipro","Flipkart","Goldman Sachs","JP Morgan","Deloitte","McKinsey","Accenture"]} />
              </AdminFormSection>

              {/* ── Apply CTA Behaviour ── */}
              <AdminFormSection title="Apply Button Behaviour" icon={<GraduationCap className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <p className="text-[11px] text-muted-foreground -mt-1">Choose what happens when a student clicks the <b>Apply to University</b> button on this college's page.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">CTA Mode</label>
                    <select
                      value={(editing as any).apply_cta_mode || "lead"}
                      onChange={(e) => update("apply_cta_mode" as any, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9"
                    >
                      <option value="lead">Open Lead Form (default)</option>
                      <option value="link">Redirect to External URL</option>
                      <option value="lead_then_link">Lead Form, then Redirect</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">External Apply URL</label>
                    <Input
                      value={(editing as any).apply_url || ""}
                      onChange={(e) => update("apply_url" as any, e.target.value)}
                      placeholder="https://university.edu/apply"
                      className="rounded-lg h-9 text-sm"
                      disabled={!["link", "lead_then_link"].includes((editing as any).apply_cta_mode || "lead")}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium text-muted-foreground">Application Closing Date & Time</label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Drives the "Closing in …" countdown on the college page. Leave blank to use the automatic 14-day fallback.</p>
                  <Input
                    type="datetime-local"
                    value={(() => {
                      const v = (editing as any).admission_deadline;
                      if (!v) return "";
                      const d = new Date(v);
                      if (isNaN(d.getTime())) return "";
                      const pad = (n: number) => String(n).padStart(2, "0");
                      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    })()}
                    onChange={(e) => update("admission_deadline" as any, e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="rounded-lg h-9 text-sm mt-1 max-w-xs"
                  />
                </div>
              </AdminFormSection>

              {/* ── Detailed Content ── */}
              <AdminFormSection title="Detailed Content" icon={<FileText className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <PageSummaryField value={(editing as any).page_summary || ""} onChange={(v) => update("page_summary" as any, v)} />
                <RichTextEditor label="Eligibility Criteria" value={editing.eligibility_criteria || ""} onChange={(v) => update("eligibility_criteria", v)} />
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Admission Criteria - Quick Highlights (up to 5 points)</label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">These appear as eye-catching cards on the college page. Leave blank to use the default 5-step process.</p>
                  <div className="mt-2 space-y-2">
                    {[0,1,2,3,4].map((i) => {
                      const arr: string[] = Array.isArray((editing as any).admission_criteria_points) ? [...(editing as any).admission_criteria_points] : [];
                      return (
                        <Input
                          key={i}
                          value={arr[i] || ""}
                          onChange={(e) => {
                            const next = [...arr];
                            next[i] = e.target.value;
                            update("admission_criteria_points" as any, next.filter((s, idx) => idx <= 4).slice(0, 5));
                          }}
                          placeholder={`Point ${i + 1} - e.g. "12th with 60%+ in PCM"`}
                          className="rounded-lg h-9 text-sm"
                        />
                      );
                    })}
                  </div>
                </div>
                <RichTextEditor label="Admission Process (full description)" value={editing.admission_process || ""} onChange={(v) => update("admission_process", v)} />
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Scholarship Availability (shows as chip on college page)</label>
                  <select
                    value={(editing as any).scholarship_available || "unknown"}
                    onChange={(e) => update("scholarship_available" as any, e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="unknown">Unknown (auto - show only if details filled)</option>
                    <option value="available">Available</option>
                    <option value="not_available">Not Available</option>
                  </select>
                </div>
                <RichTextEditor label="Scholarship Details" value={editing.scholarship_details || ""} onChange={(v) => update("scholarship_details", v)} />
                <RichTextEditor label="Hostel Life" value={editing.hostel_life || ""} onChange={(v) => update("hostel_life", v)} />
                <RichTextEditor label="Cutoff" value={editing.cutoff || ""} onChange={(v) => update("cutoff", v)} />
                <RichTextEditor label="Rankings Content" value={editing.rankings_content || ""} onChange={(v) => update("rankings_content", v)} />
                <RichTextEditor label="Facilities Content" value={editing.facilities_content || ""} onChange={(v) => update("facilities_content", v)} />
              </AdminFormSection>

              {/* ── Linked Courses & Exams ── */}
              <AdminFormSection title="Linked Courses & Exams" icon={<GraduationCap className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <p className="text-[11px] text-muted-foreground -mt-1">Search and link courses and exams offered/accepted by this college. They power related sections on the college page.</p>
                <EntitySlugMultiSearch kind="course" label="Courses offered"
                  value={(editing as any).related_courses || []}
                  onChange={(v) => update("related_courses" as any, v)}
                  placeholder="Search courses by name or slug…" />
                <EntitySlugMultiSearch kind="exam" label="Exams accepted"
                  value={(editing as any).related_exams || []}
                  onChange={(v) => update("related_exams" as any, v)}
                  placeholder="Search exams by name or slug…" />
              </AdminFormSection>

              {/* ── Tags & Arrays ── */}
              <AdminFormSection title="Tags, Facilities & Highlights" icon={<Settings className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <ArrayFieldEditor label="Facilities" values={editing.facilities || []} onChange={(v) => update("facilities", v)} suggestions={FACILITY_SUGGESTIONS} />
                <ArrayFieldEditor label="Tags (search & pick or add custom)" values={editing.tags || []} onChange={(v) => update("tags", v)} placeholder="Search tag or add new…" suggestions={TAG_SUGGESTIONS} />
                <ArrayFieldEditor label="Highlights (search & pick or add custom)" values={editing.highlights || []} onChange={(v) => update("highlights", v)} placeholder="Search highlight or add new…" suggestions={HIGHLIGHT_SUGGESTIONS} />
              </AdminFormSection>

              {/* ── SEO ── */}
              <AdminFormSection title="SEO" icon={<Search className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Meta Title</label><Input value={editing.meta_title || ""} onChange={(e) => update("meta_title", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Meta Keywords</label><Input value={editing.meta_keywords || ""} onChange={(e) => update("meta_keywords", e.target.value)} placeholder="Comma separated" className="rounded-lg h-9 text-sm" /></div>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Meta Description</label>
                  <textarea value={editing.meta_description || ""} onChange={(e) => update("meta_description", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UploadOrUrlField label="Banner Ad Image" value={editing.banner_ad_image || ""} onChange={(v) => update("banner_ad_image", v)} kind="image" preset="bannerAd" folder="college-ads" />
                  <UploadOrUrlField label="Square Ad Image" value={editing.square_ad_image || ""} onChange={(v) => update("square_ad_image", v)} kind="image" preset="squareAd" folder="college-ads" />
                </div>
              </AdminFormSection>

              {/* ── FAQs (per-college) ── */}
              <AdminFormSection title="FAQs (shown on this college page)" icon={<HelpCircle className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <FaqInlineEditor page="colleges" itemSlug={editing.slug || ""} itemName={editing.name || ""} />
              </AdminFormSection>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSave} disabled={saveCollege.isPending} className="rounded-xl">
                  {saveCollege.isPending ? "Saving..." : "Save College"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
