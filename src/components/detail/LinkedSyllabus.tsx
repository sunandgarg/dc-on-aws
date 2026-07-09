import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";

interface Props {
  classes?: number[];
  subjectIds?: string[];
  title?: string;
}

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  semester_num: number;
  slug: string;
  program_slug: string;
  university_slug: string;
}

/** Public render: clickable cards for linked school classes + college subjects. */
export function LinkedSyllabus({ classes = [], subjectIds = [], title }: Props) {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  useEffect(() => {
    if (!subjectIds.length) { setSubjects([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("college_subjects")
        .select("id, name, code, semester_num, slug, program_slug, university_slug")
        .in("id", subjectIds);
      setSubjects((data as SubjectRow[]) || []);
    })();
  }, [subjectIds.join(",")]);

  if (!classes.length && !subjectIds.length) return null;

  return (
    <div className="space-y-5">
      {classes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2.5">
            <GraduationCap className="w-4 h-4 text-primary" />
            School Syllabus
            <span className="text-[10px] font-normal text-muted-foreground">Tap a class to open its study material</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {classes.map((n) => (
              <Link
                key={n}
                to={`/study-material/class-${n}`}
                className="group flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 px-3 py-2.5 transition shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-primary">Class {n}</div>
                  <div className="text-[10px] text-muted-foreground">Study material</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
          </div>
        </div>
      )}
      {subjects.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2.5">
            <BookOpen className="w-4 h-4 text-primary" />
            College Subjects
            <span className="text-[10px] font-normal text-muted-foreground">Notes, PYQs &amp; more</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {subjects.map((s) => (
              <Link
                key={s.id}
                to={`/college-study-material/${s.program_slug}/${s.university_slug}/sem-${s.semester_num}/${s.slug}`}
                className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/40 px-3 py-2.5 transition shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {s.name}{s.code ? ` (${s.code})` : ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Sem {s.semester_num} · {s.program_slug.toUpperCase()}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
