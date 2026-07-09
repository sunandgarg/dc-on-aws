import { PermGate } from "@/components/PermGate";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { CSVTools } from "@/components/CSVTools";
import { RowDataIO } from "@/components/admin/RowDataIO";
import { useAllDbCourses, useSaveCourse, useDeleteCourse, type DbCourse } from "@/hooks/useCoursesData";
import { AdminFormSection } from "@/components/AdminFormSection";
import { RichTextEditor } from "@/components/RichTextEditor";
import { PageSummaryField } from "@/components/admin/PageSummaryField";
import { ArrayFieldEditor } from "@/components/ArrayFieldEditor";
import { EntitySlugMultiSearch } from "@/components/admin/EntitySlugMultiSearch";
import { SchoolClassMultiSelect } from "@/components/admin/SchoolClassMultiSelect";
import { CollegeSubjectMultiSearch } from "@/components/admin/CollegeSubjectMultiSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, BookOpen, Info, DollarSign, FileText, Settings, CheckCircle2, Layers, Eye, Sparkles, Briefcase, HelpCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ImageHint } from "@/components/ImageHint";
import { UploadOrUrlField, YouTubeField } from "@/components/UploadOrUrlField";
import { AdminStatsBar, QuickFilterPills } from "@/components/AdminStats";
import { SPECIALIZATIONS_BY_STREAM } from "@/lib/taxonomies";
import { CareerCourseLinker } from "@/components/admin/CareerCourseLinker";
import { FaqInlineEditor } from "@/components/admin/FaqInlineEditor";
import { MultiCategoryPicker } from "@/components/admin/MultiCategoryPicker";
import { AuthorPicker } from "@/components/admin/AuthorPicker";
import { BulkEditToggle } from "@/components/admin/BulkEditToggle";
import { useAuth } from "@/hooks/useAuth";
import { AdminPageSizePicker } from "@/components/admin/AdminPageSizePicker";
import { useDraftState } from "@/hooks/useDraftState";

const CATEGORIES = ["Engineering", "Medical", "Management", "Law", "Design", "Science", "Commerce", "Arts", "Pharmacy"];
const LEVELS = ["Undergraduate", "Postgraduate", "Diploma", "Doctoral"];
const MODES = ["Full-Time", "Part-Time", "Distance", "Online"];
const STATUSES = ["Draft", "Published"];
const DOMAINS = ["Engineering & Technology", "Medical & Health", "Business & Management", "Law & Legal", "Design & Architecture", "Science & Research", "Arts & Humanities", "Commerce & Finance", "Pharmacy", "Agriculture"];
const DURATION_TYPES = ["Years", "Months", "Semesters"];
const STUDY_TYPES = ["Regular", "Part-Time", "Distance", "Online", "Hybrid"];
const FEE_TYPES = ["Per Year", "Per Semester", "Total Course", "Per Month"];

const emptyCourse: Partial<DbCourse> = {
  slug: "", name: "", full_name: "", category: "Engineering", duration: "", level: "Undergraduate",
  colleges_count: 0, avg_fees: "", avg_salary: "", growth: "", description: "", eligibility: "",
  top_exams: [], careers: [], subjects: [], image: "", mode: "Full-Time", specializations: [], is_active: true, ...({ priority: 50 } as any),
  status: "Draft", short_description: "", domain: "", duration_type: "", study_type: "", rating: 0,
  fee_type: "", fee: 0, low_fee: 0, high_fee: 0, syllabus_pdf_url: "",
  about_content: "", scope_content: "", subjects_content: "", placements_content: "",
  admission_process: "", fees_content: "", cutoff_content: "", specialization_content: "",
  recruiters_content: "", syllabus_content: "", meta_title: "", meta_description: "", meta_keywords: "",
  youtube_video_url: "",
};

export default function AdminCourses() {
  const { data: courses, isLoading } = useAllDbCourses();
  const saveCourse = useSaveCourse();
  const deleteCourse = useDeleteCourse();
  const { can, isAdmin } = useAuth();
  const canPublish = isAdmin || can("courses", "publish") || can("courses", "edit");
  const [editing, setEditing] = useDraftState<Partial<DbCourse> | null>('admin.courses.editing.v1', null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Published" | "Draft">("all");
  const [visibleCount, setVisibleCount] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem("admin_page_size_courses") || "", 10);
    return saved > 0 ? saved : 50;
  });
  const setPageSize = (n: number) => {
    setVisibleCount(n);
    try { localStorage.setItem("admin_page_size_courses", String(n)); } catch {}
  };

  const stats = useMemo(() => {
    const all = courses ?? [];
    const published = all.filter((c) => c.status === "Published").length;
    const draft = all.filter((c) => c.status !== "Published").length;
    const inactive = all.filter((c) => !c.is_active).length;
    const cats = all.reduce<Record<string, number>>((m, c) => { m[c.category] = (m[c.category] || 0) + 1; return m; }, {});
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    return { total: all.length, published, draft, inactive, topCat };
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (courses ?? []).filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q)
        || c.slug.toLowerCase().includes(q)
        || (c.full_name || "").toLowerCase().includes(q);
    });
  }, [courses, search, statusFilter]);

  const visible = filtered.slice(0, visibleCount);

  const handleSave = () => {
    if (!editing?.slug || !editing?.name) { toast.error("Slug and Name required"); return; }
    if (editing.status === "Published" && !canPublish) {
      toast.error("You don't have permission to publish. Save as Draft instead.");
      return;
    }
    saveCourse.mutate(editing as any, { onSuccess: () => setEditing(null) });
  };

  const update = (field: string, value: any) => setEditing((prev) => prev ? { ...prev, [field]: value } : prev);

  return (
    <AdminLayout title="Courses Manager">
      <div className="mb-3"><AIGenerateDialog entityType="courses" table="courses" /></div>
      <AdminStatsBar
        stats={[
          { label: "Total", value: stats.total, icon: BookOpen, tone: "primary" },
          { label: "Published", value: stats.published, icon: CheckCircle2, tone: "success" },
          { label: "Drafts", value: stats.draft, icon: Layers, tone: "warning" },
          { label: "Inactive", value: stats.inactive, icon: Eye, tone: "muted" },
          { label: "Top Category", value: stats.topCat, icon: Sparkles, tone: "primary" },
        ]}
      />

      <div className="mb-3">
        <CSVTools
          table="courses"
          filename="courses.csv"
          columns="*"
          typeHints={{ fee: "number", low_fee: "number", high_fee: "number", colleges_count: "number", rating: "number", priority: "number", is_active: "boolean", top_exams: "array", careers: "array", subjects: "array", specializations: "array" }}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(50); }} placeholder="Search courses by name, slug or full name..." className="pl-10 rounded-xl h-10" />
        </div>
        <Button onClick={() => setEditing({ ...emptyCourse })} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Course
        </Button>
        <BulkEditToggle
          table="courses"
          searchKeys={["name","slug","full_name","category"]}
          columns={[
            { key: "name", label: "Name", width: 220 },
            { key: "slug", label: "Slug", width: 180 },
            { key: "category", label: "Category", width: 120 },
            { key: "level", label: "Level", width: 120 },
            { key: "duration", label: "Duration", width: 100 },
            { key: "priority", label: "Priority", type: "number", width: 90 },
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{c.name}</span>
                  <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                  <Badge variant="outline" className="text-[10px]">{c.level}</Badge>
                  <Badge variant={c.status === "Published" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">⭐ P {(c as any).priority ?? 50}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.full_name} • {c.duration} • {c.mode}</p>
              </div>
              <div className="flex gap-1">
                <a href={`/courses/${c.slug}`} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" className="w-8 h-8" title="Open public page"><ExternalLink className="w-3.5 h-3.5" /></Button></a>
                <RowDataIO row={c} base="course" columns="*" />
                <Button variant="ghost" size="icon" onClick={() => setEditing({ ...c })} className="w-8 h-8"><Pencil className="w-3.5 h-3.5" /></Button>
                <PermGate module="courses" action="delete"><Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteCourse.mutate(c.id); }} className="w-8 h-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></PermGate>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No courses found</div>}
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
            <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> {editing?.id ? "Edit" : "Add"} Course</DialogTitle>
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
                  <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><Input value={editing.slug || ""} onChange={(e) => update("slug", e.target.value)} placeholder="btech-computer-science" className="rounded-lg h-9 text-sm" /></div>
                  <div className="sm:col-span-2 lg:col-span-3"><label className="text-xs font-medium text-muted-foreground">Full Name</label><Input value={editing.full_name || ""} onChange={(e) => update("full_name", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div className="sm:col-span-2 lg:col-span-3"><label className="text-xs font-medium text-muted-foreground">Short Description</label><Input value={editing.short_description || ""} onChange={(e) => update("short_description", e.target.value)} className="rounded-lg h-9 text-sm" /></div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Domain</label>
                    <select value={editing.domain || ""} onChange={(e) => update("domain", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      <option value="">Select</option>
                      {DOMAINS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <select value={editing.category || ""} onChange={(e) => update("category", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Level</label>
                    <select value={editing.level || ""} onChange={(e) => update("level", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {LEVELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Duration</label><Input value={editing.duration || ""} onChange={(e) => update("duration", e.target.value)} placeholder="4" className="rounded-lg h-9 text-sm" /></div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Duration Type</label>
                    <select value={editing.duration_type || ""} onChange={(e) => update("duration_type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      <option value="">Select</option>
                      {DURATION_TYPES.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Study Type</label>
                    <select value={editing.study_type || ""} onChange={(e) => update("study_type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      <option value="">Select</option>
                      {STUDY_TYPES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Mode</label>
                    <select value={editing.mode || ""} onChange={(e) => update("mode", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      {MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Rating</label><Input type="number" step="0.1" min="0" max="5" value={editing.rating ?? 0} onChange={(e) => update("rating", parseFloat(e.target.value) || 0)} className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Colleges Count</label><Input type="number" value={editing.colleges_count ?? 0} onChange={(e) => update("colleges_count", parseInt(e.target.value) || 0)} className="rounded-lg h-9 text-sm" /></div>
                  <div className="sm:col-span-2 lg:col-span-3"><UploadOrUrlField label="Course Image" value={editing.image || ""} onChange={(v) => update("image", v)} kind="image" preset="courseMain" folder="course-images" /></div>
                  <div className="sm:col-span-2 lg:col-span-3"><YouTubeField label="YouTube Video URL" value={editing.youtube_video_url || ""} onChange={(v) => update("youtube_video_url", v)} /></div>
                </div>
                <MultiCategoryPicker value={(editing as any).categories || []} onChange={(v) => update("categories" as any, v)} primary={editing.category} />
                <div><label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea value={editing.description || ""} onChange={(e) => update("description", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-none" />
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Eligibility</label>
                  <textarea value={editing.eligibility || ""} onChange={(e) => update("eligibility", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Listing Priority (1-100)</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={(editing as any).priority ?? 50}
                      onChange={(e) => update("priority" as any, Math.max(1, Math.min(100, parseInt(e.target.value) || 50)))}
                      className="rounded-lg h-9 text-sm"
                    />
                    <p className="text-[10.5px] text-muted-foreground mt-1">Higher = appears first in listings & filters. Default 50.</p>
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => update("is_active", e.target.checked)} className="rounded" />
                    <label className="text-sm text-foreground">Active</label>
                  </div>
                </div>
                <div className="mt-3 max-w-md"><AuthorPicker value={(editing as any).author_id} onChange={(v) => update("author_id" as any, v)} label="Author profile (byline)" /></div>
              </AdminFormSection>
              <AdminFormSection title="Fee Structure" icon={<DollarSign className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Fee Type</label>
                    <select value={editing.fee_type || ""} onChange={(e) => update("fee_type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm h-9">
                      <option value="">Select</option>
                      {FEE_TYPES.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Fee (₹)</label><Input type="number" value={editing.fee ?? 0} onChange={(e) => update("fee", parseFloat(e.target.value) || 0)} placeholder="Average fee" className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Low Fee (₹)</label><Input type="number" value={editing.low_fee ?? 0} onChange={(e) => update("low_fee", parseFloat(e.target.value) || 0)} placeholder="Lowest fee" className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">High Fee (₹)</label><Input type="number" value={editing.high_fee ?? 0} onChange={(e) => update("high_fee", parseFloat(e.target.value) || 0)} placeholder="Highest fee" className="rounded-lg h-9 text-sm" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Avg Fees (Display)</label><Input value={editing.avg_fees || ""} onChange={(e) => update("avg_fees", e.target.value)} placeholder="₹1.5L - ₹5L/year" className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Avg Salary</label><Input value={editing.avg_salary || ""} onChange={(e) => update("avg_salary", e.target.value)} placeholder="₹12 LPA" className="rounded-lg h-9 text-sm" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Growth</label><Input value={editing.growth || ""} onChange={(e) => update("growth", e.target.value)} placeholder="+25%" className="rounded-lg h-9 text-sm" /></div>
                  <UploadOrUrlField label="Syllabus PDF" value={editing.syllabus_pdf_url || ""} onChange={(v) => update("syllabus_pdf_url", v)} kind="file" folder="course-syllabi" accept="application/pdf" maxSizeMb={15} />
                </div>
                <RichTextEditor label="Fees Content" value={editing.fees_content || ""} onChange={(v) => update("fees_content", v)} />
              </AdminFormSection>

              {/* ── Detailed Content ── */}
              <AdminFormSection title="Detailed Content" icon={<FileText className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <PageSummaryField value={(editing as any).page_summary || ""} onChange={(v) => update("page_summary" as any, v)} />
                <RichTextEditor label="About" value={editing.about_content || ""} onChange={(v) => update("about_content", v)} />
                <RichTextEditor label="Scope" value={editing.scope_content || ""} onChange={(v) => update("scope_content", v)} />
                <RichTextEditor label="Subjects" value={editing.subjects_content || ""} onChange={(v) => update("subjects_content", v)} />
                <RichTextEditor label="Placements" value={editing.placements_content || ""} onChange={(v) => update("placements_content", v)} />
                <RichTextEditor label="Admission Process" value={editing.admission_process || ""} onChange={(v) => update("admission_process", v)} />
                <RichTextEditor label="Cut Off" value={editing.cutoff_content || ""} onChange={(v) => update("cutoff_content", v)} />
                <RichTextEditor label="Specialization" value={editing.specialization_content || ""} onChange={(v) => update("specialization_content", v)} />
                <RichTextEditor label="Course Recruiters" value={editing.recruiters_content || ""} onChange={(v) => update("recruiters_content", v)} />
                <RichTextEditor label="Syllabus" value={editing.syllabus_content || ""} onChange={(v) => update("syllabus_content", v)} />
              </AdminFormSection>

              {/* ── Tags & Arrays ── */}
              <AdminFormSection title="Exams, Careers & Subjects" icon={<Settings className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <EntitySlugMultiSearch kind="exam" label="Top Exams (search & link from your exams DB)"
                  value={editing.top_exams || []} onChange={(v) => update("top_exams", v)}
                  placeholder="Search exams by name or slug…" />
                <EntitySlugMultiSearch kind="career" label="Career profiles (search & link)"
                  value={editing.careers || []} onChange={(v) => update("careers", v)}
                  placeholder="Search careers by name or slug…" />
                <ArrayFieldEditor label="Subjects (free-text)" values={editing.subjects || []} onChange={(v) => update("subjects", v)} />
                <SchoolClassMultiSelect
                  label="Linked School Classes (relevant grade levels)"
                  value={(editing as any).linked_school_classes || []}
                  onChange={(v) => update("linked_school_classes" as any, v)}
                />
                <CollegeSubjectMultiSearch
                  label="Linked College Subjects (semester-wise)"
                  value={(editing as any).linked_college_subjects || []}
                  onChange={(v) => update("linked_college_subjects" as any, v)}
                />
                <ArrayFieldEditor label={`Specializations${editing.category ? ` (suggestions for ${editing.category})` : ""}`} values={editing.specializations || []} onChange={(v) => update("specializations", v)} suggestions={SPECIALIZATIONS_BY_STREAM[editing.category || ""] || []} />
                <div className="pt-3 border-t border-border">
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-primary" /> Linked Career Profiles</h4>
                  <CareerCourseLinker courseSlug={editing.slug || ""} />
                </div>
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
              </AdminFormSection>

              <AdminFormSection title="FAQs (shown on this course page)" icon={<HelpCircle className="w-4 h-4 text-primary" />} defaultOpen={false}>
                <FaqInlineEditor page="courses" itemSlug={editing.slug || ""} itemName={editing.name || ""} />
              </AdminFormSection>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSave} disabled={saveCourse.isPending} className="rounded-xl">
                  {saveCourse.isPending ? "Saving..." : "Save Course"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
