import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Briefcase, TrendingUp, IndianRupee, Search } from "lucide-react";
import { ProfessionalAvatar } from "@/components/ProfessionalAvatar";

export default function AllCareers() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("career_profiles").select("*").eq("is_active", true).order("display_order")
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, []);

  const filtered = items.filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.domain.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <SEO title="Career Scope & Job Profiles | DekhoCampus" description="Explore career options, job roles, salaries and growth across industries. Find the right career path after your course." />
      <Navbar />
      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
          <div className="container">
            <h1 className="text-3xl md:text-5xl font-bold mb-3">Career Scope & Job Profiles</h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl">Discover top career paths, salary ranges, required skills and growth trends across industries.</p>
            <div className="mt-6 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search careers (e.g. data scientist)" className="pl-9" />
            </div>
          </div>
        </section>

        <div className="container pt-4"><AlsoCheckSection variant="strip" /></div>

        <section className="container py-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No careers match your search.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => (
                <Link key={c.id} to={`/careers/${c.slug}`}>
                  <Card className="p-5 h-full hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      {c.image ? (<img src={c.image} alt="" loading="lazy" width={56} height={56} className="w-14 h-14 rounded-xl bg-card object-cover shrink-0" />) : (<ProfessionalAvatar variant="career" seed={c.slug || c.name} className="w-14 h-14 rounded-xl overflow-hidden shrink-0" />)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-tight">{c.name}</h3>
                        <p className="text-xs text-primary mt-0.5">{c.domain}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{c.short_description}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {c.avg_salary && <span className="flex items-center gap-1 text-foreground/80"><IndianRupee className="w-3 h-3" />{c.avg_salary}</span>}
                      {c.growth && <span className="flex items-center gap-1 text-green-600"><TrendingUp className="w-3 h-3" />{c.growth}</span>}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
