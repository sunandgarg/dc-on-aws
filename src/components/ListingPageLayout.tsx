import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { FixedCounsellingCTA } from "@/components/FixedCounsellingCTA";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";

interface ListingPageLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  page?: string;
}

export function ListingPageLayout({ children, title, description, page }: ListingPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page={page} />
      <main className="container py-4 md:py-6">
        <header className="mb-4">
          <h1 className="text-headline font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm md:text-base text-muted-foreground max-w-2xl">{description}</p>
        </header>
        <AlsoCheckSection variant="strip" className="mb-6" />
        {children}
      </main>
      <Footer />
      <FloatingBot />
      <FixedCounsellingCTA />
    </div>
  );
}
