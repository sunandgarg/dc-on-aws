/**
 * Single registry for all helpful tools.
 * Used by /tools listing, sitemap generator, and SEO routes.
 */
export type ToolEntry = {
  slug: string;
  title: string;
  desc: string;
};

export const TOOLS_REGISTRY: ToolEntry[] = [
  { slug: "lock-target", title: "🎯 Target with AI — Lock Your Dream College", desc: "Tell our AI your dream college. Get a personalised roadmap PDF — exam, books, weekly plan & backup colleges. Built for GenZ." },
  { slug: "compare-colleges", title: "Compare Colleges", desc: "Side-by-side college comparison on fees, placements, and rankings." },
  { slug: "psychometric-test", title: "Psychometric Career Test", desc: "Discover your career personality and best-fit streams in 2 minutes." },
  { slug: "cgpa-converter", title: "CGPA/SGPA Converter", desc: "Convert CGPA or SGPA to percentage easily." },
  { slug: "emi-calculator", title: "Education Loan EMI Calculator", desc: "Calculate your monthly EMI for education loans." },
  { slug: "rank-predictor", title: "Exam Rank Predictor", desc: "Get an estimated rank based on your expected score." },
  { slug: "eligibility-checker", title: "College Eligibility Checker", desc: "Check colleges you're eligible for based on academics." },
  { slug: "bmi-calculator", title: "BMI Calculator", desc: "Calculate your Body Mass Index quickly." },
  { slug: "percentage-calculator", title: "Percentage Calculator", desc: "Calculate percentages, increases, and decreases." },
  { slug: "age-calculator", title: "Age Calculator", desc: "Calculate your exact age in years, months, and days." },
  { slug: "sip-calculator", title: "SIP Calculator", desc: "Plan your investments with SIP calculator." },
  { slug: "word-counter", title: "Word & Character Counter", desc: "Count words, characters, and estimate reading time." },
];

/**
 * Trending dream-college slugs students search for on Google.
 * Auto-served at /lock-target/:slug — useful for sitemap & SEO.
 */
export const LOCK_TARGET_TRENDING_SLUGS = [
  "iit-bombay-cse","iit-delhi-cse","iit-madras-cse","iit-kanpur-cse","iit-kharagpur-cse",
  "iit-roorkee-cse","iit-bhu-cse","iit-guwahati-cse","iit-hyderabad-cse",
  "nit-trichy-cse","nit-warangal-cse","nit-surathkal-cse","nit-rourkela-cse","nit-calicut-cse",
  "iiit-hyderabad-cse","iiit-bangalore","iiit-delhi-cse",
  "bits-pilani-cse","bits-goa-cse","bits-hyderabad-cse",
  "aiims-delhi-mbbs","aiims-jodhpur-mbbs","jipmer-mbbs","afmc-pune-mbbs","maulana-azad-mbbs",
  "iim-ahmedabad-mba","iim-bangalore-mba","iim-calcutta-mba","iim-lucknow-mba","iim-indore-ipm",
  "nlsiu-bangalore-llb","nalsar-hyderabad-llb","nlu-delhi-llb","wbnujs-kolkata-llb",
  "srcc-delhi-bcom","hindu-college-delhi","st-stephens-delhi","miranda-house-delhi","lsr-delhi",
  "nid-ahmedabad-bdes","nift-delhi-bdes","ceed-iitb-mdes",
  "delhi-university-ba","jnu-delhi-ma","bhu-varanasi","jamia-millia-delhi",
  "iisc-bangalore-bsc","iiser-pune-bsc","iiser-kolkata-bsc",
  "vit-vellore-cse","manipal-mit-cse","srm-cse","amrita-cse","thapar-cse",
];

export const TOOL_SLUGS = TOOLS_REGISTRY.map((t) => t.slug);
