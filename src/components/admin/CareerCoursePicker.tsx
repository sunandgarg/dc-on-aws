import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  careerSlug: string;
}

interface Course { slug: string; name: string; category?: string }
interface Link { id: string; course_slug: string }

/**
 * Reverse picker for tagging a career to courses with live search.
 * Linked rows live in `career_course_links`. Toggling here is bidirectional -
 * the same row also surfaces the career on the linked course's page.
 */
export function CareerCoursePicker({ careerSlug }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("slug, name, category").order("name").limit(2000);
      setCourses((data as Course[]) || []);
    })();
  }, []);

  const reload = async () => {
    if (!careerSlug) return;
    const { data } = await (supabase as any).from("career_course_links").select("*").eq("career_slug", careerSlug);
    setLinks(data || []);
  };
  useEffect(() => { reload(); }, [careerSlug]);

  if (!careerSlug) return <p className="text-xs text-muted-foreground">Save the career first to link courses.</p>;

  const linkedSet = useMemo(() => new Set(links.map((l) => l.course_slug)), [links]);

  const toggle = async (slug: string) => {
    const existing = links.find((l) => l.course_slug === slug);
    if (existing) {
      await (supabase as any).from("career_course_links").delete().eq("id", existing.id);
    } else {
      const { error } = await (supabase as any)
        .from("career_course_links")
        .insert({ career_slug: careerSlug, course_slug: slug });
      if (error) return toast.error(error.message);
    }
    reload();
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return courses.filter((c) => !s || c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s) || (c.category || "").toLowerCase().includes(s)).slice(0, 200);
  }, [courses, q]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Linked Courses ({links.length}) - appears on each course's "Related Careers" section
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses..." className="pl-9 h-9 text-sm rounded-lg" />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border divide-y bg-card">
        {filtered.map((c) => {
          const on = linkedSet.has(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggle(c.slug)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted ${on ? "bg-primary/5" : ""}`}
            >
              <span className="truncate">
                <span className="font-medium text-foreground">{c.name}</span>
                {c.category && <span className="text-muted-foreground ml-1.5">· {c.category}</span>}
              </span>
              {on ? <Badge variant="default" className="h-5 text-[10px]">Linked</Badge> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">No matches</p>}
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((l) => (
            <Badge key={l.id} variant="outline" className="gap-1">
              {l.course_slug}
              <button onClick={() => toggle(l.course_slug)}><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
