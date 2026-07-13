import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { LiveScholarshipsStrip } from "@/components/LiveScholarshipsStrip";
import { LiveNewsStrip } from "@/components/LiveNewsStrip";
import { TopRankedColleges } from "@/components/TopRankedColleges";
import { HeroBannerCarousel } from "@/components/HeroBannerCarousel";
import { CategorySection } from "@/components/CategorySection";
import { TrendingPrograms } from "@/components/TrendingPrograms";
import { ExploreCTACards } from "@/components/ExploreCTACards";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { CitySearch } from "@/components/CitySearch";
import { OnlineEducationSection } from "@/components/OnlineEducationSection";
import { QuickLinksBar } from "@/components/QuickLinksBar";
import { CareerScopeSection } from "@/components/CareerScopeSection";
import { ToolsSection } from "@/components/ToolsSection";
import { NewsSection } from "@/components/NewsSection";
import { StudyMaterialStrip } from "@/components/StudyMaterialStrip";
import { CollegeStudyStrip } from "@/components/CollegeStudyStrip";
import { ExamStrategiesSection } from "@/components/ExamStrategiesSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { GoogleAd } from "@/components/ads/GoogleAd";
import { FAQSection } from "@/components/FAQSection";
import { TrustedBySection } from "@/components/TrustedBySection";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { PeriodicLeadPopup } from "@/components/PeriodicLeadPopup";

export default function HomeBelowFold() {
  return <>
    <div className="container"><AlsoCheckSection variant="strip" /></div>
    <div className="container"><div id="live-scholarships"><LiveScholarshipsStrip /></div><div id="live-news"><LiveNewsStrip /></div></div>
    <div className="container"><TopRankedColleges /></div>
    <div className="container"><HeroBannerCarousel /></div>
    <div className="container"><CategorySection /></div>
    <div className="container">
      <div id="explore-cta-heading"><ExploreCTACards /></div>
      <section className="py-4"><DynamicAdBanner variant="leaderboard" position="mid-page" /></section>
      <div id="city-search-heading"><CitySearch /></div>
    </div>
    <div id="online-education-heading"><OnlineEducationSection /></div>
    <div className="container"><QuickLinksBar compact /></div>
    <div className="container">
      <div id="career-scope-heading"><CareerScopeSection /></div>
      <div id="tools-heading"><ToolsSection /></div>
      <section className="py-4"><DynamicAdBanner variant="horizontal" position="mid-page" /></section>
      <div id="news-heading"><NewsSection /></div>
      <div id="study-material-heading"><StudyMaterialStrip /></div>
      <div id="college-study-material-heading"><CollegeStudyStrip /></div>
      <div id="exam-strategies-heading"><ExamStrategiesSection /></div>
      <FeaturesSection />
      <GoogleAd placement="homepage" position="middle" pageKey="homepage" className="my-4" />
      <div id="faq-heading"><FAQSection page="homepage" title="Frequently Asked Questions" /></div>
      <div id="premium-programs-heading"><TrendingPrograms /></div>
      <div id="trusted-heading"><TrustedBySection /></div>
    </div>
    <Footer />
    <FloatingBot />
    <PeriodicLeadPopup />
  </>;
}
