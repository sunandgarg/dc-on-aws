import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Quote, Link as LinkIcon,
  Image as ImageIcon, Table as TableIcon, Minus, Code2, Maximize2, RemoveFormatting, Strikethrough,
  ChevronDown, Palette, Highlighter, Eye, Pencil, FileText, Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RichText } from "@/components/detail/RichText";
import { InternalLinkPicker } from "@/components/admin/InternalLinkPicker";

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  bare?: boolean;
}

/**
 * TipTap-based WYSIWYG editor. Outputs HTML. Renders bold as bold, headings as headings,
 * tables as tables in real-time. Toolbar mirrors the requested layout.
 */
export function RichTextEditor({ label, value, onChange, rows = 6, placeholder, bare = false }: RichTextEditorProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full my-2" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder || "Start typing…" }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "border-collapse w-full my-2" } }),
      TableRow,
      TableHeader.configure({ HTMLAttributes: { class: "border border-border bg-muted/50 p-2 text-left font-semibold" } }),
      TableCell.configure({ HTMLAttributes: { class: "border border-border p-2" } }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2 min-h-[120px]",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g., loading edit form)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div ref={wrapperRef} className={fullscreen ? "fixed inset-0 z-[100] bg-background p-4 flex flex-col" : ""}>
      {label && !bare && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className={`mt-1 rounded-lg border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 ${fullscreen ? "flex-1 flex flex-col" : ""}`}>
        <Toolbar editor={editor} fullscreen={fullscreen} setFullscreen={setFullscreen} previewMode={previewMode} setPreviewMode={setPreviewMode} />
        <div className={fullscreen ? "flex-1 overflow-y-auto" : ""} style={!fullscreen ? { maxHeight: `${Math.max(rows, 4) * 32 + 60}px`, overflowY: "auto" } : undefined}>
          {previewMode ? (
            <div className="px-4 py-3 bg-background">
              <RichText html={value} />
              {!value?.trim() && <p className="text-xs text-muted-foreground italic">Nothing to preview yet.</p>}
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
    </div>
  );
}

function Toolbar({ editor, fullscreen, setFullscreen, previewMode, setPreviewMode }: { editor: Editor; fullscreen: boolean; setFullscreen: (v: boolean) => void; previewMode: boolean; setPreviewMode: (v: boolean) => void }) {
  const [tableOpen, setTableOpen] = useState(false);
  const [docDialog, setDocDialog] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docImages, setDocImages] = useState<string[]>([]);
  const [docUploading, setDocUploading] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [imgAlt, setImgAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [internalPickerOpen, setInternalPickerOpen] = useState(false);

  const Btn = ({ icon: Icon, title, onClick, active }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  const applyHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }
    const $from = editor.state.doc.resolve(from);
    const blockStart = $from.start();
    const blockEnd = $from.end();
    // Whole block selected (or selection spans multiple blocks) → toggle the block heading
    if ((from <= blockStart && to >= blockEnd) || to > blockEnd) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }
    const esc = (s: string) => s.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
    // Splits the current paragraph: text before stays as <p>, selection becomes <hN>, text after stays as <p>
    editor.chain().focus()
      .deleteRange({ from, to })
      .insertContent(`<h${level}>${esc(text)}</h${level}>`)
      .run();
  };

  const HBtn = ({ level, Icon }: any) => (
    <Btn
      icon={Icon}
      title={`Heading ${level} (works on selected words too)`}
      active={editor.isActive("heading", { level })}
      onClick={() => applyHeading(level)}
    />
  );

  const openLink = () => {
    const previous = editor.getAttributes("link").href || "";
    const { from, to, empty } = editor.state.selection;
    const selectedText = empty ? "" : editor.state.doc.textBetween(from, to, " ");
    setLinkUrl(previous || "https://");
    setLinkText(selectedText);
    setLinkDialog(true);
  };

  const applyLink = () => {
    if (!linkUrl || linkUrl === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else if (linkText && editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${linkUrl}" target="_blank" rel="noopener">${linkText}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setLinkDialog(false);
  };

  const openImage = () => { setImgUrl(""); setImgAlt(""); setImageDialog(true); };
  const applyImage = () => {
    if (!imgUrl) return;
    editor.chain().focus().setImage({ src: imgUrl, alt: imgAlt }).run();
    setImageDialog(false);
  };

  const handleUpload = async (rawFile: File) => {
    if (!rawFile) return;
    setUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { optimizeImageFile } = await import("@/lib/imageOptimizer");
      const file = await optimizeImageFile(rawFile);
      const ext = file.name.split(".").pop() || "webp";
      const path = `editor/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("admin-uploads").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("admin-uploads").getPublicUrl(path);
      setImgUrl(pub.publicUrl);
    } catch (e: any) {
      alert(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const openDoc = () => { setDocTitle(""); setDocImages([]); setDocDialog(true); };
  const handleDocUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setDocUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { optimizeImageFile } = await import("@/lib/imageOptimizer");
      const urls: string[] = [];
      for (const raw of Array.from(files)) {
        const file = await optimizeImageFile(raw);
        const ext = file.name.split(".").pop() || "webp";
        const path = `editor/doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("admin-uploads").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("admin-uploads").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      setDocImages((prev) => [...prev, ...urls]);
    } catch (e: any) {
      alert(e.message || "Upload failed");
    } finally { setDocUploading(false); }
  };
  const applyDoc = () => {
    if (!docImages.length) return;
    const safeTitle = (docTitle || "").replace(/"/g, "&quot;");
    const imgs = docImages.map((u) => `<img src="${u}" alt="Document page" />`).join("");
    editor.chain().focus().insertContent(`<div class="doc-viewer" data-title="${safeTitle}">${imgs}</div><p></p>`).run();
    setDocDialog(false);
  };

  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setTableOpen(false);
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 flex-wrap">
      <Btn icon={Bold} title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn icon={Italic} title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn icon={UnderlineIcon} title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <Btn icon={Strikethrough} title="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <span className="w-px h-4 bg-border mx-1" />
      <HBtn level={1} Icon={Heading1} />
      <HBtn level={2} Icon={Heading2} />
      <HBtn level={3} Icon={Heading3} />
      <HBtn level={4} Icon={Heading4} />
      <HBtn level={5} Icon={Heading5} />
      <HBtn level={6} Icon={Heading6} />
      <span className="w-px h-4 bg-border mx-1" />
      <Btn icon={AlignLeft} title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
      <Btn icon={AlignCenter} title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
      <Btn icon={AlignRight} title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
      <Btn icon={AlignJustify} title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} />
      <span className="w-px h-4 bg-border mx-1" />
      <Btn icon={ListOrdered} title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <Btn icon={List} title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <span className="w-px h-4 bg-border mx-1" />
      <ColorPicker editor={editor} />
      <HighlightPicker editor={editor} />
      <span className="w-px h-4 bg-border mx-1" />
      <Btn icon={RemoveFormatting} title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />
      <Btn icon={Quote} title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <Btn icon={LinkIcon} title="Insert / edit link" active={editor.isActive("link")} onClick={openLink} />
      <Btn icon={ImageIcon} title="Insert image" onClick={openImage} />
      <Btn icon={FileText} title="Insert document viewer (multi-page images)" onClick={openDoc} />
      <span className="w-px h-4 bg-border mx-1" />
      <div className="relative">
        <button type="button" onClick={() => setTableOpen(o => !o)} className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground flex items-center" title="Table">
          <TableIcon className="w-3.5 h-3.5" />
          <ChevronDown className="w-3 h-3" />
        </button>
        {tableOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-2 w-48">
            <button type="button" className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded" onClick={() => insertTable(3, 3)}>Insert 3×3 table</button>
            <button type="button" className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded" onClick={() => insertTable(2, 4)}>Insert 2×4 table</button>
            <button type="button" className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded" onClick={() => insertTable(5, 5)}>Insert 5×5 table</button>
            <div className="border-t border-border my-1" />
            <button type="button" disabled={!editor.can().addRowAfter()} className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded disabled:opacity-40" onClick={() => editor.chain().focus().addRowAfter().run()}>Add row</button>
            <button type="button" disabled={!editor.can().addColumnAfter()} className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded disabled:opacity-40" onClick={() => editor.chain().focus().addColumnAfter().run()}>Add column</button>
            <button type="button" disabled={!editor.can().deleteRow()} className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded disabled:opacity-40" onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</button>
            <button type="button" disabled={!editor.can().deleteColumn()} className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded disabled:opacity-40" onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</button>
            <button type="button" disabled={!editor.can().deleteTable()} className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded disabled:opacity-40 text-destructive" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</button>
          </div>
        )}
      </div>
      <Btn icon={Minus} title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      <Btn icon={Code2} title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
      <Btn icon={previewMode ? Pencil : Eye} title={previewMode ? "Back to editor" : "Preview as it appears on the site"} active={previewMode} onClick={() => setPreviewMode(!previewMode)} />
      <Btn icon={Maximize2} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} active={fullscreen} onClick={() => setFullscreen(!fullscreen)} />

      {/* Link dialog */}
      {linkDialog && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setLinkDialog(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-foreground font-semibold"><LinkIcon className="w-4 h-4 text-primary" /> Insert link</div>
              <button
                type="button"
                onClick={() => setInternalPickerOpen(true)}
                className="text-xs px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/5"
                title="Pick a college, course, exam, career, subject, board…"
              >🔍 Link from site</button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">URL</label>
              <input autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com or /colleges/iit-delhi" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            {editor.state.selection.empty && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Display text</label>
                <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Click here" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setLinkDialog(false)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted">Cancel</button>
              <button type="button" onClick={applyLink} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm">Insert</button>
            </div>
          </div>
        </div>
      )}

      <InternalLinkPicker
        open={internalPickerOpen}
        onClose={() => setInternalPickerOpen(false)}
        onPick={(url, label) => {
          setLinkUrl(url);
          if (!linkText) setLinkText(label);
        }}
      />

      {/* Image dialog with upload + URL */}
      {imageDialog && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setImageDialog(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-foreground font-semibold"><ImageIcon className="w-4 h-4 text-primary" /> Insert image</div>
            <label className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition">
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{uploading ? "Uploading…" : "Click to upload from device"}</p>
            </label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Image URL</label>
              <input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="https://…/image.jpg" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Alt text</label>
              <input value={imgAlt} onChange={e => setImgAlt(e.target.value)} placeholder="Description for SEO" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            {imgUrl && <img src={imgUrl} alt="" className="max-h-40 rounded-lg border border-border mx-auto" />}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setImageDialog(false)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted">Cancel</button>
              <button type="button" onClick={applyImage} disabled={!imgUrl} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-40">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Document viewer dialog */}
      {docDialog && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setDocDialog(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-foreground font-semibold"><FileText className="w-4 h-4 text-primary" /> Insert document viewer</div>
            <p className="text-xs text-muted-foreground">Upload pages of a PDF, question paper or notes as images. They'll appear as a paginated viewer in the article.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title (optional)</label>
              <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="e.g. CUET 2026 Biology Question Paper PDF" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <label className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition">
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleDocUpload(e.target.files)} />
              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{docUploading ? "Uploading…" : "Click to upload one or more pages (JPG/PNG)"}</p>
            </label>
            {docImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {docImages.map((u, i) => (
                  <div key={i} className="relative group border border-border rounded-lg overflow-hidden bg-muted">
                    <img src={u} alt={`Page ${i + 1}`} className="w-full h-24 object-cover" />
                    <span className="absolute top-1 left-1 bg-foreground/80 text-background text-[10px] px-1.5 py-0.5 rounded">{i + 1}</span>
                    <button type="button" onClick={() => setDocImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setDocDialog(false)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted">Cancel</button>
              <button type="button" onClick={applyDoc} disabled={!docImages.length} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-40">Insert ({docImages.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TEXT_COLORS = ["#000000", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa"];

function ColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} title="Text color" className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground flex items-center">
        <Palette className="w-3.5 h-3.5" /><ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 w-32">
          {TEXT_COLORS.map(c => (
            <button key={c} type="button" onClick={() => { editor.chain().focus().setColor(c).run(); setOpen(false); }} className="w-6 h-6 rounded border border-border" style={{ backgroundColor: c }} title={c} />
          ))}
          <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); setOpen(false); }} className="col-span-4 text-[10px] px-2 py-1 hover:bg-muted rounded">Clear</button>
        </div>
      )}
    </div>
  );
}

function HighlightPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} title="Highlight" className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground flex items-center">
        <Highlighter className="w-3.5 h-3.5" /><ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-2 grid grid-cols-3 gap-1 w-28">
          {HIGHLIGHT_COLORS.map(c => (
            <button key={c} type="button" onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setOpen(false); }} className="w-6 h-6 rounded border border-border" style={{ backgroundColor: c }} title={c} />
          ))}
          <button type="button" onClick={() => { editor.chain().focus().unsetHighlight().run(); setOpen(false); }} className="col-span-3 text-[10px] px-2 py-1 hover:bg-muted rounded">Clear</button>
        </div>
      )}
    </div>
  );
}
