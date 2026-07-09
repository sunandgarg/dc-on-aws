import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Pencil, X, HelpCircle, Sparkles, ArrowUp, ArrowDown } from "lucide-react";
import { currentYear } from "@/lib/currentYear";
import { toast } from "sonner";
import { buildDefaultFaqs, type FaqEntityType } from "@/lib/defaultFaqs";

interface Props {
  page: "colleges" | "courses" | "exams" | "articles";
  itemSlug: string;
  /** Optional name for template generation */
  itemName?: string;
}

interface FaqRow {
  id?: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

const empty: FaqRow = { question: "", answer: "", display_order: 0, is_active: true };

const PAGE_TO_TYPE: Partial<Record<Props["page"], FaqEntityType>> = {
  colleges: "college", courses: "course", exams: "exam",
};

export function FaqInlineEditor({ page, itemSlug, itemName }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<FaqRow | null>(null);
  const [loading, setLoading] = useState(false);
  // Buffer for "new entity, no slug yet" - saved on first reload after slug exists
  const [buffer, setBuffer] = useState<FaqRow[]>([]);

  const reload = async () => {
    if (!itemSlug) { setRows([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("faqs").select("*")
      .eq("page", page).eq("item_slug", itemSlug)
      .order("display_order", { ascending: true });
    if (error) toast.error(error.message);
    else setRows(data || []);
    setLoading(false);

    // Flush buffered FAQs once the slug is available
    if (itemSlug && buffer.length > 0) {
      const payload = buffer.map((b, i) => ({ ...b, display_order: (data?.length || 0) + i, page, item_slug: itemSlug }));
      const { error: insErr } = await supabase.from("faqs").insert(payload);
      if (insErr) toast.error(`FAQ buffer flush failed: ${insErr.message}`);
      else { toast.success(`Saved ${buffer.length} buffered FAQ${buffer.length === 1 ? "" : "s"}`); setBuffer([]); }
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [page, itemSlug]);

  const save = async () => {
    if (!draft) return;
    if (!draft.question.trim() || !draft.answer.trim()) {
      toast.error("Question and Answer are required"); return;
    }
    if (!itemSlug) {
      // Buffer until the parent entity is saved with a slug
      setBuffer((b) => [...b, draft]);
      toast.success("FAQ buffered - will save when entity slug is set");
      setDraft(null); return;
    }
    const payload: any = { ...draft, page, item_slug: itemSlug };
    const { error } = draft.id
      ? await supabase.from("faqs").update(payload).eq("id", draft.id)
      : await supabase.from("faqs").insert(payload);
    if (error) {
      const msg = error.message.includes("row-level security")
        ? "Permission denied. You must be signed in as an admin to edit FAQs."
        : error.message;
      toast.error(msg); return;
    }
    toast.success("FAQ saved");
    setDraft(null);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); reload(); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const a = rows[idx], b = rows[j];
    // Swap display_order persistently
    const ops = await Promise.all([
      supabase.from("faqs").update({ display_order: b.display_order }).eq("id", a.id),
      supabase.from("faqs").update({ display_order: a.display_order }).eq("id", b.id),
    ]);
    const err = ops.find(o => o.error)?.error;
    if (err) toast.error(err.message); else reload();
  };

  const generateDefaults = async () => {
    if (!itemSlug) { toast.error("Save the entity slug first"); return; }
    const type = PAGE_TO_TYPE[page];
    if (!type) { toast.error("Defaults not available for this page"); return; }
    const tpl = buildDefaultFaqs(type, { name: itemName || itemSlug });
    const startOrder = rows.length;
    const payload = tpl.map((f, i) => ({
      page, item_slug: itemSlug,
      question: f.question, answer: f.answer,
      display_order: startOrder + i, is_active: true,
    }));
    const { error } = await supabase.from("faqs").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(`Added ${tpl.length} ${currentYear()} default FAQs`); reload(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          {loading ? "Loading…" : `${rows.length} FAQ${rows.length === 1 ? "" : "s"}`}
          {buffer.length > 0 && <span className="ml-2 text-amber-600">+ {buffer.length} buffered</span>}
        </span>
        <div className="flex gap-2">
          {itemSlug && PAGE_TO_TYPE[page] && (
            <Button type="button" size="sm" variant="outline" onClick={generateDefaults} className="rounded-lg gap-1 h-8 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Auto-add {currentYear()} defaults
            </Button>
          )}
          {!draft && (
            <Button type="button" size="sm" variant="outline" onClick={() => setDraft({ ...empty, display_order: rows.length })} className="rounded-lg gap-1 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </Button>
          )}
        </div>
      </div>

      {!itemSlug && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Tip: you can add FAQs now - they'll be buffered and auto-saved once you save the entity with a slug.
        </p>
      )}

      {draft && (
        <div className="bg-muted/40 rounded-xl border border-border p-3 space-y-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Question</label>
            <Input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="What is the eligibility for…?" className="rounded-lg h-9 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Answer</label>
            <textarea value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Order</label>
              <Input type="number" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: parseInt(e.target.value) || 0 })} className="rounded-lg h-9 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Active</label>
              <select value={draft.is_active ? "true" : "false"} onChange={(e) => setDraft({ ...draft, is_active: e.target.value === "true" })} className="w-full h-9 rounded-lg border border-border bg-card px-2 text-sm">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)} className="h-8 text-xs gap-1"><X className="w-3 h-3" /> Cancel</Button>
            <Button type="button" size="sm" onClick={save} className="h-8 text-xs gap-1"><Save className="w-3 h-3" /> Save</Button>
          </div>
        </div>
      )}

      {rows.length === 0 && buffer.length === 0 && !draft ? (
        <p className="text-xs text-muted-foreground italic">No FAQs yet. The page will show smart {currentYear()} default FAQs until you add custom ones.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={r.id} className={`flex items-start justify-between bg-card rounded-lg border border-border px-3 py-2 ${!r.is_active ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{r.question}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">{r.answer}</div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-3 h-3" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-3 h-3" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDraft({ id: r.id, question: r.question, answer: r.answer, display_order: r.display_order, is_active: r.is_active })}><Pencil className="w-3 h-3" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          {buffer.map((r, i) => (
            <div key={`buf-${i}`} className="flex items-start justify-between bg-amber-50/60 rounded-lg border border-amber-200 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{r.question}</div>
                <div className="text-[11px] text-amber-700">Buffered - will save after entity slug exists</div>
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setBuffer(b => b.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
