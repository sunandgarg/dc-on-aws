import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  courseSlug: string;
}

interface CareerLite { slug: string; name: string; domain: string; icon_emoji: string; }

/** Career ↔ Course linker - used inside the Course editor. */
export function CareerCourseLinker({ courseSlug }: Props) {
  const [linked, setLinked] = useState<{ id: string; career_slug: string }[]>([]);
  const [careers, setCareers] = useState<CareerLite[]>([]);
  const [search, setSearch] = useState("");

  const reload = async () => {
    if (!courseSlug) return;
    const { data } = await (supabase as any).from("career_course_links").select("id,career_slug").eq("course_slug", courseSlug);
    setLinked(data || []);
  };

  useEffect(() => { reload(); }, [courseSlug]);
  useEffect(() => {
    (supabase as any).from("career_profiles").select("slug,name,domain,icon_emoji").eq("is_active", true).order("name").then(({ data }: any) => setCareers(data || []));
  }, []);

  const linkedSlugs = useMemo(() => new Set(linked.map(l => l.career_slug)), [linked]);
  const matches = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return careers.filter(c => !linkedSlugs.has(c.slug)).filter(c => c.name.toLowerCase().includes(q) || c.slug.includes(q)).slice(0, 8);
  }, [careers, search, linkedSlugs]);

  const add = async (career: CareerLite) => {
    setSearch("");
    const { error } = await (supabase as any).from("career_course_links").insert({ course_slug: courseSlug, career_slug: career.slug });
    if (error) toast.error(error.message); else { toast.success("Linked"); reload(); }
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("career_course_links").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Unlinked"); reload(); }
  };

  if (!courseSlug) return <p className="text-xs text-muted-foreground italic">Save the course slug first to link careers.</p>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search career profiles to link…" className="pl-10 rounded-lg h-9 text-sm" />
        {matches.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matches.map(c => (
              <button type="button" key={c.slug} onClick={() => add(c)} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center">
                <span><span className="mr-1">{c.icon_emoji}</span>{c.name}</span>
                <span className="text-[10px] text-muted-foreground">{c.domain}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{linked.length} career{linked.length === 1 ? "" : "s"} linked. These appear as animated cards on the course page.</p>
      {linked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {linked.map(l => {
            const c = careers.find(x => x.slug === l.career_slug);
            return (
              <span key={l.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs rounded-full pl-2 pr-1 py-1">
                {c?.icon_emoji || "💼"} {c?.name || l.career_slug}
                <button type="button" onClick={() => remove(l.id)} className="ml-1 w-5 h-5 rounded-full hover:bg-destructive/20 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
