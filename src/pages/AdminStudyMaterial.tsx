import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, BookOpen, GraduationCap, FileText, Layers } from "lucide-react";
import { toast } from "sonner";
import { UploadOrUrlField } from "@/components/UploadOrUrlField";
import { RichTextEditor } from "@/components/RichTextEditor";
import { MultiImageUploader } from "@/components/admin/MultiImageUploader";
import { AuthorPicker } from "@/components/admin/AuthorPicker";
import { AIGenerateDialog } from "@/components/admin/AIGenerateDialog";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function AdminStudyMaterial() {
  return (
    <AdminLayout title="Study Material">
      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="subjects"><BookOpen className="w-3.5 h-3.5 mr-1" /> Class → Board → Subjects</TabsTrigger>
          <TabsTrigger value="chapters"><GraduationCap className="w-3.5 h-3.5 mr-1" /> Chapters</TabsTrigger>
          <TabsTrigger value="resources"><FileText className="w-3.5 h-3.5 mr-1" /> PYQ / Resources</TabsTrigger>
          <TabsTrigger value="boards"><Layers className="w-3.5 h-3.5 mr-1" /> Boards Library</TabsTrigger>
        </TabsList>
        <TabsContent value="boards"><BoardsTab /></TabsContent>
        <TabsContent value="subjects"><SubjectsTab /></TabsContent>
        <TabsContent value="chapters"><ChaptersTab /></TabsContent>
        <TabsContent value="resources"><ResourcesTab /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function BoardsTab() {
  const qc = useQueryClient();
  const { data: boards = [] } = useQuery({
    queryKey: ["admin-boards"],
    queryFn: async () => (await supabase.from("study_boards").select("*").order("display_order")).data ?? [],
  });
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [imageUrl, setImageUrl] = useState("");

  const add = async () => {
    if (!name) return toast.error("Name required");
    const { error } = await supabase.from("study_boards").insert({ name, slug: slugify(name), icon_emoji: emoji, image_url: imageUrl } as any);
    if (error) return toast.error(error.message);
    toast.success("Added"); setName(""); setImageUrl(""); qc.invalidateQueries({ queryKey: ["admin-boards"] });
  };
  const updateImage = async (id: string, url: string) => {
    const { error } = await (supabase as any).from("study_boards").update({ image_url: url }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Logo updated"); qc.invalidateQueries({ queryKey: ["admin-boards"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete board?")) return;
    await supabase.from("study_boards").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-boards"] });
  };

  return (
    <div className="space-y-4">
      <AIGenerateDialog entityType="study_boards" table="study_boards" upsertKey="slug" label="AI Generate Boards" onDone={() => qc.invalidateQueries({ queryKey: ["admin-boards"] })} />
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input className="max-w-[100px]" value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="📚" />
          <Input className="flex-1 min-w-[200px]" value={name} onChange={e => setName(e.target.value)} placeholder="Board name (e.g. CBSE)" />
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add Board</Button>
        </div>
        <UploadOrUrlField label="Board Logo (optional)" value={imageUrl} onChange={setImageUrl} folder="study-boards" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(boards as any[]).map((b: any) => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              {b.image_url
                ? <img src={b.image_url} alt={b.name} className="w-10 h-10 rounded object-contain bg-muted" />
                : <span className="text-2xl">{b.icon_emoji}</span>}
              <div className="flex-1">
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.slug}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => del(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
            <UploadOrUrlField label="Logo URL" value={b.image_url || ""} onChange={(v) => updateImage(b.id, v)} folder="study-boards" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectsTab() {
  const qc = useQueryClient();
  const [classNum, setClassNum] = useState(10);
  const [boardSlug, setBoardSlug] = useState("cbse");
  const { data: boards = [] } = useQuery({ queryKey: ["admin-boards"], queryFn: async () => (await supabase.from("study_boards").select("*").order("display_order")).data ?? [] });
  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects", classNum, boardSlug],
    queryFn: async () => (await supabase.from("study_subjects").select("*").eq("class_num", classNum).eq("board_slug", boardSlug).order("display_order")).data ?? [],
  });
  const [form, setForm] = useState<{ name: string; emoji: string; description: string; author_id: string | null }>({ name: "", emoji: "📖", description: "", author_id: null });

  const add = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("study_subjects").insert({
      class_num: classNum, board_slug: boardSlug, name: form.name, slug: slugify(form.name),
      icon_emoji: form.emoji, description: form.description, author_id: form.author_id,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Added"); setForm({ name: "", emoji: "📖", description: "", author_id: null });
    qc.invalidateQueries({ queryKey: ["admin-subjects"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete subject (and its chapters/resources)?")) return;
    await supabase.from("study_subjects").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-subjects"] });
  };

  return (
    <div className="space-y-4">
      <AIGenerateDialog entityType="study_subjects" table="study_subjects" upsertKey="slug" label="AI Generate Subjects" onDone={() => qc.invalidateQueries({ queryKey: ["admin-subjects"] })} />
      <div className="flex flex-wrap gap-2 items-center bg-card border border-border rounded-2xl p-3">
        <select value={classNum} onChange={e => setClassNum(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-border text-sm">
          {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select value={boardSlug} onChange={e => setBoardSlug(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm">
          {boards.map((b: any) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 grid sm:grid-cols-4 gap-2 items-end">
        <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="Emoji" />
        <Input className="sm:col-span-2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Subject name (e.g. Mathematics)" />
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add</Button>
        <Textarea className="sm:col-span-4" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description (optional)" />
        <div className="sm:col-span-4"><AuthorPicker value={form.author_id} onChange={(v) => setForm(f => ({ ...f, author_id: v }))} label="Author (byline on subject page)" /></div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((s: any) => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">{s.icon_emoji}</span>
            <div className="flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.slug}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChaptersTab() {
  const qc = useQueryClient();
  const [classNum, setClassNum] = useState(10);
  const [boardSlug, setBoardSlug] = useState("cbse");
  const [subjectId, setSubjectId] = useState("");
  const { data: boards = [] } = useQuery({ queryKey: ["admin-boards"], queryFn: async () => (await supabase.from("study_boards").select("*").order("display_order")).data ?? [] });
  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects", classNum, boardSlug],
    queryFn: async () => (await supabase.from("study_subjects").select("*").eq("class_num", classNum).eq("board_slug", boardSlug).order("display_order")).data ?? [],
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["admin-chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () => (await supabase.from("study_chapters").select("*").eq("subject_id", subjectId).order("chapter_number")).data ?? [],
  });
  const [form, setForm] = useState({ name: "", num: 1 });

  const add = async () => {
    if (!subjectId) return toast.error("Pick a subject");
    if (!form.name) return toast.error("Chapter name required");
    const { error } = await supabase.from("study_chapters").insert({
      subject_id: subjectId, name: form.name, slug: slugify(form.name), chapter_number: form.num,
    });
    if (error) return toast.error(error.message);
    toast.success("Added"); setForm({ name: "", num: form.num + 1 });
    qc.invalidateQueries({ queryKey: ["admin-chapters", subjectId] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete chapter?")) return;
    await supabase.from("study_chapters").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-chapters", subjectId] });
  };

  return (
    <div className="space-y-4">
      <AIGenerateDialog entityType="study_chapters" table="study_chapters" upsertKey="slug" label="AI Generate Chapters" onDone={() => qc.invalidateQueries({ queryKey: ["admin-chapters", subjectId] })} />
      <div className="flex flex-wrap gap-2 items-center bg-card border border-border rounded-2xl p-3">
        <select value={classNum} onChange={e => { setClassNum(Number(e.target.value)); setSubjectId(""); }} className="px-3 py-2 rounded-lg border border-border text-sm">
          {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select value={boardSlug} onChange={e => { setBoardSlug(e.target.value); setSubjectId(""); }} className="px-3 py-2 rounded-lg border border-border text-sm">
          {boards.map((b: any) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm flex-1 min-w-[200px]">
          <option value="">Pick a subject…</option>
          {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {subjectId && (
        <>
          <div className="bg-card border border-border rounded-2xl p-4 grid sm:grid-cols-6 gap-2 items-end">
            <Input type="number" value={form.num} onChange={e => setForm(f => ({ ...f, num: Number(e.target.value) }))} placeholder="No." />
            <Input className="sm:col-span-4" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Chapter name" />
            <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
          <div className="space-y-2">
            {chapters.map((c: any) => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">{c.chapter_number}</span>
                <p className="flex-1 font-medium">{c.name}</p>
                <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ResourcesTab() {
  const qc = useQueryClient();
  const [classNum, setClassNum] = useState(10);
  const [boardSlug, setBoardSlug] = useState("cbse");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState(""); // empty = subject-level (combined pack)
  const { data: boards = [] } = useQuery({ queryKey: ["admin-boards"], queryFn: async () => (await supabase.from("study_boards").select("*").order("display_order")).data ?? [] });
  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects", classNum, boardSlug],
    queryFn: async () => (await supabase.from("study_subjects").select("*").eq("class_num", classNum).eq("board_slug", boardSlug).order("display_order")).data ?? [],
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["admin-chapters", subjectId], enabled: !!subjectId,
    queryFn: async () => (await supabase.from("study_chapters").select("*").eq("subject_id", subjectId).order("chapter_number")).data ?? [],
  });
  const { data: resources = [] } = useQuery({
    queryKey: ["admin-resources", subjectId, chapterId],
    enabled: !!subjectId,
    queryFn: async () => {
      let q = supabase.from("study_resources").select("*").eq("subject_id", subjectId);
      if (chapterId) q = q.eq("chapter_id", chapterId);
      else q = q.is("chapter_id", null);
      return (await q.order("year", { ascending: false })).data ?? [];
    },
  });

  const [form, setForm] = useState({ resource_type: "pyq", year: "", title: "", file_url: "", description: "", content_html: "", content_images: [] as string[] });

  const add = async () => {
    if (!subjectId) return toast.error("Pick a subject");
    if (!form.title) return toast.error("Title required");
    if (!form.file_url && !form.content_html && form.content_images.length === 0)
      return toast.error("Add at least a PDF, some text, or an image");
    const { error } = await supabase.from("study_resources").insert({
      subject_id: subjectId,
      chapter_id: chapterId || null,
      resource_type: form.resource_type,
      year: form.year, title: form.title,
      description: form.description,
      file_url: form.file_url || "",
      content_html: form.content_html,
      content_images: form.content_images,
    });
    if (error) return toast.error(error.message);
    toast.success("Added"); setForm({ resource_type: form.resource_type, year: "", title: "", file_url: "", description: "", content_html: "", content_images: [] });
    qc.invalidateQueries({ queryKey: ["admin-resources"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete resource?")) return;
    await supabase.from("study_resources").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-resources"] });
  };

  return (
    <div className="space-y-4">
      <AIGenerateDialog entityType="study_resources" table="study_resources" upsertKey="title" label="AI Generate Resources" onDone={() => qc.invalidateQueries({ queryKey: ["admin-resources"] })} />
      <div className="flex flex-wrap gap-2 items-center bg-card border border-border rounded-2xl p-3">
        <select value={classNum} onChange={e => { setClassNum(Number(e.target.value)); setSubjectId(""); setChapterId(""); }} className="px-3 py-2 rounded-lg border border-border text-sm">
          {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select value={boardSlug} onChange={e => { setBoardSlug(e.target.value); setSubjectId(""); setChapterId(""); }} className="px-3 py-2 rounded-lg border border-border text-sm">
          {boards.map((b: any) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
        <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setChapterId(""); }} className="px-3 py-2 rounded-lg border border-border text-sm flex-1 min-w-[200px]">
          <option value="">Pick a subject…</option>
          {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={chapterId} onChange={e => setChapterId(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-sm flex-1 min-w-[200px]" disabled={!subjectId}>
          <option value="">Subject-level (combined pack)</option>
          {chapters.map((c: any) => <option key={c.id} value={c.id}>Ch {c.chapter_number}: {c.name}</option>)}
        </select>
      </div>

      {subjectId && (
        <>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="grid sm:grid-cols-3 gap-2">
              <select value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))} className="px-3 py-2 rounded-lg border border-border text-sm">
                <option value="pyq">PYQ - Single Year</option>
                <option value="combined_10yr">Combined 10-Year Pack</option>
                <option value="notes">Chapter Notes</option>
                <option value="easy_notes">Easy Hand-written Notes</option>
                <option value="tricks">Special Tricks</option>
                <option value="sample">Sample Paper</option>
                <option value="ncert">NCERT Solutions</option>
              </select>
              <Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="Year (e.g. 2024)" />
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
            </div>
            <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description (optional)" />
            <RichTextEditor
              label="Body content (text - supports **bold**, headings, lists). Optional."
              value={form.content_html}
              onChange={(v) => setForm(f => ({ ...f, content_html: v }))}
              rows={6}
              placeholder="Write the explanation, formulas, examples here..."
            />
            <MultiImageUploader
              label="Inline images (optional - diagrams, screenshots)"
              value={form.content_images}
              onChange={(urls) => setForm(f => ({ ...f, content_images: urls }))}
              folder="study-material"
              bucket="study-material"
              hint="Upload diagrams or paste image URLs. Shown inside the resource."
            />
            <UploadOrUrlField
              label="PDF File (optional - upload or paste URL)"
              value={form.file_url}
              onChange={(v) => setForm(f => ({ ...f, file_url: v }))}
              kind="file"
              folder="study-material"
              accept="application/pdf"
              maxSizeMb={20}
            />
            <p className="text-xs text-muted-foreground">A resource needs at least one of: PDF, body text, or image.</p>
            <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Add Resource</Button>
          </div>

          <div className="space-y-2">
            {resources.map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">{r.resource_type}</span>
                {r.year && <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-semibold">{r.year}</span>}
                <p className="flex-1 font-medium text-sm">{r.title}</p>
                <a href={r.file_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">View</a>
                <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
            {resources.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No resources yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}
