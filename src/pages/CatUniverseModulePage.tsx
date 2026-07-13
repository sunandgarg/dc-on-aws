import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { FixedCounsellingCTA } from "@/components/FixedCounsellingCTA";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/useSEO";
import { useCatUniverseModule } from "@/hooks/useCatUniverse";
import { SEO } from "@/components/SEO";
import {
  CatUniverseAiPanel,
  CatUniverseCalculator,
  CatUniverseCounsellingModule,
  CatUniverseCutoffTable,
  CatUniversePredictor,
  CatUniverseResourceGrid,
} from "@/components/cat/CatUniverseBlocks";
import { parseMultiline } from "@/lib/catUniverse";

export default function CatUniverseModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const { payload } = useCatUniverseModule(slug);

  const module = payload?.module;
  const settings = payload?.settings;
  const section = payload?.section;
  const siblingModules = payload?.siblingModules || [];
  const resources = payload?.resources || [];
  const cutoffs = payload?.cutoffs || [];
  const isCatScorePage = module?.slug === "cat-score-calculator";
  const currentYear = new Date().getFullYear();
  const seoTitle = isCatScorePage
    ? `CAT Score Calculator ${currentYear} - Response Sheet, Score & Percentile Predictor`
    : module ? `${module.title} - CAT Universe` : "CAT Universe";
  const seoDescription = isCatScorePage
    ? `Use the CAT Score Calculator ${currentYear} to analyse your official response sheet or enter VARC, DILR and QA attempts manually. Estimate raw score, percentile range and likely MBA college options.`
    : module?.description || settings?.seo_description;
  const seoKeywords = isCatScorePage
    ? `CAT score calculator ${currentYear}, CAT response sheet calculator ${currentYear}, CAT percentile predictor, CAT score vs percentile, CAT raw score calculator, MBA college predictor`
    : `CAT Universe, ${module?.title || "MBA tools"}, MBA leads, MBA counselling`;
  const faqJsonLd = isCatScorePage ? [
    {
      "@type": "Question",
      "name": "How is CAT score calculated?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "CAT raw score is commonly estimated as 3 marks for every correct answer and minus 1 for every incorrect MCQ. TITA questions usually do not carry negative marking."
      }
    },
    {
      "@type": "Question",
      "name": "Can a CAT score calculator predict exact percentile?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No calculator can predict official percentile exactly. It can only estimate a likely percentile range based on past score-vs-percentile trends and expected exam difficulty."
      }
    },
    {
      "@type": "Question",
      "name": "What should I do after checking my CAT estimated percentile?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use the estimated percentile to build a realistic MBA shortlist, identify reach and safe colleges, and plan your next steps for interviews, applications, and counseling."
      }
    }
  ] : undefined;

  useSEO({
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
  });

  if (!module || !section) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-20 text-center">
          <div className="text-2xl font-bold text-foreground">Module not found</div>
          <div className="mt-2 text-muted-foreground">This CAT Universe page may not be active yet.</div>
          <Link to="/cat-universe" className="mt-5 inline-flex">
            <Button className="rounded-xl">Back to CAT Universe</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const detailPoints = parseMultiline(module.detail_points);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonical={module ? `/cat-universe/${module.slug}` : "/cat-universe"}
        ogType="article"
        jsonLd={isCatScorePage ? [
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": seoTitle,
            "description": seoDescription,
            "url": `https://www.dekhocampus.in/cat-universe/${module?.slug}`,
            "about": ["CAT score calculator", "CAT percentile predictor", "MBA admission planning"],
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": `DekhoCampus CAT Score Calculator ${currentYear}`,
            "applicationCategory": "EducationalApplication",
            "operatingSystem": "Web",
            "isAccessibleForFree": true,
            "description": seoDescription,
          },
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": `How to use the CAT Score Calculator ${currentYear}`,
            "step": [
              { "@type": "HowToStep", "name": "Open your official CAT response sheet" },
              { "@type": "HowToStep", "name": "Paste the official response-sheet URL or enter section attempts manually" },
              { "@type": "HowToStep", "name": "Review estimated raw score and percentile range" },
              { "@type": "HowToStep", "name": "Compare likely MBA college cut-off zones" },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqJsonLd,
          },
        ] : undefined}
      />
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="cat_universe" itemSlug={module.slug} />
      <main className="container py-4 md:py-6">
        <PageBreadcrumb items={[{ label: "CAT Universe", href: "/cat-universe" }, { label: section.title }, { label: module.title }]} />
        <Link to="/cat-universe" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to CAT Universe
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            {isCatScorePage ? <CatUniverseCalculator examKey={module.exam_key} cutoffs={cutoffs} /> : null}

            <section className="rounded-[32px] border border-border bg-card p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">{section.title}</Badge>
                {module.badge ? <Badge variant="outline">{module.badge}</Badge> : null}
              </div>
              {isCatScorePage ? (
                <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">CAT Score Calculator {currentYear} guide and manual estimator</h2>
              ) : (
                <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">{module.title}</h1>
              )}
              <p className="mt-3 text-lg text-muted-foreground">{module.subtitle}</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{module.description}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{module.stat_label || "Signal"}</div>
                  <div className="mt-1 font-bold text-foreground">{module.stat_value || "High-intent flow"}</div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Audience</div>
                  <div className="mt-1 font-bold text-foreground">{module.audience_text || "MBA aspirants"}</div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Primary CTA</div>
                  <div className="mt-1 font-bold text-foreground">{module.primary_cta_label}</div>
                </div>
              </div>
            </section>

            {module.module_type === "calculator" && !isCatScorePage ? (
              <CatUniverseCalculator examKey={module.exam_key} cutoffs={cutoffs} />
            ) : null}

            {module.module_type === "predictor" ? (
              <CatUniversePredictor cutoffs={cutoffs} title={module.title} />
            ) : null}

            {module.module_type === "resource_hub" ? (
              <CatUniverseResourceGrid resources={resources} />
            ) : null}

            {module.module_type === "cutoff_list" ? (
              <CatUniverseCutoffTable cutoffs={cutoffs} />
            ) : null}

            {module.module_type === "counselling" ? (
              <CatUniverseCounsellingModule module={module} resources={resources} />
            ) : null}

            <CatUniverseAiPanel module={module} sectionTitle={section.title} />

            {detailPoints.length && module.module_type !== "counselling" ? (
              <section className="rounded-3xl border border-border bg-card p-5">
                <div className="text-lg font-bold text-foreground">What students get here</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {detailPoints.map((point) => (
                    <div key={point} className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {point}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {isCatScorePage ? (
              <>
                <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-2xl font-black text-foreground">CAT Score Calculator {currentYear} - score, percentile and shortlist in one flow</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Use your official response sheet or section-wise VARC, DILR and QA attempts to estimate a CAT raw score. The calculator then converts that signal into a likely percentile range,
                    explains score-versus-percentile movement and surfaces MBA college cut-off zones worth exploring next.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      "CAT score calculator with section-wise inputs",
                      "CAT percentile predictor with quick score bands",
                      "CAT score vs percentile explanation blocks",
                      "MBA shortlist cues based on percentile territory",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-2xl font-black text-foreground">CAT score calculator FAQ</h2>
                  <div className="mt-5 space-y-4">
                    {[
                      {
                        q: "How accurate is this CAT percentile predictor?",
                        a: "It is a directional estimator based on recent CAT score vs percentile benchmarks. It is useful for fast decision-making, but official percentile can shift with exam difficulty and normalization.",
                      },
                      {
                        q: "Does this CAT score calculator include sectional scores?",
                        a: "Yes. You can enter correct and incorrect answers for VARC, DILR and QA separately, and the page shows section-level score signals before combining them into an estimated CAT raw score.",
                      },
                      {
                        q: "Can I use this CAT score calculator for MBA shortlisting?",
                        a: "Yes. That is the real purpose of the page - estimate your likely CAT percentile, compare it to college cut-off signals, and then move into shortlist and counseling decisions.",
                      },
                    ].map((item) => (
                      <div key={item.q} className="rounded-2xl border border-border bg-muted/30 p-4">
                        <h3 className="text-base font-bold text-foreground">{item.q}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}

            <LeadCaptureForm
              variant="inline"
              title={settings?.lead_title || "Talk to an MBA admission expert"}
              subtitle={settings?.lead_subtitle || "Get your shortlist, score interpretation, and next-step plan for free."}
              source={module.lead_source || `cat_universe_${module.slug}`}
            />
          </div>

          <aside className="space-y-6">
            <LeadCaptureForm
              variant="sidebar"
              title="Want a personalized MBA shortlist?"
              subtitle="Share your score target, budget and city preference."
              source={`${module.lead_source || module.slug}_sidebar`}
            />
            <DynamicAdBanner variant="vertical" position="sidebar" page="cat_universe" itemSlug={module.slug} />
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="text-lg font-bold text-foreground">More from {section.title}</div>
              <div className="mt-4 space-y-3">
                {siblingModules.slice(0, 5).map((item) => (
                  <Link key={item.slug} to={`/cat-universe/${item.slug}`} className="block rounded-2xl border border-border p-4 transition hover:border-primary/30 hover:bg-muted/30">
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      <FloatingBot />
      <FixedCounsellingCTA />
    </div>
  );
}
