import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Link2, X } from "lucide-react";

type EntityKey =
  | "college"
  | "course"
  | "exam"
  | "career"
  | "scholarship"
  | "article"
  | "subject"
  | "college_subject"
  | "board";

const ENTITIES: { key: EntityKey; label: string; table: string; pathPrefix: string; nameCol?: string; extraCols?: string }[] = [
  { key: "college", label: "Colleges", table: "colleges", pathPrefix: "/colleges" },
  { key: "course", label: "Courses", table: "courses", pathPrefix: "/courses" },
  { key: "exam", label: "Exams", table: "exams", pathPrefix: "/exams" },
  { key: "career", label: "Careers", table: "career_profiles", pathPrefix: "/careers" },
  { key: "scholarship", label: "Scholarships", table: "scholarships", pathPrefix: "/scholarships" },
  { key: "article", label: "Articles", table: "articles", pathPrefix: "/articles" },
  { key: "subject", label: "Study subjects", table: "study_subjects", pathPrefix: "/study-material" },
  { key: "college_subject", label: "College subjects", table: "college_subjects", pathPrefix: "/study-material" },
  { key: "board", label: "Boards / Study links", table: "study_board_links", pathPrefix: "" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the picked URL (relative path) so caller can insert it as a link. */
  onPick: (url: string, label: string) => void;
}

/**
 * Universal internal link picker. Lets the admin search across colleges,
 * courses, exams, careers, scholarships, articles, study subjects,
 * college subjects, and study/board links - then returns a clean
 * internal URL ready to drop into the rich-text editor.
 */
export function InternalLinkPicker({ open, onClose, onPick }: Props) {
  const [entity, setEntity] = useState<EntityKey>("college");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<{ id: string; name: string; url: string; sub?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const cfg = ENTITIES.find((e) => e.key === entity)!;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from(cfg.table)
          .select("*")
          .ilike(entity === "board" ? "title" : entity === "college_subject" ? "name" : "name", `%${q}%` as any)
          .limit(40);
        if (cancelled) return;
        const mapped = (data || []).map((r: any) => {
          let name = r.name || r.title || r.full_name || r.slug;
          let url = r.slug ? `${cfg.pathPrefix}/${r.slug}` : "#";
          if (entity === "board") url = r.url || r.link || "#";
          if (entity === "college_subject") {
            // college subjects route: /study-material/<class-or-year>/<subject>
            url = r.slug
              ? `/study-material/${r.semester_num ?? "subject"}/${r.slug}`
              : "#";
          }
          return { id: r.id, name, url, sub: r.category || r.state || r.level || "" };
        });
        setRows(mapped);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entity, q, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Link2 className="w-4 h-4 text-primary" /> Link to something on this site
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ENTITIES.map((e) => (
            <button
              key={e.key}
              type="button"
              onClick={() => setEntity(e.key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${entity === e.key ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"}`}
            >{e.label}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${ENTITIES.find((e) => e.key === entity)?.label.toLowerCase()}…`}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <div className="max-h-80 overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {loading && <div className="p-4 text-xs text-muted-foreground">Searching…</div>}
          {!loading && rows.length === 0 && <div className="p-4 text-xs text-muted-foreground">No results.</div>}
          {!loading && rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onPick(r.url, r.name); onClose(); }}
              className="w-full text-left p-3 hover:bg-muted/40 transition"
            >
              <p className="text-sm font-medium text-foreground line-clamp-1">{r.name}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{r.url}{r.sub ? ` • ${r.sub}` : ""}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
