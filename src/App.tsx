import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { hydrateBootstrap } from "@/lib/bootstrap";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompareProvider } from "@/contexts/CompareContext";
import { CompareFloatingBar } from "@/components/CompareFloatingBar";
import { LockTargetFloatingPromo } from "@/components/LockTargetFloatingPromo";

import { UserTrackingProvider } from "@/hooks/useUserTracking";
import { IntentTrackingProvider } from "@/components/IntentTrackingProvider";
import { CookieConsent } from "@/components/CookieConsent";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ScrollLockGuard } from "@/components/ScrollLockGuard";
import { lazyRetry } from "@/lib/lazyRetry";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { DeploymentUpdateCoordinator } from "@/components/DeploymentUpdateCoordinator";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { NewsCallButton } from "@/components/NewsCallButton";
import { useLocation } from "react-router-dom";

function GlobalWhatsApp() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  return <WhatsAppButton />;
}

function NewsOnlyCall() {
  const { pathname } = useLocation();
  // Show only on news listing & news article pages
  const isNews = pathname === "/news" || pathname.startsWith("/news/") || pathname === "/articles" || pathname.startsWith("/articles/");
  if (!isNews) return null;
  return <NewsCallButton />;
}
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const AllColleges = lazyRetry(() => import("./pages/AllColleges"), "AllColleges");
const ComparePage = lazyRetry(() => import("./pages/ComparePage"), "compare");
const AllCourses = lazyRetry(() => import("./pages/AllCourses"), "AllCourses");
const AllExams = lazyRetry(() => import("./pages/AllExams"), "AllExams");
const AllArticles = lazyRetry(() => import("./pages/AllArticles"), "AllArticles");
const CollegeDetail = lazyRetry(() => import("./pages/CollegeDetail"), "CollegeDetail");
const CourseDetail = lazyRetry(() => import("./pages/CourseDetail"), "CourseDetail");
const ExamDetail = lazyRetry(() => import("./pages/ExamDetail"), "ExamDetail");
const ArticleDetail = lazyRetry(() => import("./pages/ArticleDetail"), "ArticleDetail");
const Auth = lazyRetry(() => import("./pages/Auth"), "Auth");
const AdminDashboard = lazyRetry(() => import("./pages/AdminDashboard"), "AdminDashboard");
const AdminAds = lazyRetry(() => import("./pages/AdminAds"), "AdminAds");
const AdminAdDiagnostics = lazyRetry(() => import("./pages/AdminAdDiagnostics"), "AdminAdDiagnostics");
const AdminAdsense = lazyRetry(() => import("./pages/AdminAdsense"), "AdminAdsense");
const AdminFeatured = lazyRetry(() => import("./pages/AdminFeatured"), "AdminFeatured");
const AdminLeads = lazyRetry(() => import("./pages/AdminLeads"), "AdminLeads");
const AdminLeadIntelligence = lazyRetry(() => import("./pages/AdminLeadIntelligence"), "AdminLeadIntelligence");
const AdminIntentConfig = lazyRetry(() => import("./pages/AdminIntentConfig"), "AdminIntentConfig");
const AdminIntentAnalytics = lazyRetry(() => import("./pages/AdminIntentAnalytics"), "AdminIntentAnalytics");
const AdminContent = lazyRetry(() => import("./pages/AdminContent"), "AdminContent");
const AdminColleges = lazyRetry(() => import("./pages/AdminColleges"), "AdminColleges");
const AdminCourses = lazyRetry(() => import("./pages/AdminCourses"), "AdminCourses");
const AdminExams = lazyRetry(() => import("./pages/AdminExams"), "AdminExams");
const AdminArticles = lazyRetry(() => import("./pages/AdminArticles"), "AdminArticles");
const AdminDocs = lazyRetry(() => import("./pages/AdminDocs"), "AdminDocs");
const AdminBanners = lazyRetry(() => import("./pages/AdminBanners"), "AdminBanners");
const AdminHeroSettings = lazyRetry(() => import("./pages/AdminHeroSettings"), "AdminHeroSettings");
const AdminHeroCategories = lazyRetry(() => import("./pages/AdminHeroCategories"), "AdminHeroCategories");
const AdminPopupAnalytics = lazyRetry(() => import("./pages/AdminPopupAnalytics"), "AdminPopupAnalytics");
const AdminCtaConversions = lazyRetry(() => import("./pages/AdminCtaConversions"), "AdminCtaConversions");
const ToolPage = lazyRetry(() => import("./pages/ToolPage"), "ToolPage");
const AllTools = lazyRetry(() => import("./pages/AllTools"), "AllTools");
const AdminPartners = lazyRetry(() => import("./pages/AdminPartners"), "AdminPartners");
const AdminAIProviders = lazyRetry(() => import("./pages/AdminAIProviders"), "AdminAIProviders");
const AdminReferrals = lazyRetry(() => import("./pages/AdminReferrals"), "AdminReferrals");
const AdminOtpProviders = lazyRetry(() => import("./pages/AdminOtpProviders"), "AdminOtpProviders");
const AdminLogs = lazyRetry(() => import("./pages/AdminLogs"), "AdminLogs");
const AdminExplainSystem = lazyRetry(() => import("./pages/AdminExplainSystem"), "AdminExplainSystem");
const AdminEmailProviders = lazyRetry(() => import("./pages/AdminEmailProviders"), "AdminEmailProviders");
const AdminBackup = lazyRetry(() => import("./pages/AdminBackup"), "AdminBackup");
const AdminLeadPush = lazyRetry(() => import("./pages/AdminLeadPush"), "AdminLeadPush");
const AdminLeadPushHub = lazyRetry(() => import("./pages/AdminLeadPushHub"), "AdminLeadPushHub");
const AdminLeadPushV2 = lazyRetry(() => import("./pages/AdminLeadPushV2"), "AdminLeadPushV2");
const AdminMarketingAutomation = lazyRetry(() => import("./pages/AdminMarketingAutomation"), "AdminMarketingAutomation");
const News = lazyRetry(() => import("./pages/News"), "News");
const UserDashboard = lazyRetry(() => import("./pages/UserDashboard"), "UserDashboard");
const LegalPage = lazyRetry(() => import("./pages/LegalPage"), "LegalPage");
const AllCareers = lazyRetry(() => import("./pages/AllCareers"), "AllCareers");
const CareerDetail = lazyRetry(() => import("./pages/CareerDetail"), "CareerDetail");
const AdminLegalPages = lazyRetry(() => import("./pages/AdminLegalPages"), "AdminLegalPages");
const AdminSitemap = lazyRetry(() => import("./pages/AdminSitemap"), "AdminSitemap");
const AdminIntegrations = lazyRetry(() => import("./pages/AdminIntegrations"), "AdminIntegrations");
const AdminAlsoCheck = lazyRetry(() => import("./pages/AdminAlsoCheck"), "AdminAlsoCheck");
import { SiteIntegrations } from "@/components/SiteIntegrations";
import { AdsenseLoader } from "@/components/ads/AdsenseLoader";
const AdminCareers = lazyRetry(() => import("./pages/AdminCareers"), "AdminCareers");
const AdminJobs = lazyRetry(() => import("./pages/AdminJobs"), "AdminJobs");
const AllJobs = lazyRetry(() => import("./pages/AllJobs"), "AllJobs");
const JobDetail = lazyRetry(() => import("./pages/JobDetail"), "JobDetail");
const AdminApplications = lazyRetry(() => import("./pages/AdminApplications"), "AdminApplications");
const AdminJobApplications = lazyRetry(() => import("./pages/AdminJobApplications"), "AdminJobApplications");
const AdminUsers = lazyRetry(() => import("./pages/AdminUsers"), "AdminUsers");
const AdminFaculty = lazyRetry(() => import("./pages/AdminFaculty"), "AdminFaculty");
const AdminCompanies = lazyRetry(() => import("./pages/AdminCompanies"), "AdminCompanies");
const AdminPlacements = lazyRetry(() => import("./pages/AdminPlacements"), "AdminPlacements");
const AdminFacilities = lazyRetry(() => import("./pages/AdminFacilities"), "AdminFacilities");
const AdminContacts = lazyRetry(() => import("./pages/AdminContacts"), "AdminContacts");
const AdminCourseFees = lazyRetry(() => import("./pages/AdminCourseFees"), "AdminCourseFees");
const AdminPromotedPrograms = lazyRetry(() => import("./pages/AdminPromotedPrograms"), "AdminPromotedPrograms");
const AdminProgramCategories = lazyRetry(() => import("./pages/AdminProgramCategories"), "AdminProgramCategories");
const PremiumProgramDetail = lazyRetry(() => import("./pages/PremiumProgramDetail"), "PremiumProgramDetail");
const AllPremiumPrograms = lazyRetry(() => import("./pages/AllPremiumPrograms"), "AllPremiumPrograms");
const AdminPriority = lazyRetry(() => import("./pages/AdminPriority"), "AdminPriority");
const AdminBulk = lazyRetry(() => import("./pages/AdminBulk"), "AdminBulk");
const StudyMaterial = lazyRetry(() => import("./pages/StudyMaterial"), "StudyMaterial");
const Resources = lazyRetry(() => import("./pages/Resources"), "Resources");
const StudyClass = lazyRetry(() => import("./pages/StudyClass"), "StudyClass");
const StudySubject = lazyRetry(() => import("./pages/StudySubject"), "StudySubject");
const AdminStudyMaterial = lazyRetry(() => import("./pages/AdminStudyMaterial"), "AdminStudyMaterial");
const AdminCollegeStudy = lazyRetry(() => import("./pages/AdminCollegeStudy"), "AdminCollegeStudy");
const CollegeStudyMaterial = lazyRetry(() => import("./pages/CollegeStudyMaterial"), "CollegeStudyMaterial");
const CollegeProgram = lazyRetry(() => import("./pages/CollegeProgram"), "CollegeProgram");
const CollegeUniversity = lazyRetry(() => import("./pages/CollegeUniversity"), "CollegeUniversity");
const CollegeSubject = lazyRetry(() => import("./pages/CollegeSubject"), "CollegeSubject");
const AdminToppers = lazyRetry(() => import("./pages/AdminToppers"), "AdminToppers");
const AdminTagsManager = lazyRetry(() => import("./pages/AdminTagsManager"), "AdminTagsManager");
const AdminBoardLinks = lazyRetry(() => import("./pages/AdminBoardLinks"), "AdminBoardLinks");
const LandingPage = lazyRetry(() => import("./pages/LandingPage"), "LandingPage");
const AdminLandingPages = lazyRetry(() => import("./pages/AdminLandingPages"), "AdminLandingPages");
const AdminReviews = lazyRetry(() => import("./pages/AdminReviews"), "AdminReviews");
const AdminAIReports = lazyRetry(() => import("./pages/AdminAIReports"), "AdminAIReports");
const AdminApprovalBodies = lazyRetry(() => import("./pages/AdminApprovalBodies"), "AdminApprovalBodies");
const AdminCategories = lazyRetry(() => import("./pages/AdminCategories"), "AdminCategories");
const AdminArticleCategories = lazyRetry(() => import("./pages/AdminArticleCategories"), "AdminArticleCategories");
const Scholarships = lazyRetry(() => import("./pages/Scholarships"), "Scholarships");
const ScholarshipDetail = lazyRetry(() => import("./pages/ScholarshipDetail"), "ScholarshipDetail");
const AdminScholarships = lazyRetry(() => import("./pages/AdminScholarships"), "AdminScholarships");
const Onboarding = lazyRetry(() => import("./pages/Onboarding"), "Onboarding");
const AboutUs = lazyRetry(() => import("./pages/AboutUs"), "AboutUs");
const AdminAbout = lazyRetry(() => import("./pages/AdminAbout"), "AdminAbout");
const AdminAuthors = lazyRetry(() => import("./pages/AdminAuthors"), "AdminAuthors");
const AuthorPage = lazyRetry(() => import("./pages/AuthorPage"), "AuthorPage");
const AdminUserAnalytics = lazyRetry(() => import("./pages/AdminUserAnalytics"), "AdminUserAnalytics");
const AdminFunnel = lazyRetry(() => import("./pages/AdminFunnel"), "AdminFunnel");
const AdminHeatmap = lazyRetry(() => import("./pages/AdminHeatmap"), "AdminHeatmap");
const ExamCalendar = lazyRetry(() => import("./pages/ExamCalendar"), "ExamCalendar");
const EligibilityChecker = lazyRetry(() => import("./pages/EligibilityChecker"), "EligibilityChecker");
const CollegePredictor = lazyRetry(() => import("./pages/CollegePredictor"), "CollegePredictor");
const LockTarget = lazyRetry(() => import("./pages/LockTarget"), "LockTarget");
const TargetDashboard = lazyRetry(() => import("./pages/TargetDashboard"), "TargetDashboard");
const CatUniverse = lazyRetry(() => import("./pages/CatUniverse"), "CatUniverse");
const CatUniverseModulePage = lazyRetry(() => import("./pages/CatUniverseModulePage"), "CatUniverseModulePage");
const AdminCatUniverse = lazyRetry(() => import("./pages/AdminCatUniverse"), "AdminCatUniverse");


function CollegeRoute() {
  const { slug } = useParams<{ slug: string }>();
  return slug?.startsWith("top-") ? <AllColleges /> : <CollegeDetail />;
}

function CollegeNestedRoute() {
  const { slug } = useParams<{ slug: string }>();
  return slug?.startsWith("top-") ? <AllColleges /> : <CollegeDetail />;
}

function CourseRoute() {
  const { slug } = useParams<{ slug: string }>();
  return slug?.startsWith("top-") ? <AllCourses /> : <CourseDetail />;
}

function CourseNestedRoute() {
  const { slug } = useParams<{ slug: string }>();
  return slug?.startsWith("top-") ? <AllCourses /> : <CourseDetail />;
}

function ExamRoute() {
  const { slug } = useParams<{ slug: string }>();
  return slug?.startsWith("top-") ? <AllExams /> : <ExamDetail />;
}

function ExamNestedRoute() {
  const { slug } = useParams<{ slug: string }>();
  return slug?.startsWith("top-") ? <AllExams /> : <ExamDetail />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000, // 24h - needed for persistence
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Persist cache to localStorage so repeat visits paint instantly from disk.
const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined as any,
  key: "dc-rq-cache-v1",
  throttleTime: 1000,
});

function BootstrapHydrator() {
  useEffect(() => {
    // Bootstrap fetch is already kicked off at module import.
    // This just ensures any cache seeding ran before paint.
    hydrateBootstrap(queryClient);
  }, []);
  return null;
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      buster: "v1",
      // Only persist long-lived reference data - not user-specific or auth queries.
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => {
          const k = String(q.queryKey?.[0] ?? "");
          return [
            "hero-banners","hero_settings","featured-colleges","trusted-partners",
            "lead-form-settings","feature-toggles","ads","site-integration",
            "vacancies","colleges","courses","exams","articles","careers","scholarships",
            "cat-universe",
          ].some((p) => k === p || k.startsWith(p));
        },
      },
    }}
  >
    <BootstrapHydrator />

    <AuthProvider>
      <CompareProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DeploymentUpdateCoordinator />
            <ScrollToTop />
            <ScrollLockGuard />
            <UserTrackingProvider>
            <IntentTrackingProvider>
            <SiteIntegrations />
            <AdsenseLoader />
            <CompareFloatingBar />
            <LockTargetFloatingPromo />

            <CookieConsent />
            <ChunkErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/colleges" element={<AllColleges />} />
              <Route path="/colleges/:slug" element={<CollegeRoute />} />
              <Route path="/colleges/:slug/:tab" element={<CollegeNestedRoute />} />
              <Route path="/courses" element={<AllCourses />} />
              <Route path="/courses/:slug" element={<CourseRoute />} />
              <Route path="/courses/:slug/:tab" element={<CourseNestedRoute />} />
              <Route path="/exams" element={<AllExams />} />
              <Route path="/exams/:slug" element={<ExamRoute />} />
              <Route path="/exams/:slug/:tab" element={<ExamNestedRoute />} />
              <Route path="/articles" element={<News />} />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/tag/:tag" element={<News />} />
              <Route path="/news/:slug" element={<ArticleDetail />} />
              <Route path="/exam-calendar-2026" element={<ExamCalendar />} />
              <Route path="/exam-calendar" element={<ExamCalendar />} />
              <Route path="/eligibility-checker" element={<EligibilityChecker />} />
              <Route path="/eligibility-checker/:slug" element={<EligibilityChecker />} />
              <Route path="/college-predictor" element={<CollegePredictor />} />
              <Route path="/college-predictor/:slug" element={<CollegePredictor />} />
              <Route path="/cat-universe" element={<CatUniverse />} />
              <Route path="/cat-universe/:slug" element={<CatUniverseModulePage />} />
              <Route path="/lock-target" element={<LockTarget />} />
              <Route path="/lock-target/:slug" element={<LockTarget />} />
              <Route path="/achieve-target" element={<LockTarget />} />
              <Route path="/achieve-target/:slug" element={<LockTarget />} />
              <Route path="/roadmap" element={<LockTarget />} />
              <Route path="/roadmap/:slug" element={<LockTarget />} />
              <Route path="/dream-college-roadmap" element={<LockTarget />} />
              <Route path="/dream-college-roadmap/:slug" element={<LockTarget />} />
              <Route path="/target-dashboard" element={<TargetDashboard />} />
              <Route path="/my-targets" element={<TargetDashboard />} />
              <Route path="/target-with-ai" element={<TargetDashboard />} />

              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/dashboard/:tab" element={<UserDashboard />} />
              {/* Admin routes - require admin role */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/colleges" element={<ProtectedRoute module="colleges"><AdminColleges /></ProtectedRoute>} />
              <Route path="/admin/courses" element={<ProtectedRoute module="courses"><AdminCourses /></ProtectedRoute>} />
              <Route path="/admin/exams" element={<ProtectedRoute module="exams"><AdminExams /></ProtectedRoute>} />
              <Route path="/admin/ads" element={<ProtectedRoute module="ads"><AdminAds /></ProtectedRoute>} />
              <Route path="/admin/ads/diagnostics" element={<ProtectedRoute module="ads"><AdminAdDiagnostics /></ProtectedRoute>} />
              <Route path="/admin/adsense" element={<ProtectedRoute module="ads"><AdminAdsense /></ProtectedRoute>} />
              <Route path="/admin/featured" element={<ProtectedRoute module="featured"><AdminFeatured /></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute module="leads"><AdminLeads /></ProtectedRoute>} />
              <Route path="/admin/lead-push" element={<ProtectedRoute requireAdmin><AdminLeadPushV2 /></ProtectedRoute>} />
              <Route path="/admin/lead-intelligence" element={<ProtectedRoute requireAdmin><AdminLeadIntelligence /></ProtectedRoute>} />
              <Route path="/admin/lead-intelligence/config" element={<ProtectedRoute requireAdmin><AdminIntentConfig /></ProtectedRoute>} />
              <Route path="/admin/lead-intelligence/analytics" element={<ProtectedRoute requireAdmin><AdminIntentAnalytics /></ProtectedRoute>} />
              {/* Static child routes MUST be declared before the :view splat so they win the match */}
              <Route path="/admin/lead-push/automation" element={<ProtectedRoute requireAdmin><AdminMarketingAutomation /></ProtectedRoute>} />
              <Route path="/admin/marketing-automation" element={<ProtectedRoute requireAdmin><AdminMarketingAutomation /></ProtectedRoute>} />
              <Route path="/admin/lead-push/:view/*" element={<ProtectedRoute requireAdmin><AdminLeadPushV2 /></ProtectedRoute>} />
              <Route path="/admin/lead-push-legacy" element={<ProtectedRoute requireAdmin><AdminLeadPushHub /></ProtectedRoute>} />
              <Route path="/admin/lead-push-legacy/manage" element={<ProtectedRoute requireAdmin><AdminLeadPush /></ProtectedRoute>} />
              <Route path="/admin/articles" element={<ProtectedRoute module="articles"><AdminArticles /></ProtectedRoute>} />
              <Route path="/admin/content" element={<ProtectedRoute module="content"><AdminContent /></ProtectedRoute>} />
              <Route path="/admin/docs" element={<ProtectedRoute module="docs"><AdminDocs /></ProtectedRoute>} />
              <Route path="/admin/banners" element={<ProtectedRoute module="banners"><AdminBanners /></ProtectedRoute>} />
              <Route path="/admin/hero" element={<ProtectedRoute requireAdmin><AdminHeroSettings /></ProtectedRoute>} />
              <Route path="/admin/hero-categories" element={<ProtectedRoute requireAdmin><AdminHeroCategories /></ProtectedRoute>} />
              <Route path="/admin/cat-universe" element={<ProtectedRoute module="cat_universe"><AdminCatUniverse /></ProtectedRoute>} />
              <Route path="/admin/cat-universe/sections" element={<ProtectedRoute module="cat_universe"><AdminCatUniverse /></ProtectedRoute>} />
              <Route path="/admin/cat-universe/modules" element={<ProtectedRoute module="cat_universe"><AdminCatUniverse /></ProtectedRoute>} />
              <Route path="/admin/cat-universe/resources" element={<ProtectedRoute module="cat_universe"><AdminCatUniverse /></ProtectedRoute>} />
              <Route path="/admin/cat-universe/cutoffs" element={<ProtectedRoute module="cat_universe"><AdminCatUniverse /></ProtectedRoute>} />
              <Route path="/admin/popup-analytics" element={<ProtectedRoute requireAdmin><AdminPopupAnalytics /></ProtectedRoute>} />
              <Route path="/admin/cta-conversions" element={<ProtectedRoute requireAdmin><AdminCtaConversions /></ProtectedRoute>} />
              <Route path="/admin/partners" element={<ProtectedRoute module="partners"><AdminPartners /></ProtectedRoute>} />
              <Route path="/admin/ai-providers" element={<ProtectedRoute requireAdmin><AdminAIProviders /></ProtectedRoute>} />
              <Route path="/admin/referrals" element={<ProtectedRoute module="referrals"><AdminReferrals /></ProtectedRoute>} />
              <Route path="/admin/otp-providers" element={<ProtectedRoute requireAdmin><AdminOtpProviders /></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute requireAdmin><AdminLogs /></ProtectedRoute>} />
              <Route path="/admin/explain-system" element={<ProtectedRoute requireAdmin><AdminExplainSystem /></ProtectedRoute>} />
              <Route path="/admin/email-providers" element={<ProtectedRoute requireAdmin><AdminEmailProviders /></ProtectedRoute>} />
              <Route path="/admin/backup" element={<ProtectedRoute requireAdmin><AdminBackup /></ProtectedRoute>} />
              <Route path="/admin/legal" element={<ProtectedRoute module="legal"><AdminLegalPages /></ProtectedRoute>} />
              <Route path="/admin/sitemap" element={<ProtectedRoute module="sitemap"><AdminSitemap /></ProtectedRoute>} />
              <Route path="/admin/integrations" element={<ProtectedRoute requireAdmin><AdminIntegrations /></ProtectedRoute>} />
              <Route path="/admin/also-check" element={<ProtectedRoute requireAdmin><AdminAlsoCheck /></ProtectedRoute>} />
              <Route path="/admin/careers" element={<ProtectedRoute module="careers"><AdminCareers /></ProtectedRoute>} />
              <Route path="/admin/applications" element={<ProtectedRoute module="applications"><AdminApplications /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/faculty" element={<ProtectedRoute module="faculty"><AdminFaculty /></ProtectedRoute>} />
              <Route path="/admin/companies" element={<ProtectedRoute module="companies"><AdminCompanies /></ProtectedRoute>} />
              <Route path="/admin/placements" element={<ProtectedRoute module="placements"><AdminPlacements /></ProtectedRoute>} />
              <Route path="/admin/facilities" element={<ProtectedRoute module="facilities"><AdminFacilities /></ProtectedRoute>} />
              <Route path="/admin/contacts" element={<ProtectedRoute module="contacts"><AdminContacts /></ProtectedRoute>} />
              <Route path="/admin/course-fees" element={<ProtectedRoute module="course_fees"><AdminCourseFees /></ProtectedRoute>} />
              <Route path="/admin/promoted-programs" element={<ProtectedRoute module="promoted_programs"><AdminPromotedPrograms /></ProtectedRoute>} />
              <Route path="/admin/program-categories" element={<ProtectedRoute module="promoted_programs"><AdminProgramCategories /></ProtectedRoute>} />
              <Route path="/premium-programs" element={<AllPremiumPrograms />} />
              <Route path="/premium-programs/:slug" element={<PremiumProgramDetail />} />
              <Route path="/admin/priority" element={<ProtectedRoute requireAdmin><AdminPriority /></ProtectedRoute>} />
              <Route path="/admin/bulk" element={<ProtectedRoute requireAdmin><AdminBulk /></ProtectedRoute>} />
              <Route path="/admin/study-material" element={<ProtectedRoute module="study_material"><AdminStudyMaterial /></ProtectedRoute>} />
              <Route path="/admin/toppers" element={<ProtectedRoute module="study_material"><AdminToppers /></ProtectedRoute>} />
              <Route path="/admin/board-links" element={<ProtectedRoute module="study_material"><AdminBoardLinks /></ProtectedRoute>} />
              <Route path="/admin/tags" element={<ProtectedRoute module="articles"><AdminTagsManager /></ProtectedRoute>} />
              <Route path="/admin/landing-pages" element={<ProtectedRoute requireAdmin><AdminLandingPages /></ProtectedRoute>} />
              <Route path="/admin/reviews" element={<ProtectedRoute requireAdmin><AdminReviews /></ProtectedRoute>} />
              <Route path="/admin/ai-reports" element={<ProtectedRoute requireAdmin><AdminAIReports /></ProtectedRoute>} />
              <Route path="/admin/approval-bodies" element={<ProtectedRoute module="colleges"><AdminApprovalBodies /></ProtectedRoute>} />
              <Route path="/admin/categories" element={<ProtectedRoute module="colleges"><AdminCategories /></ProtectedRoute>} />
              <Route path="/admin/article-categories" element={<ProtectedRoute module="articles"><AdminArticleCategories /></ProtectedRoute>} />
              <Route path="/lp" element={<LandingPage />} />
              <Route path="/landing/:slug" element={<LandingPage />} />
              <Route path="/study-material" element={<StudyMaterial />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:slug" element={<Resources />} />
              <Route path="/study-material/:classSlug" element={<StudyClass />} />
              <Route path="/study-material/:classSlug/:boardSlug" element={<StudyClass />} />
              <Route path="/study-material/:classSlug/:boardSlug/:subjectSlug" element={<StudySubject />} />
              <Route path="/study-material/:classSlug/:boardSlug/:subjectSlug/:chapterSlug" element={<StudySubject />} />
              <Route path="/college-study-material" element={<CollegeStudyMaterial />} />
              <Route path="/college-study-material/:programSlug" element={<CollegeProgram />} />
              <Route path="/college-study-material/:programSlug/:universitySlug" element={<CollegeUniversity />} />
              <Route path="/college-study-material/:programSlug/:universitySlug/:semSlug" element={<CollegeUniversity />} />
              <Route path="/college-study-material/:programSlug/:universitySlug/:semSlug/:subjectSlug" element={<CollegeSubject />} />
              <Route path="/admin/college-study" element={<ProtectedRoute module="study_material"><AdminCollegeStudy /></ProtectedRoute>} />
              <Route path="/tools" element={<AllTools />} />
              <Route path="/tools/:slug" element={<ToolPage />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/careers" element={<AllCareers />} />
              <Route path="/careers/:slug" element={<CareerDetail />} />
              <Route path="/jobs" element={<AllJobs />} />
              <Route path="/jobs/:slug" element={<JobDetail />} />
              <Route path="/vacancies" element={<AllJobs />} />
              <Route path="/vacancies/:slug" element={<JobDetail />} />
              <Route path="/admin/jobs" element={<ProtectedRoute requireAdmin><AdminJobs /></ProtectedRoute>} />
              <Route path="/admin/vacancies" element={<ProtectedRoute requireAdmin><AdminJobs /></ProtectedRoute>} />
              <Route path="/admin/vacancy-applications" element={<ProtectedRoute requireAdmin><AdminJobApplications /></ProtectedRoute>} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/scholarships" element={<Scholarships />} />
              <Route path="/scholarships/:slug" element={<ScholarshipDetail />} />
              <Route path="/admin/scholarships" element={<ProtectedRoute requireAdmin><AdminScholarships /></ProtectedRoute>} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/admin/about" element={<ProtectedRoute requireAdmin><AdminAbout /></ProtectedRoute>} />
              <Route path="/admin/authors" element={<ProtectedRoute module="users"><AdminAuthors /></ProtectedRoute>} />
              <Route path="/author/:slug" element={<AuthorPage />} />
              <Route path="/admin/user-analytics" element={<ProtectedRoute requireAdmin><AdminUserAnalytics /></ProtectedRoute>} />
              <Route path="/admin/funnel" element={<ProtectedRoute requireAdmin><AdminFunnel /></ProtectedRoute>} />
              <Route path="/admin/heatmap" element={<ProtectedRoute requireAdmin><AdminHeatmap /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
           </Suspense>
           </ChunkErrorBoundary>
           <GlobalWhatsApp />
           <NewsOnlyCall />
            </IntentTrackingProvider>
            </UserTrackingProvider>
         </BrowserRouter>
        </TooltipProvider>
      </CompareProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
