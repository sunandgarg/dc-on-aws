import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, IndianRupee, Briefcase, Award } from "lucide-react";
import { YouTubeVideoButton } from "@/components/YouTubeVideoButton";
import { FAQSection } from "@/components/FAQSection";
import { buildDefaultFaqs } from "@/lib/defaultFaqs";
import { AuthorByline } from "@/components/AuthorByline";
import { RichText } from "@/components/detail/RichText";
import { ProfessionalAvatar } from "@/components/ProfessionalAvatar";
import { PageSummary } from "@/components/detail/PageSummary";

export default function CareerDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("career_profiles").select("*").eq("slug", slug).maybeSingle()
      .then(({ data }) => { setC(data); setLoading(false); });
  }, [slug]);

  if (loading) return (<><Navbar /><div className="container py-10"><Skeleton className="h-12 w-2/3 mb-4" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-full mb-2" /></div><Footer /></>);
  if (!c) return (<><Navbar /><div className="container py-20 text-center"><h1 className="text-2xl font-bold">Career not found</h1><Link to="/careers" className="text-primary mt-4 inline-block">← Back to careers</Link></div><Footer /></>);

  return (
    <>
      <SEO title={c.meta_title || `${c.name} – Career Scope, Salary & Job Profile`} description={c.meta_description || c.short_description} keywords={c.meta_keywords} />
      <Navbar />
      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-10">
          <div className="container">
            <div className="flex items-start gap-4 flex-wrap">
              {c.image ? (
                <img src={c.image} alt={c.name} width={80} height={80} className="w-20 h-20 rounded-2xl bg-card object-cover shadow-sm shrink-0" />
              ) : (
                <ProfessionalAvatar variant="career" seed={c.slug || c.name} className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="mb-2">{c.domain}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{c.name}</h1>
                <div className="text-muted-foreground"><RichText html={c.short_description || ""} /></div>
                <div className="mt-2"><AuthorByline authorId={c.author_id} /></div>
                <div className="mt-3"><YouTubeVideoButton url={c.youtube_video_url} category="career" title={`${c.name} - Career Guide`} label={`Watch ${c.name} Video`} className="h-9 rounded-xl text-xs" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="w-3 h-3" />Avg Salary</div><div className="font-bold mt-1">{c.avg_salary || "-"}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Growth</div><div className="font-bold mt-1 text-green-600">{c.growth || "-"}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" />Experience</div><div className="font-bold mt-1">{c.experience_required || "Entry level"}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Award className="w-3 h-3" />Skills</div><div className="font-bold mt-1">{c.top_skills?.length || 0}+ key</div></Card>
            </div>
          </div>
        </section>

        <section className="container py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PageSummary html={(c as any).page_summary} entityName={c.name} kind="career" />
            {c.description && (
              <Card className="p-6">
                                <h2 data-h className="text-xl font-extrabold tracking-tight mb-2 mt-1">About</h2>
                <RichText html={c.description} />
              </Card>
            )}
            {c.top_skills?.length > 0 && (
              <Card className="p-6">
                                <h2 data-h className="text-xl font-extrabold tracking-tight mb-3 mt-1">Top Skills Required</h2>
                <div className="flex flex-wrap gap-2">{c.top_skills.map((s: string) => <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>)}</div>
              </Card>
            )}
            {c.top_companies?.length > 0 && (
              <Card className="p-6">
                                <h2 data-h className="text-xl font-extrabold tracking-tight mb-3 mt-1">Top Hiring Companies</h2>
                <div className="flex flex-wrap gap-2">{c.top_companies.map((s: string) => <Badge key={s} className="bg-primary/10 text-primary border-primary/20 rounded-full">{s}</Badge>)}</div>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            {c.related_courses?.length > 0 && (
              <Card className="p-5"><h3 data-h className="font-bold mb-3">Related Courses</h3>
                <ul className="space-y-2">{c.related_courses.map((s: string) => <li key={s}><Link to={`/courses/${s}`} className="text-sm text-primary hover:underline">→ {s.replace(/-/g, " ")}</Link></li>)}</ul>
              </Card>
            )}
            {c.related_exams?.length > 0 && (
              <Card className="p-5"><h3 data-h className="font-bold mb-3">Related Exams</h3>
                <ul className="space-y-2">{c.related_exams.map((s: string) => <li key={s}><Link to={`/exams/${s}`} className="text-sm text-primary hover:underline">→ {s.replace(/-/g, " ")}</Link></li>)}</ul>
              </Card>
            )}
          </div>
        </section>
        <FAQSection page="careers" itemSlug={c.slug} title={`${c.name} - FAQs`} fallback={buildDefaultFaqs("course", { name: c.name })} />
      </main>
      <AlsoCheckSection />
      <Footer />
    </>
  );
}
