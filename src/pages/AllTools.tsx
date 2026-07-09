import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { FixedCounsellingCTA } from "@/components/FixedCounsellingCTA";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { Calculator, Percent, IndianRupee, BarChart3, FileCheck, Heart, CalendarDays, Wallet, AlignLeft, Building2, Brain, ArrowRight, Target, Sparkles, Lock } from "lucide-react";
import { TOOLS_REGISTRY } from "@/lib/toolsRegistry";

const ICON_MAP: Record<string, any> = {
  "lock-target": Target,
  "compare-colleges": Building2,
  "psychometric-test": Brain,
  "cgpa-converter": Percent,
  "emi-calculator": IndianRupee,
  "rank-predictor": BarChart3,
  "eligibility-checker": FileCheck,
  "bmi-calculator": Heart,
  "percentage-calculator": Calculator,
  "age-calculator": CalendarDays,
  "sip-calculator": Wallet,
  "word-counter": AlignLeft,
};

const featuredTool = TOOLS_REGISTRY.find((t) => t.slug === "lock-target")!;
const allTools = TOOLS_REGISTRY.filter((t) => t.slug !== "lock-target").map((t) => ({ ...t, icon: ICON_MAP[t.slug] || Calculator }));


import { useSEO } from "@/hooks/useSEO";

export default function AllTools() {
  useSEO({ title: "Free Student Tools - CGPA, EMI, Rank Predictor, Compare Colleges", description: "Free student calculators and utilities: CGPA to percentage, education loan EMI, rank predictor, eligibility checker and more." });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="tools" />
      <main className="container py-4 md:py-6">
        <PageBreadcrumb items={[{ label: "Tools" }]} />
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Helpful Tools for Students</h1>
        <p className="text-muted-foreground mb-4">Quick utilities to make your education journey easier</p>

        <AlsoCheckSection variant="strip" className="mb-6" />

        {/* Featured: Target with AI */}
        <Link
          to="/lock-target"
          className="group block mb-6 relative overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-500 to-rose-500 text-white p-5 md:p-6 hover:shadow-xl transition-all"
        >
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-10 w-52 h-52 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3" /> New · AI Powered · Free PDF
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">{featuredTool.title}</h2>
              <p className="text-sm md:text-[15px] text-white/90 mt-1 max-w-2xl">{featuredTool.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold bg-white text-orange-700 px-3 h-9 rounded-full">
                <Lock className="w-4 h-4" /> Lock my target now
              </span>
            </div>
          </div>
        </Link>


        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTools.map((tool) => (
            <Link
              key={tool.slug}
              to={`/tools/${tool.slug}`}
              className="group bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{tool.title}</h2>
              <p className="text-sm text-muted-foreground mb-3">{tool.desc}</p>
              <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
                Use Tool <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
      <FloatingBot />
      <FixedCounsellingCTA />
    </div>
  );
}
