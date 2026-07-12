import { lazy, Suspense, useCallback, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { HeroSection } from "@/components/HeroSection";
import { QuickLinksBar } from "@/components/QuickLinksBar";
import { HomeUrgencyStrip } from "@/components/UrgencyHooks";
import { DeferredRender } from "@/components/DeferredRender";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useCatUniverseData } from "@/hooks/useCatUniverse";
import { CatUniverseSpotlight } from "@/components/cat/CatUniverseBlocks";

const HomeBelowFold = lazy(() => import("@/components/HomeBelowFold"));
const AILeadForm = lazy(() => import("@/components/AILeadForm").then(module => ({ default: module.AILeadForm })));
const AIChatFullScreen = lazy(() => import("@/components/AIChatFullScreen").then(module => ({ default: module.AIChatFullScreen })));

export default function Index() {
  const [homepageMode, setHomepageMode] = useState<"general" | "cat">("general");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string>();
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<string>();
  const [leadInfo, setLeadInfo] = useState<{ name: string; course: string; state: string; city: string }>();
  const { data: catUniverse } = useCatUniverseData();

  const handleOpenChat = useCallback((message?: string) => {
    setPendingChatMessage(message);
    setIsLeadFormOpen(true);
  }, []);

  const handleLeadSubmit = useCallback((data: { name: string; course: string; state: string; city: string }) => {
    setIsLeadFormOpen(false);
    setLeadInfo(data);
    setInitialChatMessage(pendingChatMessage);
    setIsChatOpen(true);
    setPendingChatMessage(undefined);
  }, [pendingChatMessage]);

  return <div className="min-h-screen bg-background overflow-x-clip">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">Skip to main content</a>
    <HomeUrgencyStrip onClick={() => setIsLeadFormOpen(true)} />
    <Navbar />
    <ProfileCompletionBanner />
    <main id="main-content">
      <div id="hero"><HeroSection onOpenChat={handleOpenChat} /></div>
      <div id="quick-links"><QuickLinksBar /></div>
      {catUniverse?.settings?.show_home_toggle ? (
        <section className="container py-5">
          <div className="rounded-[28px] border border-border bg-card p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  {catUniverse.settings.toggle_label}
                </div>
                <div className="mt-2 text-lg font-bold text-foreground">Choose your homepage mode</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Stay in the general discovery flow - or switch into CAT Universe for a focused MBA journey.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={homepageMode === "general" ? "default" : "outline"} className="rounded-full" onClick={() => setHomepageMode("general")}>
                  General discovery
                </Button>
                <Button variant={homepageMode === "cat" ? "default" : "outline"} className="rounded-full" onClick={() => setHomepageMode("cat")}>
                  CAT Universe
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {homepageMode === "cat" && catUniverse ? (
        <section className="container pb-6">
          <CatUniverseSpotlight
            settings={catUniverse.settings}
            sections={catUniverse.sections.filter((item) => item.is_active)}
            modules={catUniverse.modules.filter((item) => item.is_active)}
            embedded
          />
        </section>
      ) : (
        <DeferredRender minHeight={900}>
          <Suspense fallback={<div className="min-h-[900px]" aria-hidden="true" />}><HomeBelowFold /></Suspense>
        </DeferredRender>
      )}
    </main>
    {isLeadFormOpen && <Suspense fallback={null}><AILeadForm isOpen onClose={() => { setIsLeadFormOpen(false); setPendingChatMessage(undefined); }} onSubmit={handleLeadSubmit} /></Suspense>}
    {isChatOpen && <Suspense fallback={null}><AIChatFullScreen isOpen onClose={() => { setIsChatOpen(false); setInitialChatMessage(undefined); }} initialMessage={initialChatMessage} leadData={leadInfo} onRequestLeadForm={() => setIsLeadFormOpen(true)} /></Suspense>}
  </div>;
}
