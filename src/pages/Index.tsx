import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { HeroSection } from "@/components/HeroSection";
import { QuickLinksBar } from "@/components/QuickLinksBar";
import { TopRankedColleges } from "@/components/TopRankedColleges";
import { CategorySection } from "@/components/CategorySection";
import { CitySearch } from "@/components/CitySearch";
import { OnlineEducationSection } from "@/components/OnlineEducationSection";
import { ExploreCTACards } from "@/components/ExploreCTACards";

import { NewsSection } from "@/components/NewsSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ToolsSection } from "@/components/ToolsSection";
import { TrendingPrograms } from "@/components/TrendingPrograms";
import { TrustedBySection } from "@/components/TrustedBySection";

import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";

import { AIChatFullScreen } from "@/components/AIChatFullScreen";
import { FloatingBot } from "@/components/FloatingBot";
import { AILeadForm } from "@/components/AILeadForm";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { GoogleAd } from "@/components/ads/GoogleAd";
import { PeriodicLeadPopup } from "@/components/PeriodicLeadPopup";
import { CareerScopeSection } from "@/components/CareerScopeSection";
import { LiveScholarshipsStrip } from "@/components/LiveScholarshipsStrip";
import { LiveNewsStrip } from "@/components/LiveNewsStrip";
import { StudyMaterialStrip } from "@/components/StudyMaterialStrip";
import { CollegeStudyStrip } from "@/components/CollegeStudyStrip";
import { ExamStrategiesSection } from "@/components/ExamStrategiesSection";
import { HomeUrgencyStrip } from "@/components/UrgencyHooks";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";


const Index = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string | undefined>();
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | undefined>();
  const [leadInfo, setLeadInfo] = useState<{ name: string; course: string; state: string; city: string } | undefined>();

  const handleOpenChat = useCallback((message?: string) => {
    setPendingChatMessage(message);
    setIsLeadFormOpen(true);
  }, []);

  const handleRequestLeadForm = useCallback(() => setIsLeadFormOpen(true), []);

  const handleLeadSubmit = useCallback((data: { name: string; course: string; state: string; city: string }) => {
    setIsLeadFormOpen(false);
    setLeadInfo(data);
    setInitialChatMessage(pendingChatMessage);
    setIsChatOpen(true);
    setPendingChatMessage(undefined);
  }, [pendingChatMessage]);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
    setInitialChatMessage(undefined);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">
        Skip to main content
      </a>
      <HomeUrgencyStrip onClick={() => setIsLeadFormOpen(true)} />
      <Navbar />
      <ProfileCompletionBanner />
      <main id="main-content">
        {/* 1. HOOK */}
        <div id="hero"><HeroSection onOpenChat={handleOpenChat} /></div>

        <div id="quick-links"><QuickLinksBar /></div>

        {/* Mid-page curiosity peak - Gen Z attention nudge right after hero */}
        <div className="container"><AlsoCheckSection variant="strip" /></div>

        {/* 2. URGENCY - live scholarships (time-bound, loss-aversion) */}
        <div className="container">
          <div id="live-scholarships"><LiveScholarshipsStrip /></div>
          <div id="live-news"><LiveNewsStrip /></div>
        </div>

        {/* 3. SOCIAL PROOF - top ranked colleges (authority) */}
        <div className="container">
          <TopRankedColleges />
        </div>

        {/* 4. RECIPROCITY - recommended free guidance banners (above categories) */}
        <div className="container">
          <HeroBannerCarousel />
        </div>

        {/* 5. VALUE - explore categories */}
        <div className="container">
          <CategorySection />
        </div>

        {/* 6. SCARCITY - premium "Upgrade Yourself" programs (below categories) */}
        <div className="container">
          <TrendingPrograms />
        </div>


        {/* 7. CTAs */}
        <div className="container">
          <div id="explore-cta-heading"><ExploreCTACards /></div>

          <section className="py-4">
            <DynamicAdBanner variant="leaderboard" position="mid-page" />
          </section>

          <div id="city-search-heading"><CitySearch /></div>
        </div>


        <div id="online-education-heading"><OnlineEducationSection /></div>

        {/* Quick links repeat below AI-powered / online education section */}
        <div className="container"><QuickLinksBar compact /></div>

        <div className="container">
          <div id="career-scope-heading"><CareerScopeSection /></div>

          <div id="tools-heading"><ToolsSection /></div>

          <section className="py-4">
            <DynamicAdBanner variant="horizontal" position="mid-page" />
          </section>

          <div id="news-heading"><NewsSection /></div>

          <div id="study-material-heading"><StudyMaterialStrip /></div>

          <div id="college-study-material-heading"><CollegeStudyStrip /></div>

          <div id="exam-strategies-heading"><ExamStrategiesSection /></div>


          <FeaturesSection />

          <GoogleAd placement="homepage" position="middle" pageKey="homepage" className="my-4" />

          <div id="faq-heading"><FAQSection page="homepage" title="Frequently Asked Questions" /></div>

          <div id="trusted-heading"><TrustedBySection /></div>
        </div>
      </main>
      <Footer />
      <AILeadForm
        isOpen={isLeadFormOpen}
        onClose={() => {
          setIsLeadFormOpen(false);
          setPendingChatMessage(undefined);
        }}
        onSubmit={handleLeadSubmit}
      />
      <AIChatFullScreen
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        initialMessage={initialChatMessage}
        leadData={leadInfo}
        onRequestLeadForm={handleRequestLeadForm}
      />
      <FloatingBot />

      <PeriodicLeadPopup />
    </div>
  );
};

export default Index;
