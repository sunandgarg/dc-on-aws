import { lazy, Suspense, useCallback, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { HeroSection } from "@/components/HeroSection";
import { HomeUrgencyStrip } from "@/components/UrgencyHooks";
import { DeferredRender } from "@/components/DeferredRender";

const HomeBelowFold = lazy(() => import("@/components/HomeBelowFold"));
const AILeadForm = lazy(() => import("@/components/AILeadForm").then(module => ({ default: module.AILeadForm })));
const AIChatFullScreen = lazy(() => import("@/components/AIChatFullScreen").then(module => ({ default: module.AIChatFullScreen })));

export default function Index() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string>();
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<string>();
  const [leadInfo, setLeadInfo] = useState<{ name: string; course: string; state: string; city: string }>();

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
      <DeferredRender minHeight={900}>
        <Suspense fallback={<div className="min-h-[900px]" aria-hidden="true" />}><HomeBelowFold /></Suspense>
      </DeferredRender>
    </main>
    {isLeadFormOpen && <Suspense fallback={null}><AILeadForm isOpen onClose={() => { setIsLeadFormOpen(false); setPendingChatMessage(undefined); }} onSubmit={handleLeadSubmit} /></Suspense>}
    {isChatOpen && <Suspense fallback={null}><AIChatFullScreen isOpen onClose={() => { setIsChatOpen(false); setInitialChatMessage(undefined); }} initialMessage={initialChatMessage} leadData={leadInfo} onRequestLeadForm={() => setIsLeadFormOpen(true)} /></Suspense>}
  </div>;
}
