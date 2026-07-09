import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Linkedin, Twitter, Globe, Mail, ArrowRight, Newspaper, GraduationCap, BookOpen, FileText, Award, Briefcase, Library } from "lucide-react";

interface Author {
  id: string; slug: string; name: string; designation: string; photo: string;
  short_bio: string; bio: string; expertise: string[];
  email: string; linkedin_url: string; twitter_url: string; website_url: string;
}

const SOURCES: { table: string; label: string; route: (slug: string) => string; icon: any }[] = [
  { table: "articles", label: "Articles", route: (s) => `/articles/${s}`, icon: Newspaper },
  { table: "colleges", label: "Colleges", route: (s) => `/colleges/${s}`, icon: GraduationCap },
  { table: "courses", label: "Courses", route: (s) => `/courses/${s}`, icon: BookOpen },
  { table: "exams", label: "Exams", route: (s) => `/exams/${s}`, icon: FileText },
  { table: "scholarships", label: "Scholarships", route: (s) => `/scholarships/${s}`, icon: Award },
  { table: "career_profiles", label: "Career Profiles", route: (s) => `/careers/${s}`, icon: Briefcase },
  { table: "study_subjects", label: "Study Material", route: () => `/study-material`, icon: Library },
];

export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [content, setContent] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: a } = await (supabase as any).from("authors").select("*").eq("slug", slug).maybeSingle();
      setAuthor(a as Author | null);
      if (a?.id) {
        const results = await Promise.all(SOURCES.map(s =>
          (supabase as any).from(s.table).select("slug,name,title,description,short_description,image,featured_image,created_at").eq("author_id", a.id).limit(50)
        ));
        const next: Record<string, any[]> = {};
        SOURCES.forEach((s, i) => { next[s.table] = (results[i].data as any[]) || []; });
        setContent(next);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">Loading…</div><Footer /></div>;
  if (!author) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">Author not found.</div><Footer /></div>;

  const totalCount = Object.values(content).reduce((n, arr) => n + arr.length, 0);
  const ldjson = {
    "@context": "https://schema.org", "@type": "Person",
    name: author.name, jobTitle: author.designation, image: author.photo, description: author.short_bio,
    url: `${typeof window !== "undefined" ? window.location.origin : ""}/author/${author.slug}`,
    sameAs: [author.linkedin_url, author.twitter_url, author.website_url].filter(Boolean),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${author.name}${author.designation ? ` - ${author.designation}` : ""} | DekhoCampus`} description={author.short_bio || `${author.name} on DekhoCampus`} canonical={`/author/${author.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldjson) }} />
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-primary/5 to-background border-b border-border">
          <div className="container py-10 md:py-14 flex flex-col md:flex-row gap-6 items-center md:items-start">
            {author.photo ? <img src={author.photo} alt={author.name} className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border border-border" /> : <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-primary/10" />}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">{author.name}</h1>
              {author.designation && <p className="text-primary font-medium mt-1">{author.designation}</p>}
              {author.short_bio && <p className="text-muted-foreground mt-2 max-w-2xl">{author.short_bio}</p>}
              {author.expertise?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center md:justify-start">
                  {author.expertise.map(t => <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                {author.linkedin_url && <a href={author.linkedin_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary"><Linkedin className="w-4 h-4" /></a>}
                {author.twitter_url && <a href={author.twitter_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary"><Twitter className="w-4 h-4" /></a>}
                {author.website_url && <a href={author.website_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary"><Globe className="w-4 h-4" /></a>}
                {author.email && <a href={`mailto:${author.email}`} className="p-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary"><Mail className="w-4 h-4" /></a>}
              </div>
            </div>
          </div>
        </section>

        {author.bio && (
          <section className="container py-8">
            <h2 className="text-lg font-bold text-foreground mb-3">About {author.name.split(" ")[0]}</h2>
            <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: author.bio }} />
          </section>
        )}

        <section className="container py-6">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">Contributions ({totalCount})</h2>
          {SOURCES.map((s) => {
            const items = content[s.table] || [];
            if (!items.length) return null;
            const Icon = s.icon;
            return (
              <div key={s.table} className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Icon className="w-4 h-4 text-primary" /> {s.label} ({items.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((it: any) => (
                    <Link key={it.slug || it.id} to={s.route(it.slug)} className="bg-card border border-border rounded-2xl p-3 hover:shadow-md hover:border-primary/40 transition-all">
                      {(it.featured_image || it.image) && <img src={it.featured_image || it.image} alt="" className="w-full h-32 object-cover rounded-lg mb-2" loading="lazy" />}
                      <p className="font-semibold text-sm text-foreground line-clamp-2">{it.title || it.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{it.description || it.short_description}</p>
                      <p className="text-xs text-primary mt-2 inline-flex items-center gap-1">Read <ArrowRight className="w-3 h-3" /></p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {totalCount === 0 && <p className="text-muted-foreground text-sm">No published content yet.</p>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
