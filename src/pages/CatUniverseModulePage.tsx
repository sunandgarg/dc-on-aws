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
import {
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

  useSEO({
    title: module ? `${module.title} - CAT Universe` : "CAT Universe",
    description: module?.description || settings?.seo_description,
    keywords: `CAT Universe, ${module?.title || "MBA tools"}, MBA leads, MBA counselling`,
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
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="cat_universe" itemSlug={module.slug} />
      <main className="container py-4 md:py-6">
        <PageBreadcrumb items={[{ label: "CAT Universe", href: "/cat-universe" }, { label: section.title }, { label: module.title }]} />
        <Link to="/cat-universe" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to CAT Universe
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-border bg-card p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">{section.title}</Badge>
                {module.badge ? <Badge variant="outline">{module.badge}</Badge> : null}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">{module.title}</h1>
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

            {module.module_type === "calculator" ? (
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
