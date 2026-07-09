import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { buildExamHref } from "@/lib/entityUrls";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { Calendar, Users, FileText, Award, Building, BookOpen, CheckCircle, Clock, Newspaper, CreditCard, MapPin, ClipboardList, ExternalLink, Globe, AlertCircle, Download, Sparkles, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { AuthorByline } from "@/components/AuthorByline";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { ScrollSpy, type ScrollSection } from "@/components/ScrollSpy";
import { FAQSection } from "@/components/FAQSection";
import { buildDefaultFaqs } from "@/lib/defaultFaqs";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { useDbExam } from "@/hooks/useExamsData";
import { WhatsNewSection } from "@/components/WhatsNewSection";
import { UsefulLinks } from "@/components/UsefulLinks";
import { YouTubeVideoButton } from "@/components/YouTubeVideoButton";
import { LatestNewsSection } from "@/components/detail/LatestNewsSection";
import { DownloadGate } from "@/components/study/DownloadGate";
import { findStrategyBySlug, EXAM_STRATEGIES } from "@/lib/examStrategies";
import { RichText } from "@/components/detail/RichText";
import { RichSection } from "@/components/detail/RichSection";
import { PageSummary } from "@/components/detail/PageSummary";
import { LinkedColleges } from "@/components/detail/LinkedColleges";
import { LinkedSyllabus } from "@/components/detail/LinkedSyllabus";
import { ExamTrustBento } from "@/components/detail/ExamTrustBento";
import { ExamAIInsight } from "@/components/detail/ExamAIInsight";
import { ExamDecisionRail } from "@/components/detail/ExamDecisionRail";
import { trackEvent } from "@/lib/analytics";

const EXAM_SECTIONS: ScrollSection[] = [
  { id: "overview", label: "Overview" },
  { id: "highlights", label: "Highlights" },
  { id: "dates", label: "Important Dates" },
  { id: "application", label: "Application" },
  { id: "eligibility", label: "Eligibility" },
  { id: "syllabus", label: "Syllabus" },
  { id: "pattern", label: "Exam Pattern" },
  { id: "preparation", label: "Preparation" },
  { id: "admit-card", label: "Admit Card" },
  { id: "answer-key", label: "Answer Key" },
  { id: "results", label: "Results" },
  { id: "counselling", label: "Counselling" },
  { id: "cutoff", label: "Cut Off" },
  { id: "colleges", label: "Top Colleges" },
  { id: "faq", label: "Q&A" },
];

export default function ExamDetail() {
  const { slug, tab } = useParams<{ slug: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: exam, isLoading } = useDbExam(slug);
  const strategy = findStrategyBySlug(tab);

  // Canonicalize to slug-with-id URL once exam resolves
  useEffect(() => {
    if (!exam?.slug || !(exam as any).short_id) return;
    const canonical = buildExamHref(exam as any);
    const tabMatch = location.pathname.match(/\/exams\/[^/]+(\/[^/?#]+)?/);
    const tail = tabMatch?.[1] || "";
    const desired = `${canonical}${tail}`;
    if (location.pathname !== desired) {
      navigate(`${desired}${location.search}${location.hash}`, { replace: true });
    }
  }, [exam, location.pathname, location.search, location.hash, navigate]);
  const year = new Date().getFullYear();

  const [gateOpen, setGateOpen] = useState(false);
  const [gateFile, setGateFile] = useState<{ url: string; name: string; source: string } | null>(null);
  const openGate = (url: string, name: string, source: string) => {
    if (!url || url === "#") return;
    setGateFile({ url, name, source });
    setGateOpen(true);
  };

  useSEO({
    title: exam ? (
      strategy ? strategy.metaTitle(exam.name, year)
      : (exam.meta_title || `${exam.name} ${year} - Dates, Syllabus, Preparation`)
    ) : undefined,
    description: exam ? (
      strategy ? strategy.metaDescription(exam.name, year)
      : (exam.meta_description || `${exam.name} ${year} exam dates, syllabus, preparation tips, cutoff`)
    ) : undefined,
    keywords: exam?.meta_keywords || undefined,
  });

  // Scroll to relevant section when arriving via strategy slug
  useEffect(() => {
    if (!strategy || !exam) return;
    const t = setTimeout(() => {
      document.getElementById(strategy.focusSection)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => clearTimeout(t);
  }, [strategy?.slug, exam?.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Exam Not Found</h1>
          <p className="text-muted-foreground mb-6">The exam you're looking for doesn't exist.</p>
          <Link to="/exams"><Button className="gradient-primary text-primary-foreground rounded-xl">Browse All Exams</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="exams" itemSlug={slug} />

      <main className="container px-3 md:px-6 py-4 md:py-6">
        <PageBreadcrumb items={[
          { label: "Exams", href: "/exams" },
          { label: exam.name, href: `/exams/${exam.slug}` },
          ...(strategy ? [{ label: strategy.label }] : []),
        ]} />

        {strategy && (
          <motion.section
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-5"
            aria-labelledby="strategy-heading"
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold uppercase tracking-wide mb-2">
              <Sparkles className="w-3 h-3" /> Strategy Hub
            </div>
            <h1 id="strategy-heading" className="text-xl md:text-2xl font-bold text-foreground">
              {strategy.h1(exam.name, year)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">{strategy.intro(exam.name, year)}</p>
            <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
              {strategy.bullets(exam.name).map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" /> {b}
                </li>
              ))}
            </ul>
            {exam.sample_paper_url && exam.sample_paper_url !== "#" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-xl text-xs gap-1"
                  onClick={() => openGate(exam.sample_paper_url, `${exam.name}-${strategy.slug}.pdf`, `exam_strategy_${strategy.slug}_${exam.slug}`)}>
                  <FileDown className="w-3.5 h-3.5" /> Download Free PDF
                </Button>
                <Link to={`/exams/${exam.slug}`}>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs">View full {exam.short_name || exam.name} guide</Button>
                </Link>
              </div>
            )}
          </motion.section>
        )}
        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border overflow-hidden mb-0">
          <div className="relative">
            <img src={exam.image} alt={exam.name} className="w-full h-48 md:h-56 object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
            {(exam as any).logo && (
              <div className="absolute left-4 -bottom-6 md:left-6 md:-bottom-8 w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-card border border-border shadow-md p-1.5 flex items-center justify-center overflow-hidden">
                <img src={(exam as any).logo} alt={`${exam.name} logo`} className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          <div className={`p-4 md:p-6 ${(exam as any).logo ? "pt-10 md:pt-12" : ""}`}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-primary/90 text-primary-foreground text-xs">{exam.category}</Badge>
              <Badge className="bg-accent/90 text-accent-foreground text-xs">{exam.level}</Badge>
              <Badge className={`text-xs ${exam.status === "Applications Open" ? "bg-success/90 text-success-foreground" : "bg-muted text-muted-foreground"}`}>{exam.status}</Badge>
            </div>
            <h1 data-h className="text-xl md:text-2xl font-bold text-foreground mb-1">{exam.name} {new Date().getFullYear()}</h1>
            <p className="text-sm text-muted-foreground mb-2">{exam.full_name}</p>

            <div className="mb-3"><AuthorByline authorId={(exam as any).author_id} /></div>
            <div className="flex items-center gap-2 flex-wrap">
              {exam.registration_url && exam.registration_url !== "#" ? (
                <a
                  href={exam.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Apply Now", exam_slug: exam.slug }); } catch {} }}
                >
                  <Button size="sm" className="rounded-xl text-xs gap-1 !bg-[#e85d3a] hover:!bg-[#d14b2d] !text-white font-bold shadow-lg shadow-orange-200/60 h-10 px-4"><ExternalLink className="w-3.5 h-3.5" />Apply Now</Button>
                </a>
              ) : (
                <Button size="sm" className="rounded-xl text-xs gap-1 !bg-[#e85d3a] hover:!bg-[#d14b2d] !text-white font-bold shadow-lg shadow-orange-200/60 h-10 px-4"
                  onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Apply Now", exam_slug: exam.slug }); } catch {}; openGate("#", `${exam.name}-application.pdf`, `exam_apply_${exam.slug}`); }}>
                  <ExternalLink className="w-3.5 h-3.5" />Apply Now
                </Button>
              )}
              <Button
                size="sm" variant="outline" className="rounded-xl text-xs gap-1 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 h-10 px-4 font-bold"
                onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Sample Papers", exam_slug: exam.slug }); } catch {}; openGate(exam.sample_paper_url || "#", `${exam.name}-sample-paper.pdf`, `exam_sample_${exam.slug}`); }}
              >
                <Download className="w-3.5 h-3.5" />Sample Papers
              </Button>
              {exam.website && exam.website !== "#" && (
                <a href={exam.website} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackEvent("cta_click", { page: "exam", cta: "Official Website", exam_slug: exam.slug }); } catch {} }}>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1 h-10"><Globe className="w-3.5 h-3.5" />Official Website</Button>
                </a>
              )}
              <YouTubeVideoButton url={(exam as any).youtube_video_url} category="exam" title={`${exam.name} Guide`} label={`Watch ${exam.name} Video`} className="h-10 rounded-xl text-xs" />
              <YouTubeVideoButton url={(exam as any).how_to_apply_video_url} fallbackKey="how_to_apply_exam" category="exam" title={`How to Apply ${exam.name}`} label={`How to Apply ${exam.name}`} className="h-10 rounded-xl text-xs" />
            </div>
          </div>
        </motion.div>

        {/* 2026 Trust bento + AI insight */}
        <div className="mt-4 space-y-4 md:space-y-5">
          <ExamTrustBento exam={exam} />
          <ExamAIInsight exam={exam} />
        </div>

        <ScrollSpy sections={EXAM_SECTIONS} baseUrl={buildExamHref(exam as any)} updateUrlOnScroll className="mt-6 mb-6 -mx-4 px-4 md:mx-0 md:px-0 rounded-none md:rounded-xl" />

        <div className="mb-6">
          <WhatsNewSection entityName={exam.name} entityType="exam" entitySlug={exam.slug} category={exam.category} />
        </div>


        <div className="lg:hidden mb-6">
          <ExamDecisionRail
            exam={exam}
            onDownloadSample={() =>
              openGate(exam.sample_paper_url || "#", `${exam.name}-sample-paper.pdf`, `exam_rail_sample_${exam.slug}`)
            }
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PageSummary html={(exam as any).page_summary} entityName={exam.name} kind="exam" />
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Calendar, label: "Exam Date", value: exam.exam_date, color: "text-primary" },
                { icon: Users, label: "Applicants", value: exam.applicants, color: "text-accent" },
                { icon: Award, label: "Mode", value: exam.mode, color: "text-golden" },
                { icon: Clock, label: "Duration", value: exam.duration, color: "text-success" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card rounded-xl border border-border p-3 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                  <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Previous Year Papers - highlighted, gated download */}
            <section id="previous-papers" className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-5 scroll-mt-32">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3 relative">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10.5px] font-bold uppercase tracking-wide mb-1.5">
                    <FileDown className="w-3 h-3" /> Free PDF
                  </div>
                  <h2 data-h className="text-lg md:text-xl font-bold text-foreground">Previous Year Question Papers</h2>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Download {exam.name} PYQ PDFs (last 5 years) with detailed solutions. 100% free.</p>
                </div>
                {exam.sample_paper_url && exam.sample_paper_url !== "#" && (
                  <Button size="sm" className="rounded-xl text-xs gap-1 shrink-0"
                    onClick={() => openGate(exam.sample_paper_url, `${exam.name}-sample-paper.pdf`, `exam_pyp_hero_${exam.slug}`)}>
                    <Download className="w-3.5 h-3.5" /> Download Sample Paper
                  </Button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 relative">
                {[year - 1, year - 2, year - 3, year - 4, year - 5].map((y) => {
                  const url = exam.sample_paper_url || "#";
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => openGate(url, `${exam.name}-${y}-question-paper.pdf`, `exam_pyp_${y}_${exam.slug}`)}
                      className="flex items-center gap-2 p-2.5 bg-card hover:bg-primary/5 rounded-xl border border-border hover:border-primary/40 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <FileDown className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{exam.name} {y} Question Paper</p>
                        <p className="text-[10px] text-muted-foreground">PDF download</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Overview */}
            <RichSection id="overview" title={<>About</>} defaultOpen>
              {exam.summary_content && <RichText html={exam.summary_content} />}
              <RichText html={exam.description} />
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: "Full Name", value: exam.full_name },
                  { label: "Conducting Body", value: "NTA" },
                  { label: "Category", value: exam.category },
                  { label: "Level", value: exam.level },
                  { label: "Exam Type", value: exam.exam_type },
                  { label: "Mode", value: exam.mode },
                  { label: "Language", value: exam.language },
                  { label: "Duration", value: exam.duration },
                  { label: "Frequency", value: exam.frequency },
                  { label: "Application Mode", value: exam.application_mode },
                  { label: "Seats", value: exam.seats || "Varies" },
                  { label: "Negative Marking", value: exam.negative_marking ? "Yes" : "No" },
                ].map((info) => (
                  <div key={info.label} className="flex justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{info.label}</span>
                    <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{info.value}</span>
                  </div>
                ))}
              </div>
            </RichSection>

            {/* Highlights */}
            <RichSection id="highlights" title={<>Key Highlights</>}>
              <div className="space-y-2">
                {[
                  `${exam.name} is conducted by NTA (National Testing Agency)`,
                  `Mode of exam: ${exam.mode}`,
                  `Exam duration: ${exam.duration}`,
                  `Available in ${exam.language}`,
                  `Frequency: ${exam.frequency}`,
                  exam.negative_marking ? "Negative marking applicable" : "No negative marking",
                  `Total applicants: ${exam.applicants}`,
                ].map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{h}</span>
                  </div>
                ))}
              </div>
            </RichSection>

            {/* Important Dates */}
            <RichSection id="dates" title={<>Important Dates</>}>
              {exam.dates_content && <RichText html={exam.dates_content} />}
              <div className="space-y-0">
                {(exam.important_dates && exam.important_dates.length > 0 ? exam.important_dates : [
                  { event: "Application Start", date: exam.application_start_date || "TBA" },
                  { event: "Application End", date: exam.application_end_date || "TBA" },
                  { event: "Exam Date", date: exam.exam_date },
                  { event: "Result Date", date: exam.result_date || "TBA" },
                ]).map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground font-medium">{d.event}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">{d.date}</span>
                  </div>
                ))}
              </div>
            </RichSection>

            {/* Application Form */}
            <RichSection id="application" title={<>Application Form</>}>
              {exam.application_process ? (
                <RichText html={exam.application_process} />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">Apply online through the official {exam.name} website.</p>
              )}
              {exam.cast_wise_fee && (
                <div className="bg-muted rounded-xl p-4 mt-3">
                  <h3 data-h className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4" />Application Fee</h3>
                  <RichText html={exam.cast_wise_fee} />
                </div>
              )}
              {exam.registration_url && exam.registration_url.trim() && exam.registration_url !== "#" && (
                <div className="mt-3">
                  <a href={exam.registration_url} target="_blank" rel="noopener noreferrer">
                    <Button className="rounded-xl gap-1"><ExternalLink className="w-4 h-4" />Apply Now on Official Website</Button>
                  </a>
                </div>
              )}
            </RichSection>

            <DynamicAdBanner variant="horizontal" position="mid-page" page="exams" itemSlug={slug} />
            <LeadCaptureForm variant="inline" title={`📞 Get ${exam.name} preparation guidance`} source={`exam_inline_${exam.slug}`} interestedExamSlug={exam.slug} />

            {/* Eligibility */}
            <RichSection id="eligibility" title={<>Eligibility Criteria</>}>
              {exam.eligibility && <RichText html={exam.eligibility} />}
              {exam.age_limit && (
                <div className="mt-3 bg-muted rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">Age Limit: {exam.age_limit}</span>
                </div>
              )}
              {exam.gender_wise && (
                <div className="mt-2 bg-muted rounded-xl p-3">
                  <RichText html={exam.gender_wise} />
                </div>
              )}
            </RichSection>

            {/* Syllabus */}
            <RichSection id="syllabus" title={<>Syllabus</>}>
              <div className="flex flex-wrap gap-2">
                {exam.syllabus.map((s) => (
                  <Badge key={s} variant="secondary" className="text-sm py-1.5 px-3">{s}</Badge>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <LinkedSyllabus
                  classes={(exam as any).linked_school_classes || []}
                  subjectIds={(exam as any).linked_college_subjects || []}
                />
              </div>
            </RichSection>

            {/* Pattern */}
            <RichSection id="pattern" title={<>Exam Pattern</>}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Mode", value: exam.mode },
                  { label: "Duration", value: exam.duration },
                  { label: "Language", value: exam.language },
                  { label: "Negative Marking", value: exam.negative_marking ? "Yes (-1)" : "No" },
                ].map((item) => (
                  <div key={item.label} className="bg-muted rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              {exam.exam_pattern && <RichText html={exam.exam_pattern} />}
            </RichSection>

            {/* Preparation */}
            <RichSection id="preparation" title={<>Preparation Tips</>}>
              {exam.preparation_tips ? (
                <RichText html={exam.preparation_tips} />
              ) : (
                <div className="space-y-3">
                  {[
                    "Start with NCERT/standard textbooks to build strong fundamentals",
                    "Create a realistic study schedule and stick to it daily",
                    "Practice previous year question papers and mock tests regularly",
                    "Focus on weak areas and revise frequently",
                    "Join a reputed coaching or online course for structured preparation",
                    "Stay updated with exam notifications and syllabus changes",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </RichSection>

            <DynamicAdBanner variant="horizontal" position="mid-page" page="exams" itemSlug={slug} />

            {/* Admit Card */}
            <section id="admit-card" className="bg-card rounded-2xl border border-border p-5 scroll-mt-32">
              <h2 data-h className="text-xl font-extrabold text-foreground mb-3 tracking-tight">Admit Card</h2>
              {exam.center_content ? (
                <RichText html={exam.center_content} />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The {exam.name} admit card will be available for download from the official website. Candidates must carry a valid photo ID along with the printed admit card to the exam center.
                </p>
              )}
            </section>

            {/* Answer Key */}
            <section id="answer-key" className="bg-card rounded-2xl border border-border p-5 scroll-mt-32">
              <h2 data-h className="text-xl font-extrabold text-foreground mb-3 tracking-tight">Answer Key</h2>
              {exam.question_paper ? (
                <RichText html={exam.question_paper} />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The provisional answer key for {exam.name} will be released on the official website after the exam. Candidates can challenge the answer key within the specified window.
                </p>
              )}
            </section>

            {/* Results */}
            <RichSection id="results" title={<>Results</>}>
              {exam.result_content ? (
                <RichText html={exam.result_content} />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {exam.name} results will be declared on {exam.result_date || "the official website"}. Candidates can check their scores and download scorecards.
                </p>
              )}
            </RichSection>

            {/* Counselling */}
            <RichSection id="counselling" title={<>Counselling</>}>
              {exam.counselling_content ? (
                <RichText html={exam.counselling_content} />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  After results, qualified candidates can participate in the {exam.name} counselling process for seat allocation.
                </p>
              )}
            </RichSection>

            {/* Cut Off */}
            <RichSection id="cutoff" title={<>Cut Off</>}>
              {exam.cutoff_content ? (
                <RichText html={exam.cutoff_content} />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">Cut-off scores for {exam.name} vary by category and year.</p>
              )}
            </RichSection>

            {/* Accepting Colleges - always open per spec */}
            <RichSection id="colleges" title={<>Top Colleges Accepting this Exam</>} collapsible={false} defaultOpen>
              <LinkedColleges by="exam" slug={exam.slug} fallbackNames={exam.top_colleges || []} />
            </RichSection>

            {/* News section removed per request */}

            {/* FAQ */}
            <section id="faq" className="scroll-mt-32">
              <FAQSection
                page="exams"
                itemSlug={slug}
                title={`FAQs`}
                fallback={buildDefaultFaqs("exam", {
                  name: exam.name,
                  exam_date: (exam as any).exam_date,
                  conducting_body: (exam as any).conducting_body,
                  eligibility: (exam as any).eligibility,
                })}
              />
            </section>



            <LatestNewsSection entityType="exam" entitySlug={exam.slug} entityName={exam.name} />

            <LeadCaptureForm variant="inline" title={`Get preparation tips for ${exam.name}`} source={`exam_detail_${exam.slug}`} interestedExamSlug={exam.slug} />

            {/* Useful Links */}
            <UsefulLinks
              type="exam"
              name={exam.name}
              shortName={exam.short_name}
              slug={exam.slug}
              category={exam.category}
              sections={EXAM_SECTIONS}
            />
          </div>

          <aside className="hidden lg:block">
            <div className="space-y-4 sticky top-20">
              <ExamDecisionRail
                exam={exam}
                onDownloadSample={() =>
                  openGate(exam.sample_paper_url || "#", `${exam.name}-sample-paper.pdf`, `exam_rail_sample_${exam.slug}`)
                }
              />

              {/* Upcoming Exams */}
              <div className="bg-card rounded-2xl border border-border p-4">
                <h3 data-h className="text-sm font-bold text-foreground mb-3">📅 Upcoming Exams</h3>
                <div className="space-y-2">
                  {[`JEE Main ${new Date().getFullYear()}`, `NEET UG ${new Date().getFullYear()}`, `CAT ${new Date().getFullYear()}`, `GATE ${new Date().getFullYear()}`, `CLAT ${new Date().getFullYear()}`].map((e) => (
                    <Link key={e} to={`/exams/${e.toLowerCase().replace(/\s+/g, "-")}`} className="block text-xs text-primary hover:underline py-1 border-b border-border last:border-0">{e}</Link>
                  ))}
                </div>
              </div>

              {/* Previous Year Papers (sidebar mirror) */}
              {exam.sample_paper_url && (
                <div className="bg-card rounded-2xl border border-border p-4">
                  <h3 data-h className="text-sm font-bold text-foreground mb-3">📄 Previous Year Papers</h3>
                  <div className="space-y-2">
                    {[year - 1, year - 2, year - 3].map((y) => (
                      <button key={y} type="button"
                        onClick={() => openGate(exam.sample_paper_url, `${exam.name}-${y}-paper.pdf`, `exam_pyp_side_${y}_${exam.slug}`)}
                        className="flex items-center justify-between w-full py-1.5 border-b border-border last:border-0 hover:text-primary text-left">
                        <span className="text-xs text-foreground">{exam.name} {y} Paper</span>
                        <Download className="w-3.5 h-3.5 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* News & Updates */}
              <div className="bg-card rounded-2xl border border-border p-4">
                <h3 data-h className="text-sm font-bold text-foreground mb-3">📰 News & Updates</h3>
                <div className="space-y-2">
                  {[`${exam.name} ${new Date().getFullYear()} registration opens`, `${exam.name} syllabus updated`, `${exam.name} mock tests available`].map((n) => (
                    <p key={n} className="text-xs text-muted-foreground py-1 border-b border-border last:border-0">{n}</p>
                  ))}
                </div>
              </div>

              <DynamicAdBanner variant="vertical" position="sidebar" page="exams" itemSlug={slug} />
            </div>
          </aside>
        </div>

        <div className="mt-10">
          <LeadCaptureForm variant="banner" title={`📝 Preparing for ${exam.name}? Get expert strategy for free!`} subtitle="Our mentors have helped thousands score top ranks" source={`exam_detail_bottom_${exam.slug}`} interestedExamSlug={exam.slug} />
        </div>
      </main>

      <AlsoCheckSection />
      <Footer />
      <FloatingBot />
      <MobileBottomBar type="exam" slug={exam.slug} sections={EXAM_SECTIONS} />
      {gateFile && (
        <DownloadGate
          open={gateOpen}
          onOpenChange={setGateOpen}
          fileUrl={gateFile.url}
          fileName={gateFile.name}
          source={gateFile.source}
          meta={{ exam: exam.slug, strategy: strategy?.slug }}
        />
      )}
    </div>
  );
}
