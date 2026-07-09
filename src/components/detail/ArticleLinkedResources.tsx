import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Building2, GraduationCap, FileText, Briefcase, Award, Newspaper, BookOpen } from "lucide-react";

interface Props { articleId?: string; tags?: string[]; }
type Row = { entity_type: string; entity_slug: string; name?: string; img?: string; href?: string };

const META: Record<string, { label: string; icon: any; table?: string; nameCol?: string; imgCol?: string; route: (slug: string) => string }> = {
  college:     { label: "Linked Colleges",     icon: Building2,    table: "colleges",        nameCol: "name",  imgCol: "image",          route: (s) => `/colleges/${s}` },
  course:      { label: "Linked Courses",      icon: GraduationCap, table: "courses",        nameCol: "name",  imgCol: "image",          route: (s) => `/courses/${s}` },
  exam:        { label: "Linked Exams",        icon: FileText,     table: "exams",           nameCol: "name",  imgCol: "image",          route: (s) => `/exams/${s}` },
  career:      { label: "Linked Careers",      icon: Briefcase,    table: "career_profiles", nameCol: "name",  imgCol: "image",          route: (s) => `/careers/${s}` },
  scholarship: { label: "Linked Scholarships", icon: Award,        table: "scholarships",    nameCol: "title", imgCol: "image",          route: (s) => `/scholarships/${s}` },
  article:     { label: "Related News",        icon: Newspaper,    table: "articles",        nameCol: "title", imgCol: "featured_image", route: (s) => `/news/${s}` },
};

// Entity types that represent school study material - rendered as a tag cloud.
const SCHOOL_STUDY_TYPES = new Set(["study_material", "subject", "chapter", "board", "study_subject", "study_chapter"]);
// Entity types that represent college study material.
const COLLEGE_STUDY_TYPES = new Set(["college_program", "college_university", "college_semester", "college_subject"]);

export function ArticleLinkedResources({ articleId, tags = [] }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [studyChips, setStudyChips] = useState<{ label: string; href: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const tagStudyChips = tags
    .filter((t) => /^class-\d+/.test(t))
    .map((t) => ({ label: t, href: `/study-material?tag=${encodeURIComponent(t)}` }));

  useEffect(() => {
    if (!articleId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("article_links").select("entity_type, entity_slug").eq("article_id", articleId);
      if (cancelled) return;
      if (!data?.length) { setRows([]); setStudyChips([]); setLoading(false); return; }

      // Bucket rows
      const byType: Record<string, string[]> = {};
      const studyFreeSlugs: { type: string; slug: string }[] = [];
      const studyUuidSlugs: { type: "study_subject" | "study_chapter"; slug: string }[] = [];
      const collegeFreeSlugs: { type: string; slug: string }[] = [];

      data.forEach((r: any) => {
        if (META[r.entity_type]) { (byType[r.entity_type] ||= []).push(r.entity_slug); return; }
        if (r.entity_type === "study_subject" || r.entity_type === "study_chapter") {
          studyUuidSlugs.push({ type: r.entity_type, slug: r.entity_slug });
        } else if (SCHOOL_STUDY_TYPES.has(r.entity_type)) {
          studyFreeSlugs.push({ type: r.entity_type, slug: r.entity_slug });
        } else if (COLLEGE_STUDY_TYPES.has(r.entity_type)) {
          collegeFreeSlugs.push({ type: r.entity_type, slug: r.entity_slug });
        }
      });

      // Parallel fetch typed entities (colleges/courses/etc)
      const fetched = await Promise.all(
        Object.entries(byType).map(async ([t, slugs]) => {
          const m = META[t];
          const { data: ents } = await (supabase as any).from(m.table!)
            .select(`slug, ${m.nameCol}, ${m.imgCol}`).in("slug", slugs);
          return ((ents || []) as any[]).map((e) => ({
            entity_type: t, entity_slug: e.slug, name: e[m.nameCol!], img: e[m.imgCol!], href: m.route(e.slug),
          }));
        })
      );

      // Resolve study_subject / study_chapter UUIDs to deep links.
      const resolvedStudyUuid: { label: string; href: string }[] = [];
      const subjIds = studyUuidSlugs.filter(s => s.type === "study_subject").map(s => s.slug);
      const chapIds = studyUuidSlugs.filter(s => s.type === "study_chapter").map(s => s.slug);
      if (subjIds.length) {
        const { data: subs } = await (supabase as any)
          .from("study_subjects").select("id, slug, name, class_num, board_slug").in("id", subjIds);
        (subs || []).forEach((s: any) => resolvedStudyUuid.push({
          label: `Class ${s.class_num} ${(s.board_slug || "").toUpperCase()} · ${s.name}`,
          href: `/study-material/class-${s.class_num}/${s.board_slug}/${s.slug}`,
        }));
      }
      if (chapIds.length) {
        const { data: chs } = await (supabase as any)
          .from("study_chapters").select("id, slug, title, subject_id").in("id", chapIds);
        const sids = Array.from(new Set((chs || []).map((c: any) => c.subject_id)));
        const { data: subs2 } = sids.length
          ? await (supabase as any).from("study_subjects").select("id, slug, class_num, board_slug, name").in("id", sids)
          : { data: [] as any[] };
        const subMap = new Map<string, any>((subs2 || []).map((s: any) => [s.id, s]));
        (chs || []).forEach((c: any) => {
          const s: any = subMap.get(c.subject_id); if (!s) return;
          resolvedStudyUuid.push({
            label: `${s.name} · ${c.title}`,
            href: `/study-material/class-${s.class_num}/${s.board_slug}/${s.slug}/${c.slug}`,
          });
        });
      }

      // Free-form study tags → tag-filter on /study-material
      const freeStudyChips = studyFreeSlugs.map(s => ({
        label: s.slug,
        href: `/study-material?tag=${encodeURIComponent(s.slug)}`,
      }));
      const freeCollegeChips = collegeFreeSlugs.map(s => ({
        label: s.slug,
        href: `/college-study-material?tag=${encodeURIComponent(s.slug)}`,
      }));

      // De-dupe by href
      const allStudy = [...resolvedStudyUuid, ...freeStudyChips, ...freeCollegeChips, ...tagStudyChips];
      const seen = new Set<string>();
      const deduped = allStudy.filter(c => (seen.has(c.href) ? false : (seen.add(c.href), true)));

      if (!cancelled) { setRows(fetched.flat()); setStudyChips(deduped); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [articleId]);

  if (loading) {
    return (
      <section className="mt-8 space-y-4 not-prose" aria-label="Loading linked resources">
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2.5 bg-card border border-border rounded-xl p-2.5">
              <div className="w-12 h-12 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-2/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!rows.length && !studyChips.length) {
    return (
      <section className="mt-8 not-prose">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
          <p className="text-xs text-muted-foreground">No linked colleges, courses or exams for this article yet.</p>
        </div>
      </section>
    );
  }

  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.entity_type] ||= []).push(r); return acc;
  }, {});

  return (
    <section className="mt-8 space-y-5 not-prose">
      {Object.entries(grouped).map(([type, list]) => {
        const m = META[type]; const Icon = m.icon;
        return (
          <LinkedGroup key={type} type={type} list={list} label={m.label} Icon={Icon} />
        );
      })}

      {studyChips.length > 0 && <StudyTagCloud chips={studyChips} />}
    </section>
  );
}

function LinkedGroup({ type, list, label, Icon }: { type: string; list: Row[]; label: string; Icon: any }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 4; // 2 rows × 2 cols on mobile, 2 rows × 3 cols on sm+ uses up to 6 - keep 4 to enforce 2 mobile rows
  const visible = expanded ? list : list.slice(0, LIMIT);
  const hidden = list.length - LIMIT;
  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-bold text-foreground mb-3">
        <Icon className="w-4 h-4 text-primary" /> {label}
        <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visible.map((r) => (
          <Link key={`${type}-${r.entity_slug}`} to={r.href!}
            className="group flex gap-2.5 bg-card border border-border rounded-xl p-2.5 hover:border-primary/40 transition">
            {r.img ? (
              <img src={r.img} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary">{r.name || r.entity_slug}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.entity_slug}</p>
            </div>
          </Link>
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[11px] font-semibold text-primary px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 transition"
        >
          {expanded ? "Show less" : `View ${hidden} more`}
        </button>
      )}
    </div>
  );
}

function StudyTagCloud({ chips }: { chips: { label: string; href: string }[] }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED = 4;
  const overflow = chips.length - COLLAPSED;
  const visible = expanded || overflow <= 0 ? chips : chips.slice(0, COLLAPSED);

  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-bold text-foreground mb-3">
        <BookOpen className="w-4 h-4 text-primary" /> Linked Study Material
        <Badge variant="secondary" className="text-[10px]">{chips.length}</Badge>
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((c) => (
          <Link key={c.href} to={c.href}
            className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition">
            {c.label}
          </Link>
        ))}
        {overflow > 0 && (
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition">
            {expanded ? "Show less" : `+${overflow} more`}
          </button>
        )}
      </div>
    </div>
  );
}
