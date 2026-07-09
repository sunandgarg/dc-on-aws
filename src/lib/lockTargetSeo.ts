/**
 * Per-slug rich SEO metadata for /lock-target/:slug routes.
 * Generates GenZ-targeted, intent-rich titles/descriptions/keywords + JSON-LD HowTo schema
 * so each trending target ranks for the actual queries students search.
 */

const SITE = "https://ui.dekhocampus.com";
const BRAND = "DekhoCampus";
const YEAR = new Date().getFullYear() + 1; // forward-looking SEO

// Token → expansion map for nicer titles
const TOKEN_MAP: Record<string, string> = {
  iit: "IIT",
  nit: "NIT",
  iiit: "IIIT",
  iim: "IIM",
  bits: "BITS",
  aiims: "AIIMS",
  nlsiu: "NLSIU",
  nalsar: "NALSAR",
  jipmer: "JIPMER",
  afmc: "AFMC",
  nift: "NIFT",
  nid: "NID",
  srcc: "SRCC",
  lsr: "LSR",
  jnu: "JNU",
  bhu: "BHU",
  du: "Delhi University",
  vit: "VIT",
  iiser: "IISER",
  iisc: "IISc",
  ipm: "IPM",
  mba: "MBA",
  mbbs: "MBBS",
  cse: "CSE",
  llb: "LL.B",
  bcom: "B.Com",
  bdes: "B.Des",
  bsc: "B.Sc",
  bba: "BBA",
  btech: "B.Tech",
};

const COURSE_TO_EXAMS: Record<string, string[]> = {
  cse: ["JEE Main", "JEE Advanced", "BITSAT"],
  btech: ["JEE Main", "JEE Advanced", "BITSAT"],
  mbbs: ["NEET UG"],
  llb: ["CLAT", "AILET"],
  mba: ["CAT", "XAT", "GMAT"],
  ipm: ["IPMAT", "JIPMAT"],
  bdes: ["UCEED", "NID DAT", "NIFT Entrance"],
  bba: ["IPMAT", "DU JAT", "SET"],
  bcom: ["CUET UG"],
  bsc: ["CUET UG", "IISER Aptitude Test", "KVPY"],
};

function pretty(slug: string): { title: string; college: string; course?: string } {
  const parts = slug.split("-").filter(Boolean);
  const mapped = parts.map((p) => TOKEN_MAP[p.toLowerCase()] || (p[0]?.toUpperCase() + p.slice(1)));
  // Heuristic: last token is course if it's a recognised course token
  const lastRaw = parts[parts.length - 1]?.toLowerCase() || "";
  const isCourse = lastRaw in COURSE_TO_EXAMS;
  const course = isCourse ? TOKEN_MAP[lastRaw] || lastRaw.toUpperCase() : undefined;
  const collegeParts = isCourse ? mapped.slice(0, -1) : mapped;
  const college = collegeParts.join(" ").trim() || mapped.join(" ");
  return { title: college + (course ? " " + course : ""), college, course };
}

export interface LockTargetSeo {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogImage: string;
  jsonLd: object[];
  hero: { college: string; course?: string };
}

export function buildLockTargetSeo(slug?: string): LockTargetSeo {
  if (!slug) {
    return {
      title: `🎯 Target with AI — Lock Your Dream College ${YEAR} | ${BRAND}`,
      description: `Tell our AI your dream college. Get a personalised ${YEAR} roadmap PDF — entrance exam, books, weekly plan, mock schedule and backup colleges. Free, GenZ-built.`,
      keywords: [
        "lock target",
        "dream college roadmap",
        "AI college mentor",
        "JEE roadmap",
        "NEET roadmap",
        "CUET roadmap",
        "CLAT roadmap",
        "CAT roadmap",
        `dream college ${YEAR}`,
        "how to crack IIT",
        "how to crack AIIMS",
        "how to crack IIM",
        "study plan class 11 12",
        "college predictor",
        "GenZ study plan",
        "free roadmap pdf",
      ].join(", "),
      canonical: `${SITE}/lock-target`,
      ogImage: `${SITE}/og-lock-target.jpg`,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Target with AI — Lock Your Dream College",
          applicationCategory: "EducationApplication",
          operatingSystem: "Web",
          description: "AI-powered roadmap to your dream college with downloadable PDF.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          url: `${SITE}/lock-target`,
        },
      ],
      hero: { college: "your dream college" },
    };
  }

  const p = pretty(slug);
  const exams = (p.course && COURSE_TO_EXAMS[p.course.toLowerCase()]) || [];
  const examPhrase = exams.length ? exams.slice(0, 2).join(" / ") : "the right entrance exam";
  const target = p.course ? `${p.college} ${p.course}` : p.college;

  const title = `${target} Roadmap ${YEAR} 🎯 Cut-off, Exam, Books & PDF | ${BRAND}`;
  const description = `Free AI roadmap to crack ${target} in ${YEAR}. ${examPhrase} target score, weekly study plan, best books, mock schedule, backup colleges & downloadable PDF — built for GenZ.`;

  const seedKeywords = [
    `${target} roadmap`,
    `how to get into ${p.college}`,
    `how to crack ${target}`,
    `${target} ${YEAR}`,
    `${p.college} cut off ${YEAR}`,
    `${p.college} eligibility`,
    `${p.college} preparation strategy`,
    `${target} study plan`,
    `${target} books`,
    `${p.college} admission process`,
    `dream college ${p.college}`,
    `is ${p.college} possible`,
    `${target} mock test plan`,
    `${target} class 11 plan`,
    `${target} class 12 plan`,
    `${target} dropper strategy`,
    ...exams.map((e) => `${e} preparation`),
    ...exams.map((e) => `${e} ${YEAR}`),
    "lock target",
    "AI college mentor",
    "free roadmap pdf",
  ];
  const keywords = Array.from(new Set(seedKeywords)).slice(0, 25).join(", ");

  const canonical = `${SITE}/lock-target/${slug}`;
  const ogImage = `${SITE}/og-lock-target.jpg`;

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to crack ${target} in ${YEAR} — AI roadmap`,
      description,
      totalTime: "P12M",
      step: [
        { "@type": "HowToStep", name: "Lock your target", text: `Pick ${target} as your dream college and commit.` },
        { "@type": "HowToStep", name: "Crack the entrance", text: `Build a phase-wise plan for ${examPhrase}.` },
        { "@type": "HowToStep", name: "Follow weekly plan", text: "Stick to a subject-wise weekly study schedule and mock test cycle." },
        { "@type": "HowToStep", name: "Backup plan", text: "Always have 3–5 backup colleges from the same exam." },
        { "@type": "HowToStep", name: "Download PDF", text: "Download your personalised AI roadmap PDF and revisit it monthly." },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Lock Your Target", item: `${SITE}/lock-target` },
        { "@type": "ListItem", position: 3, name: target, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Which exam do I need for ${target}?`,
          acceptedAnswer: { "@type": "Answer", text: `Most aspirants enter ${target} via ${examPhrase}. The AI roadmap maps the exact exam, syllabus & target score for you.` },
        },
        {
          "@type": "Question",
          name: `Is ${p.college} possible from Class 11 / 12?`,
          acceptedAnswer: { "@type": "Answer", text: `Yes — with a focused phase-wise plan starting today. The roadmap shows weekly hours, books and mocks to reach the cutoff.` },
        },
        {
          "@type": "Question",
          name: "Do I get a downloadable PDF?",
          acceptedAnswer: { "@type": "Answer", text: "Yes. Every locked target ships a free branded PDF roadmap you can print or share." },
        },
      ],
    },
  ];

  return { title, description, keywords, canonical, ogImage, jsonLd, hero: { college: p.college, course: p.course } };
}
