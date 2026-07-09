import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { AuthorByline } from "@/components/AuthorByline";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { PageSummary } from "@/components/detail/PageSummary";
import { Award, Calendar, IndianRupee, GraduationCap, ArrowUp, Share2, ArrowRight, CheckCircle2, Phone, Sparkles, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ScholarshipDetail() {
  const { slug } = useParams();
  const [s, setS] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMode, setGateMode] = useState<"apply" | "guidance">("apply");
  const [gatePlacement, setGatePlacement] = useState<string>("hero");

  const openApplyGate = (placement: string = "hero") => { setGateMode("apply"); setGatePlacement(placement); setGateOpen(true); };
  const openGuidanceGate = (placement: string = "hero") => { setGateMode("guidance"); setGatePlacement(placement); setGateOpen(true); };
  const onLeadSuccess = () => {
    if (gateMode === "apply" && s?.apply_url) {
      toast.success("Redirecting you to the application portal…");
      window.open(s.apply_url, "_blank", "noopener,noreferrer");
    } else if (gateMode === "apply") {
      toast.success("Thanks! Our counsellor will connect with you shortly.");
    } else {
      toast.success("Thanks! Your counsellor will connect with you shortly.");
    }
    setGateOpen(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("scholarships").select("*").eq("slug", slug).maybeSingle();
      setS(data);
      const { data: rel } = await (supabase as any)
        .from("scholarships").select("*").neq("slug", slug).limit(6);
      setRelated(rel || []);
    })();
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [s]);

  const sections = useMemo(() => {
    if (!s) return [];
    const items = [
      s.eligibility && { id: "eligibility", label: "Eligibility" },
      s.description && { id: "about", label: "About" },
      s.amount && { id: "benefits", label: "Benefits" },
      s.deadline && { id: "deadline", label: "Deadline" },
      { id: "apply", label: "How to Apply" },
    ].filter(Boolean) as { id: string; label: string }[];
    return items;
  }, [s]);

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: s.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    } catch {}
  };

  if (!s) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-12 animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-8 w-2/3 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
        </div>
        <Footer />
      </div>
    );
  }

  const heroImage = s.featured_image || s.image || `https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&q=80`;

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <SEO title={s.meta_title || `${s.title} | DekhoCampus`} description={s.meta_description || s.description} />
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <Navbar />

      <main className="pb-28 lg:pb-16">
        {/* Hero */}
        <section className="relative">
          <div className="relative h-[180px] sm:h-[40vh] sm:min-h-[260px] md:h-[55vh] w-full overflow-hidden">
            <img src={heroImage} alt={s.title} className="w-full h-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
          </div>
          <div className="container mt-4 sm:-mt-24 md:-mt-40 relative z-10 px-4">
            <div className="max-w-3xl mx-auto">
              <PageBreadcrumb items={[{ label: "Scholarships", href: "/scholarships" }, { label: s.title }]} />
              <div className="flex items-center gap-2 mb-3 flex-wrap mt-2">
                {s.is_live && <Badge className="bg-red-100 text-red-700">● Live</Badge>}
                {s.category && <Badge className="bg-primary text-primary-foreground">{s.category}</Badge>}
                {s.deadline && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" />{s.deadline}</span>
                )}
              </div>
              <h1 className="text-xl sm:text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight mb-2 sm:mb-3 break-words">{s.title}</h1>
              {s.provider && <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-2 break-words">By {s.provider}</p>}
              <div className="mb-4"><AuthorByline authorId={(s as any).author_id} /></div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                <Button size="lg" onClick={() => openApplyGate("hero")} className="w-full sm:w-auto rounded-xl gradient-primary text-primary-foreground border-0 shadow-lg shadow-primary/30 hover:shadow-xl">
                  Apply Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => openGuidanceGate("hero")} className="w-full sm:w-auto rounded-xl border-primary/40 text-primary hover:bg-primary/10">
                  <Sparkles className="w-4 h-4 mr-1" /> Get Free Guidance
                </Button>
                <Button variant="ghost" size="lg" onClick={handleShare} className="w-full sm:w-auto rounded-xl"><Share2 className="w-4 h-4 mr-1" />Share</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick stats */}
        <div className="container mt-8">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3">
            {s.amount && (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><IndianRupee className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-foreground">{s.amount}</p></div>
              </div>
            )}
            {s.deadline && (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Deadline</p><p className="font-bold text-foreground">{s.deadline}</p></div>
              </div>
            )}
          </div>
        </div>

        {/* Body + sticky sidebar */}
        <div className="container mt-10">
          <div className="grid lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
            <article className="lg:col-span-8 space-y-8">
              <PageSummary html={(s as any).page_summary} entityName={s.title} kind="scholarship" />
              {s.eligibility && (
                <motion.div id="eligibility" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-card border border-border rounded-2xl p-5 md:p-6">
                                    <h2 data-h className="text-xl font-extrabold tracking-tight text-foreground mb-2">Eligibility</h2>
                  <div
                    className="prose prose-base max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-[1.75] prose-li:text-foreground/90 prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: /<[a-z][\s\S]*>/i.test(s.eligibility) ? s.eligibility : `<p>${s.eligibility}</p>` }}
                  />
                </motion.div>
              )}
              {s.description && (
                <motion.div id="about" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-card border border-border rounded-2xl p-5 md:p-6">
                                    <h2 data-h className="text-xl font-extrabold tracking-tight text-foreground mb-3">About</h2>
                  <div className="prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-[1.75] prose-a:text-primary" dangerouslySetInnerHTML={{ __html: s.description }} />
                </motion.div>
              )}
              {s.amount && (
                <div id="benefits" className="border border-primary/20 rounded-2xl p-5 md:p-6 bg-primary/5">
                                    <h2 data-h className="text-xl font-extrabold tracking-tight text-foreground mb-2">Benefits</h2>
                  <p className="text-[15px] text-foreground/90 leading-[1.75]">Receive <span className="font-extrabold text-primary text-lg">{s.amount}</span> as financial assistance to support your studies.</p>
                </div>
              )}
              <div id="apply" className="bg-card border border-border rounded-2xl p-5 md:p-6">
                                <h2 data-h className="text-xl font-extrabold tracking-tight text-foreground mb-3">How to Apply</h2>
                <ol className="relative space-y-3 pl-6 border-l-2 border-accent/30">
                  {[
                    "Read the eligibility carefully and confirm you qualify.",
                    "Keep documents ready (ID proof, marksheets, income proof).",
                    "Click 'Apply Now' to visit the official application portal.",
                    "Submit your application before the deadline.",
                  ].map((step, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[31px] top-0 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-extrabold ring-4 ring-background">{i + 1}</span>
                      <p className="text-[15px] text-foreground/90 leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => openApplyGate("apply_section")} className="rounded-xl gradient-primary text-primary-foreground border-0">Apply Now <ArrowRight className="w-4 h-4 ml-1" /></Button>
                  <Button variant="outline" onClick={() => openGuidanceGate("apply_section")} className="rounded-xl border-primary/40 text-primary"><MessageCircle className="w-4 h-4 mr-1" />Talk to Counsellor</Button>
                </div>
              </div>

              {/* Attractive mid-page CTA banner */}
              <div className="rounded-2xl p-5 md:p-6 bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-primary/20">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-foreground/15 text-[10.5px] font-bold uppercase tracking-wide mb-1.5">
                    <Sparkles className="w-3 h-3" /> Limited slots
                  </div>
                  <h3 className="text-lg md:text-xl font-bold">Maximize your chances of getting selected</h3>
                  <p className="text-sm opacity-90 mt-1">Free 1-on-1 counselling - eligibility check, document review & application help.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto">
                  <Button size="lg" variant="secondary" onClick={() => openGuidanceGate("mid_banner")} className="rounded-xl w-full sm:w-auto">
                    <Phone className="w-4 h-4 mr-1" /> Get Free Guidance
                  </Button>
                  <Button size="lg" onClick={() => openApplyGate("mid_banner")} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
                    Apply Now
                  </Button>
                </div>
              </div>

              {/* Related */}
              {related.length > 0 && (
                <section>
                  <h2 data-h className="text-xl font-bold text-foreground mb-4">Related Scholarships</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {related.slice(0, 4).map((r: any) => (
                      <Link key={r.slug} to={`/scholarships/${r.slug}`} className="group bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Award className="w-5 h-5 text-primary" /></div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground line-clamp-2 group-hover:text-primary">{r.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{r.provider}</p>
                            {r.amount && <Badge variant="secondary" className="mt-2 text-[10px]">{r.amount}</Badge>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </article>

            <aside className="lg:col-span-4 space-y-5">
              <div className="lg:sticky lg:top-20 space-y-5">
                {sections.length > 0 && (
                  <nav className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">On this page</p>
                    <ul className="space-y-1.5">
                      {sections.map((sec) => (
                        <li key={sec.id}>
                          <a href={`#${sec.id}`} className="text-sm text-foreground/80 hover:text-primary transition flex items-center gap-2">
                            <span className="w-1 h-1 bg-primary rounded-full" />{sec.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <div className="bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/20 rounded-2xl p-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold uppercase tracking-wide mb-2">
                    <Sparkles className="w-3 h-3" /> Free
                  </div>
                  <h3 className="text-base font-bold text-foreground">Need help applying?</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Get free guidance from our scholarship experts</p>
                  <div className="space-y-2">
                    <Button onClick={() => openApplyGate("sidebar")} className="w-full rounded-xl gradient-primary text-primary-foreground border-0">Apply Now</Button>
                    <Button variant="outline" onClick={() => openGuidanceGate("sidebar")} className="w-full rounded-xl border-primary/40 text-primary">
                      <MessageCircle className="w-4 h-4 mr-1" /> Get Free Guidance
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-24 right-5 z-40 rounded-full bg-primary text-primary-foreground shadow-lg w-11 h-11 flex items-center justify-center transition ${progress > 15 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2 shadow-2xl">
        <Button onClick={() => openGuidanceGate("mobile_bar")} variant="outline" className="flex-1 rounded-xl border-primary/40 text-primary">
          <MessageCircle className="w-4 h-4 mr-1" /> Free Guidance
        </Button>
        <Button onClick={() => openApplyGate("mobile_bar")} className="flex-1 rounded-xl gradient-primary text-primary-foreground border-0">
          Apply Now <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <LeadGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        title={gateMode === "apply" ? `🎓 Apply for ${s.title}` : `💬 Free Scholarship Guidance`}
        subtitle={gateMode === "apply"
          ? "Quick details - we'll redirect you to the official application after this."
          : "Tell us about you. Our expert will call you back with personalised guidance."}
        source={`scholarship_${gateMode}_${gatePlacement}_${s.slug}`}
        onSuccess={onLeadSuccess}
        forceShow={gateMode === "apply"}
        simple={gateMode === "apply"}
      />

      <AlsoCheckSection />
      <Footer />
    </div>
  );
}
