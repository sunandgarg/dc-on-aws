import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { buildCourseHref } from "@/lib/entityUrls";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Building,
  TrendingUp,
  BookOpen,
  CheckCircle,
  Briefcase,
  FileText,
  IndianRupee,
  GraduationCap,
  Newspaper,
  Award,
  Star,
  ExternalLink,
  Download,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { AuthorByline } from "@/components/AuthorByline";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { LinkedColleges } from "@/components/detail/LinkedColleges";
import { LinkedSyllabus } from "@/components/detail/LinkedSyllabus";
import { FAQSection } from "@/components/FAQSection";
import { buildDefaultFaqs } from "@/lib/defaultFaqs";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { useDbCourse } from "@/hooks/useCoursesData";
import { WhatsNewSection } from "@/components/WhatsNewSection";
import { UsefulLinks } from "@/components/UsefulLinks";
import { PageSummary } from "@/components/detail/PageSummary";
import { YouTubeVideoButton } from "@/components/YouTubeVideoButton";
import { CareerScopeCarousel } from "@/components/detail/CareerScopeCarousel";
import { LatestNewsSection } from "@/components/detail/LatestNewsSection";
import { PlacementCompaniesSection } from "@/components/detail/PlacementCompaniesSection";
import { RichText } from "@/components/detail/RichText";
import { RichSection } from "@/components/detail/RichSection";
import { ScrollSpy } from "@/components/ScrollSpy";
import { CourseTrustBento } from "@/components/detail/CourseTrustBento";
import { CourseAIInsight } from "@/components/detail/CourseAIInsight";
import { CourseDecisionRail } from "@/components/detail/CourseDecisionRail";
import { trackEvent } from "@/lib/analytics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";

type ScrollSection = { id: string; label: string };

const COURSE_SECTIONS: ScrollSection[] = [
  { id: "overview", label: "Overview" },
  { id: "highlights", label: "Highlights" },
  { id: "eligibility", label: "Eligibility" },
  { id: "syllabus", label: "Syllabus" },
  { id: "fees", label: "Fees" },
  { id: "admission", label: "Admission" },
  { id: "career", label: "Career Scope" },
  { id: "placements", label: "Placements" },
  { id: "specializations", label: "Specializations" },
  { id: "top-exams", label: "Entrance Exams" },
  { id: "top-colleges", label: "Top Colleges" },
  { id: "cutoff", label: "Cut Off" },
  { id: "faq", label: "Q&A" },
];

/**
 * SafeScrollNav - purely observes which section is in view using IntersectionObserver.
 * NEVER calls scrollTo / scrollIntoView / window.scroll.
 * Clicking a tab uses a plain href anchor - browser handles it natively.
 */
function SafeScrollNav({ sections }: { sections: ScrollSection[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const userScrolling = useRef(false);

  useEffect(() => {
    // IntersectionObserver only READS scroll position - never writes it
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  const handleClick = (id: string) => {
    // Use native anchor scroll - no JS scrollTo
    setActiveId(id);
  };

  return (
    <div className="sticky top-14 md:top-16 z-30 bg-background/95 backdrop-blur border-b border-border mb-6">
      <div className="flex overflow-x-auto scrollbar-none gap-0 px-1 py-1">
        {sections.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => handleClick(id)}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeId === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: course, isLoading } = useDbCourse(slug);
  const [leadOpen, setLeadOpen] = useState<null | "apply" | "talk" | "syllabus">(null);

  // Canonicalize to slug-with-id URL once course resolves
  useEffect(() => {
    if (!course?.slug || !(course as any).short_id) return;
    const canonical = buildCourseHref(course as any);
    const tabMatch = location.pathname.match(/\/courses\/[^/]+(\/[^/?#]+)?/);
    const tail = tabMatch?.[1] || "";
    const desired = `${canonical}${tail}`;
    if (location.pathname !== desired) {
      navigate(`${desired}${location.search}${location.hash}`, { replace: true });
    }
  }, [course, location.pathname, location.search, location.hash, navigate]);



  // SCROLL GUARD: Intercept any programmatic window.scrollTo / scrollBy calls
  // that fight the user's manual scroll. Preserves only anchor-hash navigation.
  useEffect(() => {
    const originalScrollTo = window.scrollTo.bind(window);
    const originalScrollBy = window.scrollBy.bind(window);
    let lastUserScroll = 0;

    const onUserScroll = () => {
      lastUserScroll = Date.now();
    };
    window.addEventListener("scroll", onUserScroll, { passive: true });
    window.addEventListener("touchstart", onUserScroll, { passive: true });

    // Block programmatic scrolls that happen within 1s of user interaction
    (window as any).scrollTo = (...args: any[]) => {
      if (Date.now() - lastUserScroll < 1000) return; // user is scrolling - block
      originalScrollTo(...args);
    };
    (window as any).scrollBy = (...args: any[]) => {
      if (Date.now() - lastUserScroll < 1000) return;
      originalScrollBy(...args);
    };

    return () => {
      (window as any).scrollTo = originalScrollTo;
      (window as any).scrollBy = originalScrollBy;
      window.removeEventListener("scroll", onUserScroll);
      window.removeEventListener("touchstart", onUserScroll);
    };
  }, []);

  useSEO({
    title: course ? course.meta_title || `${course.name} Course - Fees, Colleges, Career ${new Date().getFullYear()}` : undefined,
    description: course
      ? course.meta_description || `${course.name} course details - fees, top colleges, career scope for ${new Date().getFullYear()}`
      : undefined,
    keywords: course?.meta_keywords || undefined,
  });

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

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Course Not Found</h1>
          <p className="text-muted-foreground mb-6">The course you're looking for doesn't exist.</p>
          <Link to="/courses">
            <Button className="gradient-primary text-primary-foreground rounded-xl">Browse All Courses</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="courses" itemSlug={slug} />

      {/* overflow-x-hidden on <main> was the scroll-sticking culprit:
          it creates an implicit scroll container in Webkit/Blink, intercepting touch scroll.
          Removed - the root div handles horizontal overflow containment instead. */}
      <main className="container px-3 md:px-6 py-4 md:py-6 pb-24 md:pb-6 w-full">
        <PageBreadcrumb items={[{ label: "Courses", href: "/courses" }, { label: course.name }]} />

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border overflow-hidden mb-4"
        >
          <div className="relative">
            <img
              src={course.image}
              alt={course.name}
              className="w-full h-40 sm:h-48 md:h-56 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
          </div>
          <div className="p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge className="bg-primary/90 text-primary-foreground text-[10px] md:text-xs">{course.category}</Badge>
              <Badge className="bg-accent/90 text-accent-foreground text-[10px] md:text-xs">{course.level}</Badge>
              <Badge variant="secondary" className="text-[10px] md:text-xs">
                {course.duration}
              </Badge>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1 break-words leading-snug">
              {course.name}{" "}
              {course.full_name && <span className="text-muted-foreground font-medium">({course.full_name})</span>}
            </h1>
            {/* GenZ 2026: video CTA right under the title */}
            <div className="mt-2 mb-2">
              <YouTubeVideoButton
                url={(course as any).youtube_video_url}
                category="course"
                title={`${course.name} Overview`}
                label={`Watch ${course.name} Video`}
                className="h-9 rounded-full px-4 text-xs"
              />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {course.short_description || course.description?.slice(0, 120)}
            </p>
            {/* Hero action row - 2026 highlighted CTAs */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Find Best Colleges", course_slug: course.slug }); } catch {}; setLeadOpen("apply"); }}
                className="h-10 px-4 rounded-xl !bg-[#e85d3a] hover:!bg-[#d14b2d] !text-white font-bold shadow-lg shadow-orange-200/60 gap-1.5 text-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" /> Find Best Colleges
              </Button>
              <Button
                variant="outline"
                onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Talk to Counselor", course_slug: course.slug }); } catch {}; setLeadOpen("talk"); }}
                className="h-10 px-4 rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-bold text-xs"
              >
                Talk to Counselor
              </Button>
              {(course as any).syllabus_pdf_url && (course as any).syllabus_pdf_url !== "#" ? (
                <a
                  href={(course as any).syllabus_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Download Syllabus", course_slug: course.slug }); } catch {} }}
                >
                  <Button variant="outline" className="h-10 px-4 rounded-xl text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Syllabus PDF</Button>
                </a>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => { try { trackEvent("cta_click", { page: "course", cta: "Download Syllabus", course_slug: course.slug }); } catch {}; setLeadOpen("syllabus"); }}
                  className="h-10 px-4 rounded-xl text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Syllabus PDF
                </Button>
              )}
            </div>
            <div className="mt-2"><AuthorByline authorId={(course as any).author_id} /></div>
          </div>
        </motion.div>

        {/* Lead capture dialog for hero CTAs */}
        <Dialog open={leadOpen !== null} onOpenChange={(v) => !v && setLeadOpen(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5">
              <DialogTitle>
                {leadOpen === "talk" ? `Talk to a counselor about ${course.name}` :
                 leadOpen === "syllabus" ? `Get the ${course.name} syllabus` :
                 `Find best colleges for ${course.name}`}
              </DialogTitle>
            </DialogHeader>
            <div className="p-5 pt-3">
              <LeadCaptureForm
                variant="inline"
                title=""
                subtitle="Our counselor will call you back shortly"
                source={`course_hero_${leadOpen || "apply"}_${course.slug}`}
                interestedCourseSlug={course.slug}
                onSuccess={() => setLeadOpen(null)}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* 2026 Trust bento + AI insight */}
        <div className="mt-2 space-y-4 md:space-y-5">
          <CourseTrustBento course={course} />
          <CourseAIInsight course={course} />
        </div>

        <ScrollSpy sections={COURSE_SECTIONS} baseUrl={buildCourseHref(course as any)} updateUrlOnScroll className="mt-6 mb-6 -mx-4 px-4 md:mx-0 md:px-0 rounded-none md:rounded-xl" />

        <div className="mb-6">
          <WhatsNewSection
            entityName={course.name}
            entityType="course"
            entitySlug={course.slug}
            category={course.category}
          />
        </div>


        <div className="lg:hidden mb-6">
          <CourseDecisionRail course={course} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <PageSummary html={(course as any).page_summary} entityName={course.name} kind="course" />
            {/* Quick Stats - FIX: changed sm:grid-cols-4 to grid-cols-2 sm:grid-cols-4 so mobile shows 2 columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
              {[
                { icon: Clock, label: "Duration", value: course.duration, color: "text-primary" },
                { icon: Building, label: "Colleges", value: `${course.colleges_count}+`, color: "text-accent" },
                { icon: TrendingUp, label: "Growth", value: course.growth, color: "text-success" },
                { icon: Briefcase, label: "Avg Salary", value: course.avg_salary, color: "text-golden" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card rounded-xl border border-border p-3 text-center min-w-0">
                  <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                  {/* FIX: added truncate and text-xs for small screens to prevent overflow */}
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Overview */}
            <RichSection id="overview" title={<>About</>} defaultOpen>
              <RichText html={course.description} />
              {course.about_content && (
                <RichText html={course.about_content} />
              )}
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {[
                  { label: "Full Name", value: course.full_name },
                  { label: "Duration", value: course.duration },
                  { label: "Level", value: course.level },
                  { label: "Mode", value: course.mode },
                  { label: "Category", value: course.category },
                  { label: "Domain", value: course.domain || course.category },
                  { label: "Avg Fees", value: course.avg_fees },
                  { label: "Avg Salary", value: course.avg_salary },
                  { label: "Total Colleges", value: `${course.colleges_count}+` },
                  { label: "Industry Growth", value: course.growth },
                ].map((info) => (
                  <div
                    key={info.label}
                    className="flex justify-between gap-2 py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-muted-foreground shrink-0">{info.label}</span>
                    {/* FIX: added text-right break-words to prevent overflow on long values */}
                    <span className="text-sm font-medium text-foreground text-right break-words">{info.value}</span>
                  </div>
                ))}
              </div>
            </RichSection>

            {/* Highlights */}
            <RichSection id="highlights" title={<>Key Highlights</>}>
              <div className="space-y-2">
                {[
                  `${course.full_name} is a ${course.duration} ${course.level} program`,
                  `Offered at ${course.colleges_count}+ colleges across India`,
                  `Average fees: ${course.avg_fees}`,
                  `Average salary after ${course.name}: ${course.avg_salary}`,
                  `Industry growth rate: ${course.growth}`,
                  `Mode of study: ${course.mode}`,
                  `${course.specializations.length}+ specializations available`,
                ].map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{h}</span>
                  </div>
                ))}
              </div>
            </RichSection>

            {/* Eligibility */}
            <RichSection id="eligibility" title={<>Eligibility Criteria</>}>
              <p className="text-sm text-muted-foreground leading-relaxed">{course.eligibility}</p>
            </RichSection>

            {/* Syllabus */}
            <RichSection id="syllabus" title={<>Syllabus & Subjects</>}>
              {course.syllabus_content && (
                <RichText html={course.syllabus_content} />
              )}
              {(course as any).subjects_content && (
                <RichText html={(course as any).subjects_content} />
              )}
              <p className="text-sm text-muted-foreground mb-3">
                The {course.duration} program covers these core subjects:
              </p>
              <div className="flex flex-wrap gap-2">
                {course.subjects.map((s) => (
                  <Badge key={s} variant="secondary" className="text-sm py-1.5 px-3">
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <LinkedSyllabus
                  classes={(course as any).linked_school_classes || []}
                  subjectIds={(course as any).linked_college_subjects || []}
                  title="Related Syllabus & Subjects"
                />
              </div>
              {course.syllabus_pdf_url && course.syllabus_pdf_url !== "#" && (
                <div className="mt-3">
                  <a href={course.syllabus_pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1">
                      <Download className="w-3.5 h-3.5" />
                      Download Syllabus PDF
                    </Button>
                  </a>
                </div>
              )}
            </RichSection>

            <DynamicAdBanner variant="horizontal" position="mid-page" page="courses" itemSlug={slug} />

            {/* Fees */}
            <RichSection id="fees" title={<>Fee Structure</>}>
              {/* FIX: grid-cols-3 on mobile with small content is fine, but added min-w-0 and text truncation */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                <div className="bg-muted rounded-xl p-2 sm:p-3 text-center min-w-0">
                  <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-golden" />
                  <p className="text-xs sm:text-lg font-bold text-foreground truncate">{course.avg_fees}</p>
                  <p className="text-xs text-muted-foreground">Avg Fees</p>
                </div>
                {course.low_fee > 0 && (
                  <div className="bg-muted rounded-xl p-2 sm:p-3 text-center min-w-0">
                    <p className="text-xs sm:text-lg font-bold text-foreground truncate">
                      ₹{(course.low_fee / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-muted-foreground">Lowest</p>
                  </div>
                )}
                {course.high_fee > 0 && (
                  <div className="bg-muted rounded-xl p-2 sm:p-3 text-center min-w-0">
                    <p className="text-xs sm:text-lg font-bold text-foreground truncate">
                      ₹{(course.high_fee / 100000).toFixed(1)}L
                    </p>
                    <p className="text-xs text-muted-foreground">Highest</p>
                  </div>
                )}
              </div>
              {course.fees_content && <RichText html={course.fees_content} />}
            </RichSection>

            {/* Admission Process */}
            <RichSection id="admission" title={<>Admission Process {new Date().getFullYear()}</>}>
              {course.admission_process && (
                <RichText html={course.admission_process} />
              )}
              <div className="space-y-3">
                {[
                  { step: "1", title: "Eligibility Check", text: course.eligibility },
                  { step: "2", title: "Entrance Exam", text: `Clear entrance exam: ${course.top_exams.join(", ")}` },
                  { step: "3", title: "Counselling", text: "Participate in counseling/admission rounds" },
                  { step: "4", title: "Admission", text: "Complete document verification and fee payment" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {s.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="text-sm text-muted-foreground break-words">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RichSection>

            <LeadCaptureForm
              variant="inline"
              title={`📞 Get guidance for ${course.name}`}
              source={`course_inline_${course.slug}`}
              interestedCourseSlug={course.slug}
            />

            {/* Career Scope */}
            <RichSection id="career" title={<>Career Scope & Job Profiles</>}>
              {course.scope_content && <RichText html={course.scope_content} />}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {course.careers.map((c) => (
                  <Link
                    key={c}
                    to={`/careers/${c.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center gap-2 p-2.5 bg-muted hover:bg-primary/10 rounded-xl transition-colors group"
                  >
                    <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground group-hover:text-primary truncate">{c}</span>
                  </Link>
                ))}
              </div>
              <Link to="/careers" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                Explore all career profiles →
              </Link>
            </RichSection>

            {/* Placements - FIX: was grid-cols-3 on all screens; now cols-1 on mobile, cols-3 on sm+ */}
            <RichSection id="placements" title={<>Placements</>}>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                <div className="bg-muted rounded-xl p-2 sm:p-3 text-center min-w-0">
                  <p className="text-xs sm:text-lg font-bold text-foreground truncate">{course.avg_salary}</p>
                  <p className="text-xs text-muted-foreground">Avg Package</p>
                </div>
                <div className="bg-muted rounded-xl p-2 sm:p-3 text-center min-w-0">
                  <p className="text-xs sm:text-lg font-bold text-foreground truncate">{course.growth}</p>
                  <p className="text-xs text-muted-foreground">Growth</p>
                </div>
                <div className="bg-muted rounded-xl p-2 sm:p-3 text-center min-w-0">
                  <p className="text-xs sm:text-lg font-bold text-foreground truncate">{course.colleges_count}+</p>
                  <p className="text-xs text-muted-foreground">Colleges</p>
                </div>
              </div>
              {course.placements_content && (
                <RichText html={course.placements_content} />
              )}
              {course.recruiters_content && (
                <div className="mt-3">
                  <h3 data-h className="text-sm font-semibold text-foreground mb-2">Top Recruiters</h3>
                  <RichText html={course.recruiters_content} />
                </div>
              )}
            </RichSection>

            {/* Linked placement records from admin (per-course tick) */}
            <PlacementCompaniesSection courseSlug={course.slug} />

            <DynamicAdBanner variant="horizontal" position="mid-page" page="courses" itemSlug={slug} />

            {/* Specializations */}
            <RichSection id="specializations" title={<>Specializations</>}>
              {course.specialization_content && (
                <RichText html={course.specialization_content} />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {course.specializations.map((s) => (
                  <div key={s} className="flex items-center gap-2 p-3 bg-muted rounded-xl min-w-0">
                    <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{s}</span>
                  </div>
                ))}
              </div>
            </RichSection>

            {/* Top Exams - clickable links to /exams/:slug */}
            <section id="top-exams" className="bg-card rounded-2xl border border-border p-4 md:p-5 scroll-mt-20">
              <h2 data-h className="text-xl font-extrabold text-foreground mb-3 tracking-tight">Entrance Exams</h2>
              {course.top_exams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entrance exams linked yet. <Link to="/exams" className="text-primary underline">Browse all exams →</Link></p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.top_exams.map((exam) => {
                    const slug = exam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                    const display = exam.includes("-") ? exam.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : exam;
                    return (
                      <Link
                        key={exam}
                        to={`/exams/${slug}`}
                        className="group flex items-center gap-2 bg-muted hover:bg-primary/5 border border-transparent hover:border-primary/30 rounded-xl px-3 py-2.5 min-w-0 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground group-hover:text-primary truncate">{display}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Top Colleges */}
            <section id="top-colleges" className="bg-card rounded-2xl border border-border p-4 md:p-5 scroll-mt-20">
              <h2 data-h className="text-xl font-extrabold text-foreground mb-3 tracking-tight">Top Colleges</h2>
              <p className="text-sm text-muted-foreground mb-3">
                {course.colleges_count}+ colleges across India offer {course.name}. Tap any college to see fees, cut-offs and admissions.
              </p>
              <LinkedColleges by="course" slug={course.slug} emptyText={`No colleges linked to ${course.name} yet.`} />
            </section>

            {/* Cut Off - FIX: added w-full overflow-x-auto wrapper to prevent table blowout */}
            <RichSection id="cutoff" title={<>Cut Off</>}>
              {course.cutoff_content && <RichText html={course.cutoff_content} />}
              <div className="w-full overflow-x-auto -mx-0">
                <table className="w-full text-sm min-w-[280px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">College Tier</th>
                      <th className="text-right py-2 text-muted-foreground font-medium whitespace-nowrap">
                        Cut-off Range
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { tier: "Top IITs/NITs", range: "Top 1-5% ranks" },
                      { tier: "Tier-2 Colleges", range: "Top 10-20% ranks" },
                      { tier: "Private Colleges", range: "50-60% marks" },
                    ].map((c) => (
                      <tr key={c.tier} className="border-b border-border last:border-0">
                        <td className="py-2 text-foreground font-medium">{c.tier}</td>
                        <td className="py-2 text-right text-muted-foreground whitespace-nowrap">{c.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </RichSection>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-20">
              <FAQSection
                page="courses"
                itemSlug={slug}
                title={`FAQs`}
                fallback={buildDefaultFaqs("course", {
                  name: course.name,
                  duration: (course as any).duration,
                  fees: (course as any).fees,
                  eligibility: (course as any).eligibility,
                })}
              />
            </section>



            <LatestNewsSection entityType="course" entitySlug={course.slug} entityName={course.name} />

            {/* Carousel: overflow-hidden contains bleed, touch-pan-y lets vertical scroll pass through */}
            <div className="w-full overflow-hidden touch-pan-y">
              <CareerScopeCarousel courseSlug={course.slug} careers={course.careers} courseName={course.name} />
            </div>

            <LeadCaptureForm
              variant="inline"
              title={`Get admission details for ${course.name}`}
              source={`course_detail_${course.slug}`}
              interestedCourseSlug={course.slug}
            />

            {/* Useful Links */}
            <UsefulLinks
              type="course"
              name={course.name}
              shortName={course.name}
              slug={course.slug}
              category={course.category}
              sections={COURSE_SECTIONS}
            />
          </div>

          <aside className="hidden lg:block">
            <div className="space-y-4 sticky top-20">
              <CourseDecisionRail course={course} />

              {/* Other Courses */}
              <div className="bg-card rounded-2xl border border-border p-4">
                <h3 data-h className="text-sm font-bold text-foreground mb-3">📚 Other Courses</h3>
                <div className="space-y-2">
                  {["B.Tech", "MBA", "MBBS", "B.Sc", "B.Com", "LLB", "BBA", "MCA"]
                    .filter((c) => c !== course.name)
                    .slice(0, 6)
                    .map((c) => (
                      <Link
                        key={c}
                        to={`/courses/${c.toLowerCase().replace(/[\s\.]+/g, "-")}`}
                        className="block text-xs text-primary hover:underline py-1 border-b border-border last:border-0"
                      >
                        {c}
                      </Link>
                    ))}
                </div>
              </div>

              <DynamicAdBanner variant="vertical" position="sidebar" page="courses" itemSlug={slug} />
            </div>
          </aside>
        </div>

        <div className="mt-10">
          <LeadCaptureForm
            variant="banner"
            title={`🎯 Want to study ${course.name}? Get free expert guidance!`}
            subtitle="Our counselors help you pick the best college for this course"
            source={`course_detail_bottom_${course.slug}`}
            interestedCourseSlug={course.slug}
          />
        </div>
      </main>

      <AlsoCheckSection />
      <Footer />
      <FloatingBot />
      <MobileBottomBar type="course" slug={course.slug} sections={COURSE_SECTIONS} />
    </div>
  );
}
