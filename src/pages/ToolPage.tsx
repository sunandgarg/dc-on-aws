import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingBot } from "@/components/FloatingBot";
import { FixedCounsellingCTA } from "@/components/FixedCounsellingCTA";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { BMICalculator } from "@/components/tools/BMICalculator";
import { PercentageCalculator } from "@/components/tools/PercentageCalculator";
import { AgeCalculator } from "@/components/tools/AgeCalculator";
import { SIPCalculator } from "@/components/tools/SIPCalculator";
import { WordCounter } from "@/components/tools/WordCounter";
import { CGPAConverterTool } from "@/components/tools/CGPAConverterTool";
import { EMICalculatorTool } from "@/components/tools/EMICalculatorTool";
import { RankPredictorTool } from "@/components/tools/RankPredictorTool";
import { EligibilityCheckerTool } from "@/components/tools/EligibilityCheckerTool";
import { CompareCollegesTool } from "@/components/tools/CompareCollegesTool";
import { PsychometricTestTool } from "@/components/tools/PsychometricTestTool";

const toolRegistry: Record<string, { title: string; description: string; component: React.FC }> = {
  "compare-colleges": { title: "Compare Colleges", description: "Side-by-side college comparison on fees, placements, and rankings.", component: CompareCollegesTool },
  "psychometric-test": { title: "Psychometric Career Test", description: "Discover your career personality and best-fit streams in under 2 minutes - 100% free.", component: PsychometricTestTool },
  "cgpa-converter": { title: "CGPA/SGPA to Percentage Converter", description: "Convert your CGPA or SGPA to percentage easily.", component: CGPAConverterTool },
  "emi-calculator": { title: "Education Loan EMI Calculator", description: "Calculate your monthly EMI for education loans.", component: EMICalculatorTool },
  "rank-predictor": { title: "Exam Rank Predictor", description: "Get an estimated rank based on your expected score.", component: RankPredictorTool },
  "eligibility-checker": { title: "College Eligibility Checker", description: "Check which colleges you're eligible for.", component: EligibilityCheckerTool },
  "bmi-calculator": { title: "BMI Calculator", description: "Calculate your Body Mass Index.", component: BMICalculator },
  "percentage-calculator": { title: "Percentage Calculator", description: "Calculate percentages, increases, and decreases.", component: PercentageCalculator },
  "age-calculator": { title: "Age Calculator", description: "Calculate your exact age from DOB.", component: AgeCalculator },
  "sip-calculator": { title: "SIP Calculator", description: "Plan your investments with SIP.", component: SIPCalculator },
  "word-counter": { title: "Word & Character Counter", description: "Count words, characters, and reading time.", component: WordCounter },
};

const toolSlugs = Object.keys(toolRegistry);

import { useSEO } from "@/hooks/useSEO";

export default function ToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const tool = slug ? toolRegistry[slug] : null;
  useSEO({ title: tool ? tool.title : "Tool Not Found", description: tool?.description });

  if (!tool) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Tool Not Found</h1>
          <Link to="/tools"><Button className="gradient-primary text-primary-foreground rounded-xl">All Tools</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const ToolComponent = tool.component;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <DynamicAdBanner variant="leaderboard" position="leaderboard" page="tools" />
      <main className="container py-4 md:py-6">
        <PageBreadcrumb items={[{ label: "Tools", href: "/tools" }, { label: tool.title }]} />
        <Link to="/tools" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to All Tools
        </Link>

        {/* Tool tabs - navigate between tools */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
          {toolSlugs.map((s) => (
            <button
              key={s}
              onClick={() => navigate(`/tools/${s}`)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                slug === s
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
              }`}
            >
              {toolRegistry[s].title}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border p-5 md:p-8 mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{tool.title}</h1>
              <p className="text-muted-foreground mb-6">{tool.description}</p>
              <ToolComponent />
            </div>
            <DynamicAdBanner variant="horizontal" position="mid-page" page="tools" />
            <div className="mt-6">
              <LeadCaptureForm variant="inline" title="Need more help? Talk to our experts!" source={`tool_${slug}`} />
            </div>
          </div>
          <aside className="space-y-6">
            <LeadCaptureForm variant="sidebar" title="Get Expert Help" subtitle="Free career counseling" source={`tool_sidebar_${slug}`} />
            <DynamicAdBanner variant="vertical" position="sidebar" page="tools" />
            <LeadCaptureForm variant="card" title="Education Updates" subtitle="Stay informed about admissions" source="tool_sidebar_card" />
          </aside>
        </div>
      </main>
      <Footer />
      <FloatingBot />
      <FixedCounsellingCTA />
    </div>
  );
}
