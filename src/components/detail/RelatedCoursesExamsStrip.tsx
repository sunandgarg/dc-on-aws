import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, FileText, ArrowRight } from "lucide-react";

interface Props {
  courseSlugs?: string[];
  examSlugs?: string[];
  collegeName?: string;
}

type Row = { slug: string; name: string; image?: string; sub?: string };

/** Public strip on College detail showing admin-tagged related courses & exams. */
export function RelatedCoursesExamsStrip({ courseSlugs = [], examSlugs = [], collegeName }: Props) {
  const [courses, setCourses] = useState<Row[]>([]);
  const [exams, setExams] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cs = (courseSlugs || []).filter(Boolean);
    const es = (examSlugs || []).filter(Boolean);
    if (!cs.length && !es.length) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [c, e] = await Promise.all([
        cs.length
          ? supabase.from("courses").select("slug, name, image, category").in("slug", cs)
          : Promise.resolve({ data: [] as any[] }),
        es.length
          ? supabase.from("exams").select("slug, name, image, category").in("slug", es)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancelled) return;
      setCourses(((c.data as any[]) || []).map((r) => ({ slug: r.slug, name: r.name, image: r.image, sub: r.category })));
      setExams(((e.data as any[]) || []).map((r) => ({ slug: r.slug, name: r.name, image: r.image, sub: r.category })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [courseSlugs.join(","), examSlugs.join(",")]);

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="h-5 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!courses.length && !exams.length) return null;

  const renderGroup = (title: string, Icon: any, list: Row[], base: string) =>
    list.length === 0 ? null : (
      <div>
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground mb-3">
          <Icon className="w-4 h-4 text-primary" /> {title}
          <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((r) => (
            <Link
              key={r.slug}
              to={`${base}/${r.slug}`}
              className="group flex items-center gap-2.5 bg-card border border-border rounded-xl p-2.5 hover:border-primary/40 hover:shadow-sm transition"
            >
              {r.image ? (
                <img src={r.image} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary">{r.name}</p>
                {r.sub && <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    );

  return (
    <section className="space-y-5 not-prose" aria-label={collegeName ? `Related courses and exams for ${collegeName}` : "Related courses and exams"}>
      {renderGroup("Related Courses", GraduationCap, courses, "/courses")}
      {renderGroup("Related Entrance Exams", FileText, exams, "/exams")}
    </section>
  );
}
