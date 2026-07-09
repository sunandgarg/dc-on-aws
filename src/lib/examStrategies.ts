// Single source of truth for exam strategy sub-pages.
// Each strategy renders the same exam page with strategy-specific SEO + hero
// so we can rank for long-tail searches like "JEE Main last 2 min strategy 2026".

export type ExamStrategy = {
  key: string;          // matches ExamStrategiesSection chip key
  slug: string;         // URL slug used in /exams/:exam/:slug
  label: string;        // chip label
  h1: (exam: string, year: number) => string;
  intro: (exam: string, year: number) => string;
  metaTitle: (exam: string, year: number) => string;
  metaDescription: (exam: string, year: number) => string;
  focusSection: string; // anchor to scroll to
  bullets: (exam: string) => string[];
};

const Y = () => new Date().getFullYear();

export const EXAM_STRATEGIES: ExamStrategy[] = [
  {
    key: "sample-paper", slug: "sample-paper",
    label: "Sample Paper", focusSection: "preparation",
    h1: (n, y) => `${n} Sample Paper ${y} – Free PDF Download`,
    intro: (n, y) => `Download the latest ${n} ${y} sample papers, model question papers and previous year solutions in PDF - curated by toppers and updated for the ${y} exam pattern.`,
    metaTitle: (n, y) => `${n} Sample Paper ${y} PDF Download – Model Papers & Solutions`,
    metaDescription: (n, y) => `Free ${n} ${y} sample paper PDFs with solutions. Latest pattern, topic-wise practice sets, mock tests and toppers' answer keys.`,
    bullets: (n) => [
      `Latest ${n} pattern-based sample papers`,
      `Subject-wise & full-length mock papers`,
      `Detailed solutions and marking scheme`,
      `Toppers' answer sheets for reference`,
    ],
  },
  {
    key: "tips-tricks", slug: "tips-and-tricks",
    label: "Tips & Tricks", focusSection: "preparation",
    h1: (n, y) => `${n} ${y} Tips & Tricks – Smart Preparation Hacks`,
    intro: (n, y) => `Topper-approved ${n} ${y} tips, shortcuts, formulas and time-management tricks to score higher with smart preparation, not just hard work.`,
    metaTitle: (n, y) => `${n} ${y} Tips & Tricks – Topper Strategy & Shortcuts`,
    metaDescription: (n, y) => `Best ${n} ${y} tips and tricks: shortcut formulas, time management, last-week revision plan and topper-approved hacks.`,
    bullets: (n) => [
      `Subject-wise high-yield topics`,
      `Quick-recall formula sheets`,
      `Question-attempt order strategy`,
      `Common mistakes to avoid in ${n}`,
    ],
  },
  ...timePlan("1-month", "last-1-month-preparation-strategy", "Last 1 Month", 30, "preparation"),
  ...timePlan("15-days", "15-days-preparation-strategy", "15 Days Plan", 15, "preparation"),
  ...timePlan("7-days", "7-days-preparation-strategy", "7 Days Plan", 7, "preparation"),
  ...timePlan("3-days", "3-days-preparation-strategy", "3 Days Plan", 3, "preparation"),
  ...timePlan("2-days", "2-days-preparation-strategy", "2 Days Plan", 2, "preparation"),
  ...timePlan("1-day", "1-day-preparation-strategy", "1 Day Plan", 1, "preparation"),
  ...hourPlan("18-hours", 18),
  ...hourPlan("12-hours", 12),
  ...hourPlan("8-hours", 8),
  ...hourPlan("6-hours", 6),
  ...hourPlan("3-hours", 3),
  ...hourPlan("1-hour", 1),
  ...minPlan("30-min", 30),
  ...minPlan("15-min", 15),
  ...minPlan("10-min", 10),
  ...minPlan("5-min", 5),
  {
    key: "last-2-min", slug: "last-2-minute-preparation-tips",
    label: "Last 2 Min", focusSection: "preparation",
    h1: (n, y) => `${n} Last 2 Minute Preparation Tips ${y}`,
    intro: (n, y) => `Walking into the ${n} ${y} exam hall? These last-2-minute mantras, formula recalls and confidence boosters help you settle nerves and pick up easy marks.`,
    metaTitle: (n, y) => `${n} Last 2 Minute Tips ${y} – Exam Hall Survival Guide`,
    metaDescription: (n, y) => `Last 2 minute ${n} ${y} preparation tips: quick formula recall, anxiety hacks, attempt strategy and topper mantras.`,
    bullets: (n) => [
      `5 formulas to recall right now`,
      `Calm-your-nerves breathing routine`,
      `Question selection in first 2 minutes`,
      `${n} exam hall do's and don'ts`,
    ],
  },
];

function timePlan(key: string, slug: string, label: string, days: number, focus: string): ExamStrategy[] {
  return [{
    key, slug, label, focusSection: focus,
    h1: (n, y) => `${n} ${days} Day${days > 1 ? "s" : ""} Preparation Strategy ${y}`,
    intro: (n, y) => `A focused ${days}-day study plan for ${n} ${y} - daily targets, must-revise chapters, mock-test schedule and revision blocks designed for last-mile preparation.`,
    metaTitle: (n, y) => `${n} ${days} Day${days > 1 ? "s" : ""} Preparation Strategy ${y} – Day Wise Plan`,
    metaDescription: (n, y) => `Day-wise ${days}-day ${n} ${y} preparation strategy: chapters to revise, mock test schedule, formula sheet and toppers' tips.`,
    bullets: (n) => [
      `Day-wise revision schedule`,
      `High-weightage chapters first`,
      `Mock tests + analysis windows`,
      `Sleep, food and exam-day plan for ${n}`,
    ],
  }];
}

function hourPlan(key: string, hours: number): ExamStrategy[] {
  const slug = `${hours}-hour${hours > 1 ? "s" : ""}-preparation-strategy`;
  return [{
    key, slug, label: `${hours} Hours`, focusSection: "preparation",
    h1: (n, y) => `${n} ${hours} Hour${hours > 1 ? "s" : ""} Preparation Strategy ${y}`,
    intro: (n, y) => `What can you cover for ${n} ${y} in just ${hours} hour${hours > 1 ? "s" : ""}? A high-yield, time-boxed plan focusing on must-do topics, quick formula sheets and a final mock.`,
    metaTitle: (n, y) => `${n} in ${hours} Hour${hours > 1 ? "s" : ""} – Crash Strategy ${y}`,
    metaDescription: (n, y) => `${hours}-hour ${n} ${y} crash preparation: high-yield topics, formula recall, quick mocks and exam-day tips.`,
    bullets: (n) => [
      `Hour-wise focused breakdown`,
      `Top scoring topics in ${n}`,
      `Quick formula + concept recap`,
      `Mock attempt + analysis`,
    ],
  }];
}

function minPlan(key: string, mins: number): ExamStrategy[] {
  const slug = `${mins}-minute-preparation-tips`;
  return [{
    key, slug, label: `${mins} Min`, focusSection: "preparation",
    h1: (n, y) => `${n} ${mins} Minute Preparation Tips ${y}`,
    intro: (n, y) => `Got just ${mins} minutes before ${n} ${y}? Skim these formula recalls, attempt-order tips and quick scoring areas to maximise your final marks.`,
    metaTitle: (n, y) => `${n} ${mins} Minute Tips ${y} – Last-Minute Revision`,
    metaDescription: (n, y) => `${mins} minute ${n} ${y} last-minute revision: formula recall, attempt order, do's & don'ts and topper mantras.`,
    bullets: (n) => [
      `Formula sheet at a glance`,
      `Top 5 must-recall concepts`,
      `Attempt order to maximise marks`,
      `Calm focus checklist for ${n}`,
    ],
  }];
}

export const STRATEGY_SLUGS = EXAM_STRATEGIES.map(s => s.slug);

export function findStrategyBySlug(slug?: string): ExamStrategy | null {
  if (!slug) return null;
  return EXAM_STRATEGIES.find(s => s.slug === slug) ?? null;
}

export function findStrategyByKey(key: string): ExamStrategy | null {
  return EXAM_STRATEGIES.find(s => s.key === key) ?? null;
}
