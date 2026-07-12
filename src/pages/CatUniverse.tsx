import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { FixedCounsellingCTA } from "@/components/FixedCounsellingCTA";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useSEO } from "@/hooks/useSEO";
import { useCatUniverseData } from "@/hooks/useCatUniverse";
import { CatUniverseSectionCards, CatUniverseSpotlight } from "@/components/cat/CatUniverseBlocks";

export default function CatUniverse() {
  const { data } = useCatUniverseData();

  const settings = data?.settings;
  const sections = (data?.sections || []).filter((item) => item.is_active);
  const modules = (data?.modules || []).filter((item) => item.is_active);

  useSEO({
    title: settings?.seo_title || "CAT Universe",
    description: settings?.seo_description,
    keywords: "CAT calculator, IIM predictor, MBA cutoffs, XAT calculator, CMAT calculator",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="cat_universe" />
      <main className="container py-4 md:py-6">
        <PageBreadcrumb items={[{ label: "CAT Universe" }]} />
        {settings ? <CatUniverseSpotlight settings={settings} sections={sections} modules={modules} /> : null}

        <div className="my-6">
          <LeadCaptureForm
            variant="banner"
            title={settings?.lead_title || "Talk to an MBA admission expert"}
            subtitle={settings?.lead_subtitle || "Get your shortlist, score interpretation, and next-step plan for free."}
            source="cat_universe_landing_banner"
          />
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => {
            const sectionModules = modules.filter((item) => item.section_slug === section.slug);
            if (!sectionModules.length) return null;

            return (
              <div key={section.slug} className="space-y-5">
                <CatUniverseSectionCards section={section} modules={sectionModules} />

                {index < sections.length - 1 ? (
                  <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <DynamicAdBanner variant="horizontal" position="mid-page" page="cat_universe" itemSlug={section.slug} />
                    <div className="rounded-3xl border border-border bg-card p-5">
                      <div className="text-lg font-bold text-foreground">Need a quick MBA plan?</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Tell us your score target, city preference and budget. We will help you shortlist the right route.
                      </div>
                      <Link to="/auth" className="mt-4 inline-flex text-sm font-semibold text-primary">
                        Start guided flow
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
      <FloatingBot />
      <FixedCounsellingCTA />
    </div>
  );
}
