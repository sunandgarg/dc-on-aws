import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { Download, GraduationCap, Calendar, Clock, CheckCircle2, Award, Linkedin, ChevronDown, Globe, MapPin, Sparkles, Star, Users, TrendingUp, Briefcase, Building2, ChevronLeft, ChevronRight, ScrollText, Zap, ShieldCheck, Flame, BadgeCheck, Rocket, Layers, Phone } from "lucide-react";
import { ProfessionalAvatar } from "@/components/ProfessionalAvatar";
import { YouTubeVideoButton } from "@/components/YouTubeVideoButton";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ScrollSpy } from "@/components/ScrollSpy";
import { useSiteIntegration } from "@/hooks/useSiteIntegration";
import { PremiumTrustBento } from "@/components/detail/PremiumTrustBento";
import { PremiumAIInsight } from "@/components/detail/PremiumAIInsight";
import { PremiumDecisionRail } from "@/components/detail/PremiumDecisionRail";
import { trackEvent } from "@/lib/analytics";

function formatPrice(price: number) {
  if (price >= 100000) return `₹${(price / 100000).toFixed(price % 100000 === 0 ? 0 : 1)}L`;
  if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
  return `₹${price}`;
}

const FAKE_NAMES = ["Riya M.", "Arjun S.", "Priya K.", "Rohan T.", "Sneha P.", "Aman G.", "Neha R.", "Karan V.", "Ishita D.", "Vikram J."];
const FAKE_CITIES = ["Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chennai", "Kolkata", "Jaipur", "Lucknow", "Ahmedabad"];

export default function PremiumProgramDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: fallbackPhone } = useSiteIntegration("premium_program_fallback_phone");
  const [program, setProgram] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLead, setShowLead] = useState(false);
  const [leadIntent, setLeadIntent] = useState<"brochure" | "apply" | "counsel">("counsel");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Live "seats filling" psychological scarcity
  const [seatsLeft, setSeatsLeft] = useState<number>(() => 12 + Math.floor(Math.random() * 8));
  const [viewersNow, setViewersNow] = useState<number>(() => 38 + Math.floor(Math.random() * 40));
  // Countdown to cohort close (psychological urgency) - 23h59m local
  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number }>({ h: 23, m: 59, s: 30 });
  // Live enrollment ticker (social proof)
  const [tick, setTick] = useState<{ name: string; city: string; mins: number } | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("promoted_programs").select("*").eq("slug", slug).maybeSingle();
      setProgram(data);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    const t = setInterval(() => {
      setViewersNow((v) => Math.max(22, Math.min(120, v + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3)))));
    }, 4200);
    return () => clearInterval(t);
  }, []);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        let s = c.s - 1, m = c.m, h = c.h;
        if (s < 0) { s = 59; m -= 1; }
        if (m < 0) { m = 59; h -= 1; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Live social-proof enrollment ticker (rotates every ~6s)
  useEffect(() => {
    const roll = () => setTick({
      name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
      city: FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)],
      mins: 1 + Math.floor(Math.random() * 18),
    });
    roll();
    const t = setInterval(roll, 6500);
    return () => clearInterval(t);
  }, []);

  const openLead = (intent: "brochure" | "apply" | "counsel") => {
    setLeadIntent(intent);
    setShowLead(true);
    try {
      const ctaMap = { apply: "Apply Now", brochure: "Download Brochure", counsel: "Talk to Counselor" } as const;
      trackEvent("cta_click", { page: "premium", cta: ctaMap[intent], program_slug: program?.slug || slug, entity_name: program?.title || null });
    } catch {}
  };
  const handleLeadSuccess = () => {
    const url = leadIntent === "brochure"
      ? (program?.brochure_url && program.brochure_url !== "#" ? program.brochure_url : "")
      : leadIntent === "apply"
        ? (program?.apply_url || "")
        : "";
    if (url) setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 250);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!program) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="text-2xl font-bold mb-2">Program not found</p>
      <Link to="/" className="text-primary underline">Back to home</Link>
    </div>
  );

  const discountedPrice = program.original_price * (1 - program.discount_percent / 100);
  const months = parseInt(String(program.duration).match(/\d+/)?.[0] || "12") || 12;
  const emi = program.emi_starts_at && program.emi_starts_at > 0 ? program.emi_starts_at : Math.max(1, Math.round(discountedPrice / months));

  const highlights: string[] = Array.isArray(program.highlights) ? program.highlights : [];
  const outcomes: string[] = Array.isArray(program.learning_outcomes) ? program.learning_outcomes : [];
  const curriculum: Array<{ term?: string; title?: string; modules?: string[] }> = Array.isArray(program.curriculum) ? program.curriculum : [];
  const faculty: Array<{ name: string; title?: string; photo?: string; linkedin_url?: string }> = Array.isArray(program.faculty) ? program.faculty : [];
  const mentors: Array<{ name: string; title?: string; photo?: string; linkedin_url?: string; company?: string }> = Array.isArray(program.mentors) ? program.mentors : [];
  const faqs: Array<{ q: string; a: string }> = Array.isArray(program.faqs) ? program.faqs : [];
  const feeBreakdown: Array<{ label: string; amount: number }> = Array.isArray(program.fee_breakdown) ? program.fee_breakdown : [];
  const partners: Array<{ name: string; logo: string }> = Array.isArray(program.partner_logos) ? program.partner_logos : [];
  const tools: string[] = Array.isArray(program.tools_taught) ? program.tools_taught : [];
  const stats = program.placement_stats || {};
  const whoFor: Array<{ title: string; desc?: string; icon?: string }> = Array.isArray(program.who_should_apply) ? program.who_should_apply : [];
  const appSteps: Array<{ title: string; desc?: string }> = Array.isArray(program.application_steps) ? program.application_steps : [];
  const progStats = program.program_stats || {};
  const topCompanies: Array<{ name: string; logo?: string }> = Array.isArray(program.top_companies) ? program.top_companies : [];
  const testimonials: Array<{ name: string; quote: string; role?: string; photo?: string; company?: string }> = Array.isArray(program.testimonials) ? program.testimonials : [];
  const legacyPoints: Array<{ title: string; description?: string }> = Array.isArray(program.institute_legacy_points) ? program.institute_legacy_points : [];

  const heroImg = program.hero_image || program.image_url;
  const navItems: Array<{ id: string; label: string; show: boolean }> = [
    { id: "highlights", label: "Highlights", show: highlights.length > 0 || Object.keys(progStats).length > 0 },
    { id: "why", label: "Why this program", show: !!program.why_this_program },
    { id: "legacy", label: "About the Institute", show: legacyPoints.length > 0 || !!program.institute_logo },
    { id: "who", label: "Who should apply", show: whoFor.length > 0 },
    { id: "curriculum", label: "Curriculum", show: curriculum.length > 0 },
    { id: "faculty", label: "Faculty & Mentors", show: faculty.length + mentors.length > 0 },
    { id: "placements", label: "Career Outcomes", show: !!(stats.avg_hike_pct || stats.highest_ctc || topCompanies.length) },
    { id: "fees", label: "Fees", show: feeBreakdown.length > 0 },
    { id: "process", label: "Application Process", show: appSteps.length > 0 },
    { id: "faqs", label: "FAQs", show: faqs.length > 0 },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={program.meta_title || `${program.title} - ${program.college_name} | DekhoCampus`}
        description={program.meta_description || program.summary || `Apply for ${program.title} from ${program.college_name}. ${program.duration} ${program.program_type} program.`}
      />
      <Navbar />

      {/* SCARCITY / URGENCY TOP BAR */}
      <div className="bg-primary text-primary-foreground text-xs md:text-sm">
        <div className="container py-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-semibold">
          <span className="inline-flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Cohort closes in <span className="bg-white/20 rounded px-1.5 py-0.5 tabular-nums">{String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")}</span></span>
          <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> <span className="tabular-nums">{viewersNow}</span> viewing · only <span className="tabular-nums">{seatsLeft}</span> seats left</span>
          <span className="hidden md:inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Free counselling · No-cost EMI</span>
        </div>
      </div>


      <div className="container px-3 md:px-6 pt-1" style={{ overflowX: "clip" }}>
        <PageBreadcrumb items={[{ label: "Premium Programs", href: "/premium-programs" }, { label: program.title }]} />

        {/* HERO CARD - image left / details right (college-detail surface, premium energy) */}
        <section className="rounded-2xl overflow-hidden mb-5 border border-border bg-card shadow-sm">
          <div className="grid lg:grid-cols-[1.05fr_1fr]">
            {/* Visual */}
            <div className="relative bg-primary/5">
              {heroImg ? (
                <img src={heroImg} alt={program.title} className="w-full h-full object-cover min-h-[260px] lg:min-h-[440px]" loading="eager" />
              ) : program.hero_video_url ? (
                <iframe src={program.hero_video_url} title={program.title} className="w-full h-full min-h-[260px] lg:min-h-[440px]" allowFullScreen />
              ) : (
                <div className="w-full h-full min-h-[260px] lg:min-h-[440px] flex items-center justify-center">
                  <GraduationCap className="w-24 h-24 text-primary/40" />
                </div>
              )}
              {/* Floating badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-extrabold uppercase shadow">{program.tag || "Premium"}</span>
                {program.badge && <Badge variant="outline" className="text-[10px] bg-background/85 backdrop-blur border-border">{program.badge}</Badge>}
                {program.delivery_mode && <Badge variant="secondary" className="text-[10px] bg-background/85 backdrop-blur">{program.delivery_mode}</Badge>}
              </div>
            </div>

            {/* Details */}
            <div className="p-5 md:p-6 lg:p-7 flex flex-col">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-2">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{program.college_name}</span>
                {program.country && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{program.country}</span>}
                {program.ranking_text && <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3 text-primary" />{program.ranking_text}</span>}
              </div>
              <h1 className="text-2xl md:text-[34px] font-extrabold text-foreground leading-[1.15] tracking-tight">
                {program.title}
              </h1>
              {program.summary && <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed line-clamp-3">{program.summary}</p>}

              {/* meta row */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {Number(program.rating) > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{Number(program.rating).toFixed(1)}<span className="text-xs text-muted-foreground font-normal">/5</span>
                  </span>
                )}
                {program.learners_count && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Users className="w-4 h-4 text-primary" />{program.learners_count}</span>}
                <span className="inline-flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" />{program.program_type}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" />{program.duration}</span>
                {program.batch_start_date && <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" />Starts {program.batch_start_date}</span>}
              </div>

              {/* PRICE - anchor + savings + countdown (psychology: anchoring, loss aversion, urgency) */}
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 p-4 shadow-sm">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">{formatPrice(discountedPrice)}</span>
                  <span className="text-base line-through text-muted-foreground">{formatPrice(program.original_price)}</span>
                  <Badge className="bg-primary text-primary-foreground border-0 font-bold">{program.discount_percent}% OFF</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 text-success font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> You save {formatPrice(program.original_price - discountedPrice)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-primary font-semibold">EMI {formatPrice(emi)}/mo · 0% interest</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 rounded-md px-2 py-1">
                  <Flame className="w-3 h-3 animate-pulse" /> Offer ends in {String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")}
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="lg" className="relative rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-md shadow-primary/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group" onClick={() => openLead("apply")}>
                  <span className="absolute inset-0 rounded-xl ring-2 ring-primary/40 animate-ping opacity-60 pointer-events-none" />
                  <Rocket className="w-4 h-4 mr-1 relative z-10 group-hover:translate-x-0.5 transition-transform" /> <span className="relative z-10">Apply Now</span>
                </Button>
                <Button size="lg" variant="outline" className="rounded-xl border-primary/40 text-primary hover:bg-primary/5 hover:text-primary transition-transform hover:-translate-y-0.5 group" onClick={() => openLead("brochure")}>
                  <Download className="w-4 h-4 mr-2 group-hover:translate-y-0.5 transition-transform" /> Brochure
                </Button>
                <Button size="lg" variant="outline" className="rounded-xl transition-transform hover:-translate-y-0.5" onClick={() => openLead("counsel")}>
                  Talk to Counsellor
                </Button>
                <YouTubeVideoButton
                  url={program.youtube_url || program.hero_video_url}
                  category="course"
                  title={`${program.title} - Program Overview`}
                  label="Overview"
                  className="h-11 rounded-xl px-4"
                />
              </div>

              {/* Risk reversal nudge (loss-aversion reduction) */}
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 border border-success/25 rounded-lg px-2.5 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Money-back guarantee · No risk, just growth
              </div>

              {/* Trust microcopy */}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-success" /> 7-day refund</span>
                <span className="inline-flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-primary" /> UGC / AICTE recognised</span>
                <span className="inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-primary" /> Dedicated career coach</span>
                <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" /> 1:1 mentor support</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2026 - Trust Bento at-a-glance */}
        <div className="mb-5">
          <PremiumTrustBento program={program} emiLabel={`${formatPrice(emi)}/mo`} />
        </div>

        {/* 2026 - Conversational AI Insight */}
        <div className="mb-6">
          <PremiumAIInsight program={program} />
        </div>


        {/* Section nav (ScrollSpy - same component college detail uses) */}
        {navItems.length > 0 && (
          <ScrollSpy
            sections={navItems.map((n) => ({ id: n.id, label: n.label }))}
            className="mb-6 -mx-3 px-3 md:mx-0 md:px-0 rounded-none md:rounded-xl"
          />
        )}

        {/* Program stats */}
        {(progStats.hours || progStats.modules || progStats.projects || progStats.sessions) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {progStats.hours && <QuickStat label="Learning hours" value={progStats.hours} />}
            {progStats.modules && <QuickStat label="Modules" value={progStats.modules} />}
            {progStats.projects && <QuickStat label="Projects" value={progStats.projects} />}
            {progStats.sessions && <QuickStat label="Live sessions" value={progStats.sessions} />}
          </div>
        )}

        {/* PARTNER STRIP */}
        {partners.length > 0 && (
          <section className="bg-card rounded-2xl border border-border p-4 md:p-5 mb-6">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accredited & Recognised By</p>
              {partners.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  {p.logo ? <img src={p.logo} alt={p.name} className="h-9 object-contain" loading="lazy" /> : <span className="text-sm font-semibold">{p.name}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <main className="container px-3 md:px-6 grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 pb-10">
        <div className="space-y-10 min-w-0">
          {/* HIGHLIGHTS */}
          {highlights.length > 0 && (
            <Section id="highlights" title="Program Highlights">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {highlights.map((h, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-2 hover:border-primary/40 transition">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium">{h}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* WHY THIS PROGRAM */}
          {program.why_this_program && (
            <Section id="why" title="Why this program">
              <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line bg-card border border-border rounded-2xl p-5">
                {program.why_this_program}
              </div>
            </Section>
          )}

          {/* ABOUT */}
          {program.about_program && (
            <Section id="about" title="About the Program">
              <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line">{program.about_program}</div>
            </Section>
          )}

          {/* INSTITUTE LEGACY - logo left, headline + checkmark bullets right */}
          {(legacyPoints.length > 0 || program.institute_logo) && (
            <Section id="legacy" title={program.institute_legacy_title || `${program.college_name} : Legacy That Nurtures Excellence`}>
              <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-10 items-center bg-card border border-border rounded-2xl p-5 md:p-8">
                <div className="order-2 md:order-1 space-y-5">
                  {legacyPoints.map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-base md:text-lg text-foreground mb-1">{p.title}</h3>
                        {p.description && <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="order-1 md:order-2 flex items-center justify-center">
                  {program.institute_logo ? (
                    <img src={program.institute_logo} alt={`${program.college_name} logo`} className="max-h-56 md:max-h-72 w-auto object-contain" loading="lazy" />
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-primary/5 flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-primary/40" />
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* WHO SHOULD APPLY */}
          {whoFor.length > 0 && (
            <Section id="who" title="Who should apply">
              <div className="grid sm:grid-cols-2 gap-3">
                {whoFor.map((w, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg">{w.icon || "🎯"}</span>
                      <h3 className="font-bold text-sm">{w.title}</h3>
                    </div>
                    {w.desc && <p className="text-sm text-muted-foreground">{w.desc}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* OUTCOMES */}
          {outcomes.length > 0 && (
            <Section id="outcomes" title="What You'll Learn">
              <ul className="grid sm:grid-cols-2 gap-2">
                {outcomes.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 bg-card border border-border rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{o}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Lead capture #1 - after outcomes, high intent moment */}
          <LeadCaptureForm
            variant="inline"
            title={`📞 Get full curriculum & fees for ${program.title}`}
            subtitle="Free counselling call - batch start dates, EMI options & scholarships."
            source={`premium_program_inline_outcomes_${program.slug}`}
          />


          {/* CURRICULUM */}
          {curriculum.length > 0 && (
            <Section id="curriculum" title="Curriculum">
              <div className="space-y-3">
                {curriculum.map((c, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {c.term && <Badge variant="outline" className="text-[10px]">{c.term}</Badge>}
                      <h3 className="font-bold text-foreground">{c.title || `Module ${i + 1}`}</h3>
                    </div>
                    {Array.isArray(c.modules) && c.modules.length > 0 && (
                      <ul className="grid sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                        {c.modules.map((m, j) => (
                          <li key={j} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span><span>{m}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Lead capture #1.5 - mid-page after curriculum */}
          <LeadCaptureForm
            variant="banner"
            title={`🎯 Talk to a ${program.title} mentor`}
            subtitle="Get curriculum walk-through, EMI plans & scholarship eligibility - free 15-min call."
            source={`premium_program_mid_curriculum_${program.slug}`}
          />

          {/* TOOLS */}
          {tools.length > 0 && (
            <Section id="tools" title="Tools & Technologies">
              <div className="flex flex-wrap gap-2">
                {tools.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">{t}</span>
                ))}
              </div>
            </Section>
          )}

          {/* FACULTY + MENTORS */}
          {(faculty.length + mentors.length) > 0 && (
            <Section id="faculty" title="Faculty & Industry Mentors">
              {faculty.length > 0 && <PersonRow heading="Faculty" people={faculty} variant="faculty" />}
              {mentors.length > 0 && <PersonRow heading="Industry Mentors" people={mentors} variant="career" />}
            </Section>
          )}

          {/* CERTIFICATE + DEGREE */}
          {(program.certificate_image || program.degree_image) && (
            <Section id="certificate" title="Your Certificate & Degree">
              <div className="grid sm:grid-cols-2 gap-4">
                {program.certificate_image && (
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold mb-3">
                      <Award className="w-3.5 h-3.5" /> Sample Certificate
                    </div>
                    <img src={program.certificate_image} alt="Sample certificate" className="w-full rounded-lg border border-border shadow-sm" loading="lazy" />
                    <p className="text-xs text-muted-foreground mt-3">Verified completion certificate from <b>{program.college_name}</b>.</p>
                  </div>
                )}
                {program.degree_image && (
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold mb-3">
                      <ScrollText className="w-3.5 h-3.5" /> Sample Degree
                    </div>
                    <img src={program.degree_image} alt="Sample degree" className="w-full rounded-lg border border-border shadow-sm" loading="lazy" />
                    <p className="text-xs text-muted-foreground mt-3">Recognised degree awarded by <b>{program.college_name}</b> on successful completion.</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* PLACEMENTS + COMPANIES */}
          {(stats.avg_hike_pct || stats.highest_ctc || topCompanies.length > 0) && (
            <Section id="placements" title="Career Outcomes">
              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                {stats.avg_hike_pct && <Stat label="Avg. Salary Hike" value={`${stats.avg_hike_pct}%`} />}
                {stats.highest_ctc && <Stat label="Highest CTC" value={stats.highest_ctc} />}
                {stats.transitions && <Stat label="Career Transitions" value={stats.transitions} />}
              </div>
              {topCompanies.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Top Hiring Companies</h3>
                  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-hide">
                    {topCompanies.map((c, i) => (
                      <div key={i} className="snap-start flex-shrink-0 w-[120px] sm:w-[140px] h-[110px] bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center hover:border-primary/40 hover:shadow-md transition">
                        {c.logo ? <img src={c.logo} alt={c.name} className="max-h-10 max-w-full object-contain" loading="lazy" />
                          : <Building2 className="w-6 h-6 text-muted-foreground" />}
                        <span className="text-[10px] mt-1 text-center text-muted-foreground line-clamp-1 w-full">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>
          )}

          {/* ELIGIBILITY */}
          {program.eligibility && (
            <Section id="eligibility" title="Eligibility">
              <div className="bg-card border border-border rounded-2xl p-4 text-sm whitespace-pre-line">{program.eligibility}</div>
            </Section>
          )}

          {/* FEE BREAKDOWN */}
          {feeBreakdown.length > 0 && (
            <Section id="fees" title="Program Fee">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {feeBreakdown.map((f, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-3">{f.label}</td>
                        <td className="p-3 text-right font-semibold">{formatPrice(f.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right text-primary">{formatPrice(feeBreakdown.reduce((a, b) => a + (b.amount || 0), 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* APPLICATION PROCESS */}
          {appSteps.length > 0 && (
            <Section id="process" title="Application Process">
              <ol className="space-y-3">
                {appSteps.map((s, i) => (
                  <li key={i} className="flex gap-4 bg-card border border-border rounded-xl p-4">
                    <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">{s.title}</h3>
                      {s.desc && <p className="text-sm text-muted-foreground">{s.desc}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* TESTIMONIALS */}
          {testimonials.length > 0 && (
            <Section id="testimonials" title="Hear from our learners">
              <TestimonialsCarousel testimonials={testimonials} />
            </Section>
          )}

          {/* FAQs */}
          {faqs.length > 0 && (
            <Section id="faqs" title="Frequently Asked Questions">
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left font-semibold text-sm hover:bg-muted/40">
                      <span>{f.q}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition ${openFaq === i ? "rotate-180" : ""}`} />
                    </button>
                    {openFaq === i && <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line">{f.a}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Lead capture #2 - bottom banner after FAQs */}
          <LeadCaptureForm
            variant="banner"
            title={`🚀 Ready to join ${program.title}?`}
            subtitle="Seats fill fast. Talk to a counsellor and lock your spot today."
            source={`premium_program_bottom_${program.slug}`}
          />
        </div>

        {/* 2026 - Sticky Decision Rail */}
        <aside className="lg:sticky lg:top-20 h-fit space-y-3">
          <PremiumDecisionRail
            program={program}
            discountedPrice={discountedPrice}
            emi={emi}
            formatPrice={formatPrice}
            onApply={() => openLead("apply")}
            onBrochure={() => openLead("brochure")}
            onCounsel={() => openLead("counsel")}
          />
        </aside>

      </main>

      {/* MOBILE STICKY BOTTOM CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-background/95 backdrop-blur border-t border-border p-3 flex items-center gap-2 shadow-2xl">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Starts at</p>
          <p className="text-base font-extrabold text-primary leading-tight">{formatPrice(emi)}/mo</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => openLead("brochure")}>
          <Download className="w-4 h-4" />
        </Button>
        <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 flex-1" onClick={() => openLead("apply")}>Apply Now</Button>
      </div>

      <AlsoCheckSection />
      <Footer />

      <LeadGateDialog
        open={showLead}
        onOpenChange={setShowLead}
        forceShow
        simple={leadIntent !== "counsel"}
        title={
          leadIntent === "brochure"
            ? `📘 Download ${program.title} brochure`
            : leadIntent === "apply"
              ? `🚀 Apply for ${program.title}`
              : `🎓 Talk to a counsellor`
        }
        subtitle={
          leadIntent === "brochure"
            ? "Enter your details - brochure will open instantly."
            : leadIntent === "apply"
              ? "Share your details to start your application."
              : "Fill the form - counsellor will share batch, fees & next steps."
        }
        source={`premium_program_${program.slug}_${leadIntent}`}
        onSuccess={handleLeadSuccess}
      />
      {(() => {
        const raw = program.contact_phone || fallbackPhone;
        if (!raw) return null;
        const phone = String(raw).replace(/[^\d+]/g, "");
        return (
          <a
            href={`tel:${phone}`}
            className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95 bg-[hsl(214_95%_50%)] text-white"
            aria-label="Call counsellor"
          >
            <Phone className="w-7 h-7 fill-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background" />
            </span>
          </a>
        );
      })()}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 data-h className="text-xl md:text-2xl font-bold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center">
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 text-center">
      <p className="text-lg md:text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
function PersonCard({ person, variant = "faculty" }: { person: { name: string; title?: string; photo?: string; linkedin_url?: string; company?: string; gender?: string }; variant?: "faculty" | "career" }) {
  return (
    <div className="snap-start min-w-[200px] max-w-[200px] flex-shrink-0 bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/40 hover:shadow-lg transition group">
      <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-muted mb-2 ring-2 ring-primary/20 group-hover:ring-primary/50 transition">
        {person.photo
          ? <img src={person.photo} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
          : <ProfessionalAvatar seed={person.name} gender={person.gender} variant={variant} className="w-full h-full" />}
      </div>
      <p className="font-serif font-semibold text-[14px] text-foreground line-clamp-2 leading-snug">{person.name}</p>
      {person.title && <p className="text-xs text-primary font-medium mt-0.5 line-clamp-1">{person.title}</p>}
      {person.company && <p className="text-[11px] text-muted-foreground italic line-clamp-1">{person.company}</p>}
      {person.linkedin_url && (
        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded-full px-2 py-0.5 border border-[#0A66C2]/20 transition">
          <Linkedin className="w-3 h-3" /> LinkedIn
        </a>
      )}
    </div>
  );
}

function PersonRow({ heading, people, variant }: { heading: string; people: any[]; variant: "faculty" | "career" }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
        <div className="hidden sm:flex gap-1">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={() => scroll(-1)} aria-label="Previous"><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={() => scroll(1)} aria-label="Next"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin px-1">
        {people.map((p, i) => <PersonCard key={i} person={p} variant={variant} />)}
      </div>
    </div>
  );
}

function TestimonialsCarousel({ testimonials }: { testimonials: Array<{ name: string; quote: string; role?: string; photo?: string; company?: string }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  return (
    <div className="relative">
      <div className="hidden sm:flex justify-end gap-1 mb-2">
        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={() => scroll(-1)} aria-label="Previous"><ChevronLeft className="w-4 h-4" /></Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-full" onClick={() => scroll(1)} aria-label="Next"><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin px-1">
        {testimonials.map((t, i) => (
          <figure key={i} className="bg-card border border-border rounded-2xl p-4 snap-start flex-shrink-0 w-[300px] sm:w-[340px]">
            <blockquote className="text-sm italic text-foreground/90 mb-3 line-clamp-5">"{t.quote}"</blockquote>
            <figcaption className="flex items-center gap-2">
              {t.photo ? <img src={t.photo} alt={t.name} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{t.name?.[0] || "?"}</div>}
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                {(t.role || t.company) && <p className="text-[11px] text-muted-foreground">{[t.role, t.company].filter(Boolean).join(" · ")}</p>}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
