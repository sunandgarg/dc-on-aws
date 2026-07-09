import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Calculator, Percent, IndianRupee, BarChart3, FileCheck, Heart, CalendarDays, Wallet, AlignLeft, Building2, Brain, ArrowRight, Target } from "lucide-react";
import { CGPAConverterTool } from "@/components/tools/CGPAConverterTool";
import { EMICalculatorTool } from "@/components/tools/EMICalculatorTool";
import { RankPredictorTool } from "@/components/tools/RankPredictorTool";
import { EligibilityCheckerTool } from "@/components/tools/EligibilityCheckerTool";
import { BMICalculator } from "@/components/tools/BMICalculator";
import { PercentageCalculator } from "@/components/tools/PercentageCalculator";
import { AgeCalculator } from "@/components/tools/AgeCalculator";
import { SIPCalculator } from "@/components/tools/SIPCalculator";
import { WordCounter } from "@/components/tools/WordCounter";
import { CompareCollegesTool } from "@/components/tools/CompareCollegesTool";
import { PsychometricTestTool } from "@/components/tools/PsychometricTestTool";
import { LockTargetTool } from "@/components/tools/LockTargetTool";

const tools = [
  { title: "Compare Colleges", icon: Building2, slug: "compare-colleges", component: CompareCollegesTool },
  { title: "Target with AI", icon: Target, slug: "lock-target", component: LockTargetTool },
  { title: "Psychometric Test", icon: Brain, slug: "psychometric-test", component: PsychometricTestTool },
  { title: "CGPA Converter", icon: Percent, slug: "cgpa-converter", component: CGPAConverterTool },
  { title: "EMI Calculator", icon: IndianRupee, slug: "emi-calculator", component: EMICalculatorTool },
  { title: "Rank Predictor", icon: BarChart3, slug: "rank-predictor", component: RankPredictorTool },
  { title: "Eligibility Checker", icon: FileCheck, slug: "eligibility-checker", component: EligibilityCheckerTool },
  { title: "BMI Calculator", icon: Heart, slug: "bmi-calculator", component: BMICalculator },
  { title: "Percentage Calc", icon: Calculator, slug: "percentage-calculator", component: PercentageCalculator },
  { title: "Age Calculator", icon: CalendarDays, slug: "age-calculator", component: AgeCalculator },
  { title: "SIP Calculator", icon: Wallet, slug: "sip-calculator", component: SIPCalculator },
  { title: "Word Counter", icon: AlignLeft, slug: "word-counter", component: WordCounter },
];


export function ToolsSection() {
  const [activeSlug, setActiveSlug] = useState("compare-colleges");
  const activeTool = tools.find(t => t.slug === activeSlug)!;
  const ActiveComponent = activeTool.component;

  return (
    <section className="py-12 md:py-16 bg-muted/20" aria-labelledby="tools-heading">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-3">
            <Calculator className="w-4 h-4" />
            Smart Toolkit
          </div>
          <h2 id="tools-heading" className="text-headline font-bold text-foreground">
            AI Tools That Actually <span className="text-gradient-accent">Slap</span> - 
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs md:text-sm font-extrabold tracking-wide align-middle shadow-sm">
              100% FREE
            </span>
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">AI career test, smart calculators & predictors - zero signup, zero charges, forever.</p>
        </motion.div>

        {/* Horizontal scrollable tabs */}
        <div className="flex gap-2 overflow-x-auto overflow-y-clip pb-3 scrollbar-hide mb-6">
          {tools.map((tool) => (
            <button
              key={tool.slug}
              onClick={() => setActiveSlug(tool.slug)}
              className={`relative flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeSlug === tool.slug
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
              }`}
            >
              <tool.icon className="w-4 h-4" />
              {tool.title}
            </button>
          ))}
        </div>

        {/* Active tool content */}
        <div className="bg-card rounded-2xl border border-border p-5 md:p-8">
          <ActiveComponent />
        </div>

        <div className="text-center mt-6">
          <Link to={`/tools/${activeSlug}`} className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
            Open Full Tool <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
