import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, MapPin, IndianRupee, Clock, ExternalLink, Mail } from "lucide-react";
import { RichText } from "@/components/detail/RichText";
import { ApplyVacancyDialog } from "@/components/ApplyVacancyDialog";

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: j, isLoading } = useQuery<any>({
    queryKey: ["vacancy", slug],
    queryFn: async () => {
      const { data } = await supabase.from("jobs" as any).select("*").eq("slug", slug as string).maybeSingle();
      return data as any;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading && !j) return (<><Navbar /><div className="container py-10"><Skeleton className="h-10 w-2/3 mb-3" /><Skeleton className="h-4 w-full mb-2" /></div><Footer /></>);
  if (!j) return (<><Navbar /><div className="container py-20 text-center"><h1 className="text-2xl font-bold">Vacancy not found</h1><Link to="/vacancies" className="text-primary mt-4 inline-block">← Back to vacancies</Link></div><Footer /></>);

  const externalHref = j.apply_url || (j.apply_email ? `mailto:${j.apply_email}?subject=Application for ${encodeURIComponent(j.title)}` : null);

  return (
    <>
      <SEO title={j.meta_title || `${j.title} at ${j.company} – Careers`} description={j.meta_description || j.short_description} keywords={j.meta_keywords} />
      <Navbar />
      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-10">
          <div className="container">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-20 h-20 rounded-2xl bg-card shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                {j.company_logo ? <img src={j.company_logo} alt={j.company} className="w-full h-full object-cover" /> : <Briefcase className="w-8 h-8 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                {j.category && <Badge variant="secondary" className="mb-2">{j.category}</Badge>}
                <h1 className="text-2xl md:text-3xl font-bold">{j.title}</h1>
                <p className="text-muted-foreground mt-1">{j.company}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-sm">
                  {j.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{j.location}</span>}
                  {j.job_type && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{j.job_type}</span>}
                  {j.salary && <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{j.salary}</span>}
                  {j.experience && <span>{j.experience}</span>}
                  {j.is_remote && <Badge variant="secondary">Remote</Badge>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ApplyVacancyDialog job={j} />
                  {externalHref && (
                    <Button asChild size="lg" variant="outline">
                      <a href={externalHref} target={j.apply_url ? "_blank" : undefined} rel="noopener noreferrer">
                        {j.apply_email ? <Mail className="w-4 h-4 mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                        {j.apply_email ? "Email us" : "Company site"}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {j.short_description && <Card className="p-5"><p className="text-foreground/90">{j.short_description}</p></Card>}
            {j.description && <Card className="p-6"><h2 className="text-xl font-bold mb-3">About the Role</h2><RichText html={j.description} /></Card>}
            {j.responsibilities && <Card className="p-6"><h2 className="text-xl font-bold mb-3">Responsibilities</h2><RichText html={j.responsibilities} /></Card>}
            {j.requirements && <Card className="p-6"><h2 className="text-xl font-bold mb-3">Requirements</h2><RichText html={j.requirements} /></Card>}
          </div>
          <aside className="space-y-4">
            {j.skills?.length > 0 && (
              <Card className="p-5"><h3 className="font-bold mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">{j.skills.map((s: string) => <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>)}</div>
              </Card>
            )}
            <Card className="p-5">
              <h3 className="font-bold mb-2">Ready to apply?</h3>
              <p className="text-sm text-muted-foreground mb-3">Fill the form and our team will get back to you.</p>
              <ApplyVacancyDialog job={j} trigger={<Button className="w-full"><Mail className="w-4 h-4 mr-2" />Apply Now</Button>} />
              {externalHref && (
                <Button asChild variant="outline" className="w-full mt-2">
                  <a href={externalHref} target={j.apply_url ? "_blank" : undefined} rel="noopener noreferrer">
                    {j.apply_email ? "Email us instead" : "Apply on company site"}
                  </a>
                </Button>
              )}
            </Card>
          </aside>
        </section>
      </main>
      <AlsoCheckSection />
      <Footer />
    </>
  );
}
