import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

interface Props { articleId?: string; tags?: string[]; }
interface Row { entity_type: string; entity_slug: string; }

const TYPE_META: Record<string, { label: string; emoji: string; table?: string; nameCol?: string; imgCol?: string }> = {
  college:        { label: "Colleges",      emoji: "🏛️", table: "colleges",         nameCol: "name",  imgCol: "image" },
  course:         { label: "Courses",       emoji: "🎓", table: "courses",          nameCol: "name",  imgCol: "image" },
  exam:           { label: "Exams",         emoji: "📝", table: "exams",            nameCol: "name",  imgCol: "image" },
  career:         { label: "Careers",       emoji: "💼", table: "career_profiles",  nameCol: "name",  imgCol: "image" },
  scholarship:    { label: "Scholarships",  emoji: "🎁", table: "scholarships",     nameCol: "title", imgCol: "image" },
  article:        { label: "News",          emoji: "📰", table: "articles",         nameCol: "title", imgCol: "featured_image" },
  study_subject:  { label: "Subjects",      emoji: "📚" },
  study_chapter:  { label: "Chapters",      emoji: "📖" },
};

export function LinksSummary({ articleId, tags = [] }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, { name: string; img?: string }>>({});

  useEffect(() => {
    if (!articleId) { setRows([]); return; }
    (async () => {
      const { data } = await (supabase as any).from("article_links").select("entity_type,entity_slug").eq("article_id", articleId);
      setRows(data || []);
    })();
  }, [articleId]);

  // Resolve thumbnails per type
  useEffect(() => {
    (async () => {
      const next: Record<string, { name: string; img?: string }> = { ...thumbs };
      const byType: Record<string, string[]> = {};
      rows.forEach(r => { (byType[r.entity_type] ||= []).push(r.entity_slug); });

      for (const [t, slugs] of Object.entries(byType)) {
        const missing = slugs.filter(s => !next[`${t}:${s}`]);
        if (!missing.length) continue;

        // Special-case: study_subject / study_chapter store UUIDs, resolve to slug+name
        if (t === "study_subject") {
          const { data } = await (supabase as any)
            .from("study_subjects")
            .select("id, slug, name, class_number, study_boards(slug)")
            .in("id", missing);
          (data || []).forEach((r: any) => {
            const path = `class-${r.class_number}-${r.study_boards?.slug || "board"}-${r.slug}`;
            next[`${t}:${r.id}`] = { name: `${r.name} · ${path}` };
          });
          continue;
        }
        if (t === "study_chapter") {
          const { data } = await (supabase as any)
            .from("study_chapters")
            .select("id, slug, name, study_subjects(slug, class_number, study_boards(slug))")
            .in("id", missing);
          (data || []).forEach((r: any) => {
            const sub = r.study_subjects;
            const path = sub
              ? `class-${sub.class_number}-${sub.study_boards?.slug || "board"}-${sub.slug}/${r.slug}`
              : r.slug;
            next[`${t}:${r.id}`] = { name: `${r.name} · ${path}` };
          });
          continue;
        }

        const meta = TYPE_META[t];
        if (!meta?.table) continue;
        const { data } = await (supabase as any).from(meta.table)
          .select(`slug, ${meta.nameCol}, ${meta.imgCol}`)
          .in("slug", missing).limit(missing.length);
        (data || []).forEach((r: any) => {
          next[`${t}:${r.slug}`] = { name: r[meta.nameCol!], img: r[meta.imgCol!] };
        });
      }
      setThumbs(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const counts: Record<string, number> = {};
  rows.forEach(r => { counts[r.entity_type] = (counts[r.entity_type] || 0) + 1; });
  const studyTagCount = tags.filter(t => /^class-\d+/.test(t)).length;

  const total = rows.length + studyTagCount;
  if (total === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Link2 className="w-3.5 h-3.5 text-primary" />
        Linked: {total} item{total !== 1 ? "s" : ""}
        <div className="flex flex-wrap gap-1 ml-auto">
          {Object.entries(counts).map(([t, n]) => (
            <Badge key={t} variant="secondary" className="text-[10px] gap-1">
              {TYPE_META[t]?.emoji} {TYPE_META[t]?.label || t}: {n}
            </Badge>
          ))}
          {studyTagCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">📘 Study tags: {studyTagCount}</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rows.slice(0, 30).map((r, i) => {
          const info = thumbs[`${r.entity_type}:${r.entity_slug}`];
          return (
            <div key={`${r.entity_type}-${r.entity_slug}-${i}`}
              className="flex items-center gap-1.5 bg-background border border-border rounded-lg pl-1 pr-2 py-0.5"
              title={`${r.entity_type}: ${r.entity_slug}`}>
              {info?.img ? (
                <img src={info.img} alt="" className="w-5 h-5 rounded object-cover" loading="lazy" />
              ) : (
                <span className="w-5 h-5 rounded bg-muted text-[10px] flex items-center justify-center">
                  {TYPE_META[r.entity_type]?.emoji || "•"}
                </span>
              )}
              <span className="text-[10px] text-foreground truncate max-w-[140px]">
                {info?.name || r.entity_slug}
              </span>
            </div>
          );
        })}
        {rows.length > 30 && <Badge variant="outline" className="text-[10px]">+{rows.length - 30} more</Badge>}
      </div>
    </div>
  );
}
