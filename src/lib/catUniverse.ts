export interface CatUniverseSettings {
  slug: string;
  hero_badge: string;
  title: string;
  subtitle: string;
  primary_cta_label: string;
  primary_cta_href: string;
  toggle_label: string;
  lead_title: string;
  lead_subtitle: string;
  seo_title: string;
  seo_description: string;
  show_home_toggle: boolean;
  is_active: boolean;
}

export interface CatUniverseSection {
  slug: string;
  title: string;
  description: string;
  icon_name: string;
  accent_class: string;
  lead_hook: string;
  display_order: number;
  is_active: boolean;
}

export interface CatUniverseModule {
  slug: string;
  section_slug: string;
  title: string;
  subtitle: string;
  description: string;
  module_type: "calculator" | "predictor" | "resource_hub" | "cutoff_list" | "counselling";
  exam_key: string;
  icon_name: string;
  badge: string;
  stat_label: string;
  stat_value: string;
  detail_points: string;
  audience_text: string;
  primary_cta_label: string;
  primary_cta_href: string;
  lead_source: string;
  display_order: number;
  is_featured: boolean;
  show_on_home: boolean;
  is_active: boolean;
}

export interface CatUniverseResource {
  module_slug: string;
  title: string;
  subtitle: string;
  resource_type: string;
  year: number | null;
  href: string;
  badge: string;
  meta: string;
  display_order: number;
  is_active: boolean;
}

export interface CatUniverseCutoff {
  module_slug: string;
  college_name: string;
  city: string;
  exam_name: string;
  category: string;
  percentile: number;
  cutoff_band: string;
  fees: string;
  avg_package: string;
  college_slug: string;
  highlight: string;
  display_order: number;
  is_active: boolean;
}

export const CAT_UNIVERSE_DEFAULT_SETTINGS: CatUniverseSettings = {
  slug: "default",
  hero_badge: "MBA lead engine",
  title: "CAT Universe",
  subtitle:
    "Everything ambitious MBA aspirants need in one place - score calculators, interview-call estimation, previous-year prep, and cut-off discovery with lead capture woven into every decision point.",
  primary_cta_label: "Start with CAT Score Calculator",
  primary_cta_href: "/cat-universe/cat-score-calculator",
  toggle_label: "Switch homepage into CAT Universe mode",
  lead_title: "Talk to an MBA admission expert",
  lead_subtitle: "Get your shortlist, score interpretation, and next-step plan for free.",
  seo_title: "CAT Universe - CAT, XAT, CMAT calculators, call predictor, cut-offs and MBA guidance",
  seo_description:
    "Explore CAT Universe on DekhoCampus - CAT, XAT and CMAT calculators, IIM call predictor, previous-year prep, cut-off discovery and MBA counselling workflows.",
  show_home_toggle: true,
  is_active: true,
};

export const CAT_UNIVERSE_DEFAULT_SECTIONS: CatUniverseSection[] = [
  {
    slug: "post-exam",
    title: "Post Exam",
    description: "Convert raw attempts into action - score estimates, WAT/SOP help, and next-step strategy.",
    icon_name: "sparkles",
    accent_class: "from-orange-500 to-rose-500",
    lead_hook: "Just attempted CAT, XAT, or CMAT? Get your score interpreted before the market moves.",
    display_order: 1,
    is_active: true,
  },
  {
    slug: "pre-exam",
    title: "Pre Exam",
    description: "Build preparation depth with previous-year archives, pattern memory, and resource-led lead magnets.",
    icon_name: "book-open",
    accent_class: "from-sky-500 to-indigo-500",
    lead_hook: "Unlock year-wise prep assets and get a mentor-backed attempt strategy.",
    display_order: 2,
    is_active: true,
  },
  {
    slug: "post-result",
    title: "Post Result",
    description: "Move from percentile panic to interview planning with call prediction, converts guidance, and mock workflows.",
    icon_name: "target",
    accent_class: "from-violet-500 to-fuchsia-500",
    lead_hook: "Use your percentile to map likely calls, reach schools, and interview readiness.",
    display_order: 3,
    is_active: true,
  },
  {
    slug: "important-college-cutoffs",
    title: "Important College Cut-offs",
    description: "Filter colleges by exam, percentile bands, fees, and placement story without forcing students to leave the funnel.",
    icon_name: "bar-chart-3",
    accent_class: "from-emerald-500 to-teal-500",
    lead_hook: "Show students where their score can realistically convert into an MBA seat.",
    display_order: 4,
    is_active: true,
  },
];

export const CAT_UNIVERSE_DEFAULT_MODULES: CatUniverseModule[] = [
  {
    slug: "sop-exam-score-wat",
    section_slug: "post-exam",
    title: "SOP, Exam Score and WAT Desk",
    subtitle: "Turn uncertainty into a guided admissions narrative",
    description: "A counseling-first hub for statement of purpose, WAT direction, and score interpretation after exam day.",
    module_type: "counselling",
    exam_key: "cat",
    icon_name: "file-text",
    badge: "High-intent",
    stat_label: "Best for",
    stat_value: "MBA applicants entering profile-building mode",
    detail_points: "Score interpretation checklist\nWAT themes and framing\nSOP structure for MBA colleges\nProfile gap identification\n1:1 mentor callback CTA",
    audience_text: "Students who have attempted MBA entrance exams and need profile positioning support.",
    primary_cta_label: "Get SOP and WAT help",
    primary_cta_href: "/auth",
    lead_source: "cat_universe_sop_wat",
    display_order: 1,
    is_featured: true,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "cat-score-calculator",
    section_slug: "post-exam",
    title: "CAT Score Calculator",
    subtitle: "Estimate raw score, percentile band and next action",
    description: "A friction-light calculator inspired by leading CAT score estimators, adapted for DekhoCampus lead capture and follow-up.",
    module_type: "calculator",
    exam_key: "cat",
    icon_name: "calculator",
    badge: "Most wanted",
    stat_label: "Signals shown",
    stat_value: "Score, percentile band, likely cut-off zone",
    detail_points: "Section-wise inputs\nFast percentile estimate\nCut-off alignment\nLead capture after result state",
    audience_text: "CAT takers checking score confidence and B-school direction before official results settle the market.",
    primary_cta_label: "Open calculator",
    primary_cta_href: "/cat-universe/cat-score-calculator",
    lead_source: "cat_universe_cat_score",
    display_order: 2,
    is_featured: true,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "xat-score-calculator",
    section_slug: "post-exam",
    title: "XAT Score Calculator",
    subtitle: "Estimate your XAT performance band quickly",
    description: "Use recent score-vs-percentile market patterns to estimate where your XAT score may land.",
    module_type: "calculator",
    exam_key: "xat",
    icon_name: "calculator",
    badge: "Hot after XAT",
    stat_label: "Built for",
    stat_value: "XLRI and top private MBA aspirants",
    detail_points: "Simple score inputs\nEstimated percentile zone\nXAT-aligned college pathways",
    audience_text: "Students comparing XAT outcomes against private B-school cut-offs and interview possibilities.",
    primary_cta_label: "Check XAT estimate",
    primary_cta_href: "/cat-universe/xat-score-calculator",
    lead_source: "cat_universe_xat_score",
    display_order: 3,
    is_featured: false,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "cmat-score-calculator",
    section_slug: "post-exam",
    title: "CMAT Score Calculator",
    subtitle: "Map CMAT attempts to college shortlisting signals",
    description: "A simple CMAT estimator designed to drive immediate college-fit conversations and low-friction enquiry capture.",
    module_type: "calculator",
    exam_key: "cmat",
    icon_name: "calculator",
    badge: "Lead magnet",
    stat_label: "Works best for",
    stat_value: "Students targeting CMAT-friendly private colleges",
    detail_points: "Quick score estimate\nRecent percentile bands\nCMAT college discovery CTA",
    audience_text: "Students who need fast clarity on where their CMAT outcome can convert into admissions.",
    primary_cta_label: "Estimate CMAT score",
    primary_cta_href: "/cat-universe/cmat-score-calculator",
    lead_source: "cat_universe_cmat_score",
    display_order: 4,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "cat-previous-year-papers",
    section_slug: "pre-exam",
    title: "Last 10 Year CAT Resources",
    subtitle: "Year-wise CAT archive built for repeat visits",
    description: "A rolling CAT prep hub that can house question papers, pattern summaries, and mentor takeaways year by year.",
    module_type: "resource_hub",
    exam_key: "cat",
    icon_name: "book-open",
    badge: "Retention",
    stat_label: "Archive depth",
    stat_value: "10 years of editable cards",
    detail_points: "Year-wise resource cards\nLead gate ready\nAdmin-editable links and notes",
    audience_text: "CAT aspirants who want recent-paper familiarity and curated mentor commentary.",
    primary_cta_label: "Explore CAT archive",
    primary_cta_href: "/cat-universe/cat-previous-year-papers",
    lead_source: "cat_universe_cat_archive",
    display_order: 1,
    is_featured: true,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "xat-previous-year-papers",
    section_slug: "pre-exam",
    title: "Last 10 Year XAT Resources",
    subtitle: "Pattern memory and decision-making support for XAT",
    description: "A dynamic XAT prep archive that keeps year cards, notes and lead capture in one structured loop.",
    module_type: "resource_hub",
    exam_key: "xat",
    icon_name: "book-open",
    badge: "Prep",
    stat_label: "Focus",
    stat_value: "Decision-making and verbal trend review",
    detail_points: "Year-wise cards\nEditable links\nGuided preparation CTA",
    audience_text: "XAT aspirants who benefit from exam-pattern recall and mentor-backed resource flows.",
    primary_cta_label: "Browse XAT archive",
    primary_cta_href: "/cat-universe/xat-previous-year-papers",
    lead_source: "cat_universe_xat_archive",
    display_order: 2,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "mat-previous-year-papers",
    section_slug: "pre-exam",
    title: "Last 10 Year MAT Resources",
    subtitle: "Steady-funnel prep content for MAT seekers",
    description: "Admin-manageable MAT archive cards with clear lead magnets and counseling prompts.",
    module_type: "resource_hub",
    exam_key: "mat",
    icon_name: "book-open",
    badge: "Evergreen",
    stat_label: "Use case",
    stat_value: "Consistent exam-season lead generation",
    detail_points: "Year cards\nCall-back CTA\nQuick prep navigation",
    audience_text: "Students using MAT as a pathway into private management institutes.",
    primary_cta_label: "Open MAT archive",
    primary_cta_href: "/cat-universe/mat-previous-year-papers",
    lead_source: "cat_universe_mat_archive",
    display_order: 3,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "gmat-previous-year-papers",
    section_slug: "pre-exam",
    title: "Last 10 Year GMAT Resources",
    subtitle: "GMAT-focused prep cards for MBA and MiM audiences",
    description: "A reusable GMAT prep area that can support both domestic and overseas pathways.",
    module_type: "resource_hub",
    exam_key: "gmat",
    icon_name: "book-open",
    badge: "Premium traffic",
    stat_label: "Audience",
    stat_value: "GMAT-based MBA and MiM seekers",
    detail_points: "Year-wise assets\nHigh-value lead capture\nProfile-based counselor routing",
    audience_text: "Students exploring higher-ticket GMAT programs in India and abroad.",
    primary_cta_label: "View GMAT resources",
    primary_cta_href: "/cat-universe/gmat-previous-year-papers",
    lead_source: "cat_universe_gmat_archive",
    display_order: 4,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "sat-previous-year-papers",
    section_slug: "pre-exam",
    title: "Last 10 Year SAT Resources",
    subtitle: "SAT archive cards for exam familiarity and parent trust",
    description: "A configurable SAT archive workflow that keeps students and parents moving toward a guided conversation.",
    module_type: "resource_hub",
    exam_key: "sat",
    icon_name: "book-open",
    badge: "Parent friendly",
    stat_label: "Intent",
    stat_value: "High-information pre-application traffic",
    detail_points: "Year cards\nPrep support CTA\nParent-counseling handoff",
    audience_text: "Students and families exploring SAT-based undergraduate applications.",
    primary_cta_label: "Browse SAT resources",
    primary_cta_href: "/cat-universe/sat-previous-year-papers",
    lead_source: "cat_universe_sat_archive",
    display_order: 5,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "interview-calls-converts",
    section_slug: "post-result",
    title: "Interview Calls and Converts",
    subtitle: "Turn percentile into realistic call expectations",
    description: "A counseling-led route for estimating likely interview calls and the kind of conversion strategy a student should pursue.",
    module_type: "predictor",
    exam_key: "cat",
    icon_name: "target",
    badge: "Post-result",
    stat_label: "Outcome",
    stat_value: "Likely, reach and dream call zones",
    detail_points: "Percentile-first estimator\nProfile-sensitive interpretation\nCounselor handoff after shortlist",
    audience_text: "Students who want clarity on interviews, converts and realistic school positioning.",
    primary_cta_label: "Estimate interview calls",
    primary_cta_href: "/cat-universe/interview-calls-converts",
    lead_source: "cat_universe_interview_calls",
    display_order: 1,
    is_featured: true,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "mock-interview-and-dockets",
    section_slug: "post-result",
    title: "Mock Interview and Dockets",
    subtitle: "Collect high-intent MBA leads before GDPI season",
    description: "A lead-focused workflow for interview prep, personal dossier building and mentor callbacks.",
    module_type: "counselling",
    exam_key: "cat",
    icon_name: "briefcase",
    badge: "High-conversion",
    stat_label: "Use case",
    stat_value: "GDPI-season counselling and bookings",
    detail_points: "Mock interview prep CTA\nDocket and profile checklist\nMentor routing and callback",
    audience_text: "Students moving from shortlist to interview preparation.",
    primary_cta_label: "Book interview support",
    primary_cta_href: "/cat-universe/mock-interview-and-dockets",
    lead_source: "cat_universe_mock_interview",
    display_order: 2,
    is_featured: false,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "iim-call-predictor",
    section_slug: "post-result",
    title: "IIM Call Predictor",
    subtitle: "Percentile plus profile-aware IIM shortlist guidance",
    description: "Inspired by leading market predictors, but designed to keep users inside the DekhoCampus conversion funnel.",
    module_type: "predictor",
    exam_key: "cat",
    icon_name: "target",
    badge: "Core feature",
    stat_label: "Inputs",
    stat_value: "Percentile, category, academics, work ex",
    detail_points: "Profile-aware scoring\nLikely and reach segmentation\nCut-off informed shortlist output",
    audience_text: "CAT students looking for IIM and B-school call probability insights.",
    primary_cta_label: "Run IIM predictor",
    primary_cta_href: "/cat-universe/iim-call-predictor",
    lead_source: "cat_universe_iim_predictor",
    display_order: 3,
    is_featured: true,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "cat-based-college-cutoffs",
    section_slug: "important-college-cutoffs",
    title: "CAT Based College Cut-offs",
    subtitle: "Explore percentile-linked MBA options by CAT outcome",
    description: "Filterable cut-off rows for CAT-based MBA colleges, built to reduce exits and increase counselor enquiries.",
    module_type: "cutoff_list",
    exam_key: "cat",
    icon_name: "bar-chart-3",
    badge: "SEO pillar",
    stat_label: "Best for",
    stat_value: "Students comparing CAT options quickly",
    detail_points: "Percentile-led discovery\nFees and package context\nDirect enquiry points",
    audience_text: "CAT aspirants deciding where to apply or where to expect calls.",
    primary_cta_label: "See CAT cut-offs",
    primary_cta_href: "/cat-universe/cat-based-college-cutoffs",
    lead_source: "cat_universe_cat_cutoffs",
    display_order: 1,
    is_featured: true,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "nmat-based-college-cutoffs",
    section_slug: "important-college-cutoffs",
    title: "NMAT Based College Cut-offs",
    subtitle: "Map NMAT performance to private MBA opportunities",
    description: "A dynamic cut-off page for NMAT-targeting students who want quick college discovery and conversion prompts.",
    module_type: "cutoff_list",
    exam_key: "nmat",
    icon_name: "bar-chart-3",
    badge: "Private B-schools",
    stat_label: "Intent",
    stat_value: "NMIMS and NMAT-accepting colleges",
    detail_points: "Score-led college list\nFees and package context\nLead capture throughout",
    audience_text: "Students exploring NMAT-based MBA admissions.",
    primary_cta_label: "View NMAT options",
    primary_cta_href: "/cat-universe/nmat-based-college-cutoffs",
    lead_source: "cat_universe_nmat_cutoffs",
    display_order: 2,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "snap-based-cutoffs",
    section_slug: "important-college-cutoffs",
    title: "SNAP Based Cut-offs",
    subtitle: "Find Symbiosis-aligned MBA targets faster",
    description: "A SNAP-focused discovery page that helps students map performance to likely Symbiosis pathways.",
    module_type: "cutoff_list",
    exam_key: "snap",
    icon_name: "bar-chart-3",
    badge: "Brand-heavy",
    stat_label: "Ideal for",
    stat_value: "Symbiosis-oriented students",
    detail_points: "SNAP-based college list\nCut-off and fee context\nCounselor escalation CTA",
    audience_text: "Students targeting Symbiosis institutes and related management schools.",
    primary_cta_label: "See SNAP cut-offs",
    primary_cta_href: "/cat-universe/snap-based-cutoffs",
    lead_source: "cat_universe_snap_cutoffs",
    display_order: 3,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "xat-based-college-cutoffs",
    section_slug: "important-college-cutoffs",
    title: "XAT Based College Cut-offs",
    subtitle: "From XLRI dreams to realistic private-school targets",
    description: "A decision-ready XAT cut-off module designed for traffic retention and counselor conversion.",
    module_type: "cutoff_list",
    exam_key: "xat",
    icon_name: "bar-chart-3",
    badge: "Decision-ready",
    stat_label: "Coverage",
    stat_value: "XLRI and XAT-accepting schools",
    detail_points: "Percentile-led exploration\nCity, fees and package view\nLead prompts after filter use",
    audience_text: "XAT candidates comparing flagship and reachable colleges.",
    primary_cta_label: "Browse XAT cut-offs",
    primary_cta_href: "/cat-universe/xat-based-college-cutoffs",
    lead_source: "cat_universe_xat_cutoffs",
    display_order: 4,
    is_featured: false,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "top-gmat-based-colleges",
    section_slug: "important-college-cutoffs",
    title: "Top GMAT Based Colleges",
    subtitle: "Premium-intent discovery for GMAT candidates",
    description: "A high-value college discovery flow for GMAT users looking at MBA programs that accept GMAT scores.",
    module_type: "cutoff_list",
    exam_key: "gmat",
    icon_name: "bar-chart-3",
    badge: "Premium",
    stat_label: "Ideal for",
    stat_value: "Higher-ticket counseling journeys",
    detail_points: "GMAT college list\nApproximate score bands\nCounselor follow-up hooks",
    audience_text: "Students evaluating GMAT-based MBA opportunities in India and abroad-facing institutions.",
    primary_cta_label: "Find GMAT colleges",
    primary_cta_href: "/cat-universe/top-gmat-based-colleges",
    lead_source: "cat_universe_gmat_colleges",
    display_order: 5,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "top-gmat-based-colleges-mim",
    section_slug: "important-college-cutoffs",
    title: "Top GMAT Based Colleges - MiM Programs",
    subtitle: "Management-in-Master pathways for globally mobile students",
    description: "A dedicated MiM discovery surface for GMAT/GRE-adjacent aspirants and international admissions counseling.",
    module_type: "cutoff_list",
    exam_key: "gmat",
    icon_name: "bar-chart-3",
    badge: "Global",
    stat_label: "Focus",
    stat_value: "MiM-ready student journeys",
    detail_points: "MiM-friendly institutions\nPremium lead capture\nParent-involved counselling pathways",
    audience_text: "Students interested in MiM programs and profile-led overseas planning.",
    primary_cta_label: "Explore MiM colleges",
    primary_cta_href: "/cat-universe/top-gmat-based-colleges-mim",
    lead_source: "cat_universe_mim_colleges",
    display_order: 6,
    is_featured: false,
    show_on_home: false,
    is_active: true,
  },
  {
    slug: "iits-cat-cutoff",
    section_slug: "important-college-cutoffs",
    title: "IITs CAT Cutoff",
    subtitle: "Specialized IIT MBA discovery by percentile band",
    description: "An IIT MBA-oriented cut-off module that captures strong ROI-seeking CAT traffic.",
    module_type: "cutoff_list",
    exam_key: "cat",
    icon_name: "bar-chart-3",
    badge: "High ROI",
    stat_label: "Value angle",
    stat_value: "ROI-focused MBA seekers",
    detail_points: "IIT MBA comparison\nPercentile bands\nFee vs package positioning",
    audience_text: "Students who want strong MBA ROI without only chasing legacy IIM brands.",
    primary_cta_label: "View IIT MBA cut-offs",
    primary_cta_href: "/cat-universe/iits-cat-cutoff",
    lead_source: "cat_universe_iit_cutoffs",
    display_order: 7,
    is_featured: true,
    show_on_home: true,
    is_active: true,
  },
  {
    slug: "cmat-based-colleges-and-cutoffs",
    section_slug: "important-college-cutoffs",
    title: "CMAT Based Colleges and Cut-offs",
    subtitle: "Fast CMAT discovery for applications that need urgency",
    description: "A CMAT-oriented decision page that pairs score bands with practical college options and enquiry prompts.",
    module_type: "cutoff_list",
    exam_key: "cmat",
    icon_name: "bar-chart-3",
    badge: "Actionable",
    stat_label: "Good for",
    stat_value: "Late-stage private college applications",
    detail_points: "CMAT-friendly colleges\nApproximate percentile context\nQuick call-back capture",
    audience_text: "Students shortlisting private MBA options after CMAT.",
    primary_cta_label: "See CMAT colleges",
    primary_cta_href: "/cat-universe/cmat-based-colleges-and-cutoffs",
    lead_source: "cat_universe_cmat_cutoffs",
    display_order: 8,
    is_featured: false,
    show_on_home: true,
    is_active: true,
  },
];

export const CAT_UNIVERSE_DEFAULT_RESOURCES: CatUniverseResource[] = (() => {
  const currentYear = new Date().getFullYear() - 1;
  const buildExamYears = (module_slug: string, examLabel: string) =>
    Array.from({ length: 10 }, (_, index) => {
      const year = currentYear - index;
      return {
        module_slug,
        title: `${examLabel} ${year} resource pack`,
        subtitle: `Previous-year paper direction, pattern recap and mentor notes for ${year}.`,
        resource_type: "year_pack",
        year,
        href: "",
        badge: "Add PDF or link in admin",
        meta: "Lead gate ready",
        display_order: index + 1,
        is_active: true,
      };
    });

  return [
    ...buildExamYears("cat-previous-year-papers", "CAT"),
    ...buildExamYears("xat-previous-year-papers", "XAT"),
    ...buildExamYears("mat-previous-year-papers", "MAT"),
    ...buildExamYears("gmat-previous-year-papers", "GMAT"),
    ...buildExamYears("sat-previous-year-papers", "SAT"),
    {
      module_slug: "sop-exam-score-wat",
      title: "WAT topic bank",
      subtitle: "MBA-friendly themes students can practice with mentor framing.",
      resource_type: "template",
      year: null,
      href: "",
      badge: "Counselling hook",
      meta: "Turn into PDF or article later",
      display_order: 1,
      is_active: true,
    },
    {
      module_slug: "sop-exam-score-wat",
      title: "MBA SOP starter framework",
      subtitle: "Reusable prompt structure for profile storytelling.",
      resource_type: "template",
      year: null,
      href: "",
      badge: "High-intent",
      meta: "Lead magnet",
      display_order: 2,
      is_active: true,
    },
    {
      module_slug: "mock-interview-and-dockets",
      title: "Mock interview checklist",
      subtitle: "A structured practice list covering academics, goals and current affairs.",
      resource_type: "checklist",
      year: null,
      href: "",
      badge: "Interview prep",
      meta: "Great for callbacks",
      display_order: 1,
      is_active: true,
    },
    {
      module_slug: "mock-interview-and-dockets",
      title: "Docket preparation guide",
      subtitle: "Collect documents, profile bullets and answer-ready evidence before GDPI.",
      resource_type: "checklist",
      year: null,
      href: "",
      badge: "Operations",
      meta: "Easy conversion trigger",
      display_order: 2,
      is_active: true,
    },
  ];
})();

export const CAT_UNIVERSE_DEFAULT_CUTOFFS: CatUniverseCutoff[] = [
  { module_slug: "cat-based-college-cutoffs", college_name: "IIM Ahmedabad", city: "Ahmedabad", exam_name: "CAT", category: "General", percentile: 99.5, cutoff_band: "99.5+", fees: "₹26L", avg_package: "₹35L+", college_slug: "iim-ahmedabad", highlight: "Top-tier old IIM", display_order: 1, is_active: true },
  { module_slug: "cat-based-college-cutoffs", college_name: "IIM Bangalore", city: "Bengaluru", exam_name: "CAT", category: "General", percentile: 99.4, cutoff_band: "99.4+", fees: "₹25L", avg_package: "₹35L+", college_slug: "iim-bangalore", highlight: "Strong brand and placements", display_order: 2, is_active: true },
  { module_slug: "cat-based-college-cutoffs", college_name: "FMS Delhi", city: "Delhi", exam_name: "CAT", category: "General", percentile: 98.5, cutoff_band: "98.5+", fees: "₹2L", avg_package: "₹34L+", college_slug: "", highlight: "Ultra-high ROI", display_order: 3, is_active: true },
  { module_slug: "cat-based-college-cutoffs", college_name: "MDI Gurgaon", city: "Gurugram", exam_name: "CAT", category: "General", percentile: 95, cutoff_band: "95+", fees: "₹25L", avg_package: "₹27L+", college_slug: "", highlight: "Private B-school benchmark", display_order: 4, is_active: true },
  { module_slug: "cat-based-college-cutoffs", college_name: "IIM Trichy", city: "Tiruchirappalli", exam_name: "CAT", category: "General", percentile: 94, cutoff_band: "94+", fees: "₹20L", avg_package: "₹20L+", college_slug: "", highlight: "New IIM value play", display_order: 5, is_active: true },
  { module_slug: "cat-based-college-cutoffs", college_name: "IMT Ghaziabad", city: "Ghaziabad", exam_name: "CAT", category: "General", percentile: 90, cutoff_band: "90+", fees: "₹23L", avg_package: "₹16L+", college_slug: "", highlight: "Strong marketer brand recall", display_order: 6, is_active: true },
  { module_slug: "cat-based-college-cutoffs", college_name: "FORE School of Management", city: "New Delhi", exam_name: "CAT", category: "General", percentile: 85, cutoff_band: "85+", fees: "₹23L", avg_package: "₹16L+", college_slug: "", highlight: "Good for 85+ band", display_order: 7, is_active: true },

  { module_slug: "nmat-based-college-cutoffs", college_name: "NMIMS Mumbai", city: "Mumbai", exam_name: "NMAT", category: "General", percentile: 94, cutoff_band: "235+ score equivalent", fees: "₹25L", avg_package: "₹26L+", college_slug: "", highlight: "Flagship NMAT target", display_order: 1, is_active: true },
  { module_slug: "nmat-based-college-cutoffs", college_name: "NMIMS Bengaluru", city: "Bengaluru", exam_name: "NMAT", category: "General", percentile: 88, cutoff_band: "220+ score equivalent", fees: "₹20L", avg_package: "₹14L+", college_slug: "", highlight: "High-interest private option", display_order: 2, is_active: true },
  { module_slug: "nmat-based-college-cutoffs", college_name: "TAPMI", city: "Manipal", exam_name: "NMAT", category: "General", percentile: 86, cutoff_band: "215+ score equivalent", fees: "₹19L", avg_package: "₹14L+", college_slug: "", highlight: "Stable NMAT pathway", display_order: 3, is_active: true },

  { module_slug: "snap-based-cutoffs", college_name: "SIBM Pune", city: "Pune", exam_name: "SNAP", category: "General", percentile: 97, cutoff_band: "97+", fees: "₹24L", avg_package: "₹26L+", college_slug: "", highlight: "Top Symbiosis target", display_order: 1, is_active: true },
  { module_slug: "snap-based-cutoffs", college_name: "SCMHRD", city: "Pune", exam_name: "SNAP", category: "General", percentile: 94, cutoff_band: "94+", fees: "₹23L", avg_package: "₹24L+", college_slug: "", highlight: "Premium HR and MBA brand", display_order: 2, is_active: true },
  { module_slug: "snap-based-cutoffs", college_name: "SIIB", city: "Pune", exam_name: "SNAP", category: "General", percentile: 90, cutoff_band: "90+", fees: "₹20L", avg_package: "₹14L+", college_slug: "", highlight: "Good conversion target", display_order: 3, is_active: true },

  { module_slug: "xat-based-college-cutoffs", college_name: "XLRI Jamshedpur", city: "Jamshedpur", exam_name: "XAT", category: "General", percentile: 98, cutoff_band: "98+", fees: "₹30L", avg_package: "₹29L+", college_slug: "", highlight: "XAT flagship", display_order: 1, is_active: true },
  { module_slug: "xat-based-college-cutoffs", college_name: "XIM University", city: "Bhubaneswar", exam_name: "XAT", category: "General", percentile: 91, cutoff_band: "91+", fees: "₹21L", avg_package: "₹19L+", college_slug: "", highlight: "XAT-friendly conversion play", display_order: 2, is_active: true },
  { module_slug: "xat-based-college-cutoffs", college_name: "IMT Ghaziabad", city: "Ghaziabad", exam_name: "XAT", category: "General", percentile: 90, cutoff_band: "90+", fees: "₹23L", avg_package: "₹16L+", college_slug: "", highlight: "Strong private option", display_order: 3, is_active: true },
  { module_slug: "xat-based-college-cutoffs", college_name: "TAPMI", city: "Manipal", exam_name: "XAT", category: "General", percentile: 85, cutoff_band: "85+", fees: "₹19L", avg_package: "₹14L+", college_slug: "", highlight: "Reachable XAT target", display_order: 4, is_active: true },

  { module_slug: "top-gmat-based-colleges", college_name: "ISB Hyderabad", city: "Hyderabad", exam_name: "GMAT", category: "General", percentile: 95, cutoff_band: "GMAT 700+ typical", fees: "₹42L+", avg_package: "₹34L+", college_slug: "", highlight: "Premium one-year MBA", display_order: 1, is_active: true },
  { module_slug: "top-gmat-based-colleges", college_name: "SPJIMR PGPM", city: "Mumbai", exam_name: "GMAT", category: "General", percentile: 88, cutoff_band: "GMAT 650+ typical", fees: "₹22L+", avg_package: "₹20L+", college_slug: "", highlight: "Experienced candidates", display_order: 2, is_active: true },
  { module_slug: "top-gmat-based-colleges", college_name: "Great Lakes Chennai", city: "Chennai", exam_name: "GMAT", category: "General", percentile: 80, cutoff_band: "GMAT 600+ typical", fees: "₹18L+", avg_package: "₹15L+", college_slug: "", highlight: "Accessible one-year route", display_order: 3, is_active: true },

  { module_slug: "top-gmat-based-colleges-mim", college_name: "SP Jain Global - MiM pathway", city: "Dubai / Singapore / Sydney", exam_name: "GMAT", category: "General", percentile: 85, cutoff_band: "Profile-driven", fees: "₹35L+", avg_package: "Varies", college_slug: "", highlight: "Global mobility", display_order: 1, is_active: true },
  { module_slug: "top-gmat-based-colleges-mim", college_name: "ESCP-style MiM shortlisting", city: "Europe", exam_name: "GMAT", category: "General", percentile: 85, cutoff_band: "Profile-driven", fees: "High-ticket", avg_package: "Varies", college_slug: "", highlight: "Overseas counselling hook", display_order: 2, is_active: true },

  { module_slug: "iits-cat-cutoff", college_name: "IIT Delhi DMS", city: "Delhi", exam_name: "CAT", category: "General", percentile: 96, cutoff_band: "96+", fees: "₹11L", avg_package: "₹25L+", college_slug: "", highlight: "Strong ROI", display_order: 1, is_active: true },
  { module_slug: "iits-cat-cutoff", college_name: "IIT Bombay SJMSOM", city: "Mumbai", exam_name: "CAT", category: "General", percentile: 98, cutoff_band: "98+", fees: "₹15L", avg_package: "₹28L+", college_slug: "", highlight: "Premium IIT MBA", display_order: 2, is_active: true },
  { module_slug: "iits-cat-cutoff", college_name: "IIT Kharagpur VGSoM", city: "Kharagpur", exam_name: "CAT", category: "General", percentile: 90, cutoff_band: "90+", fees: "₹12L", avg_package: "₹22L+", college_slug: "", highlight: "Strong 90+ option", display_order: 3, is_active: true },
  { module_slug: "iits-cat-cutoff", college_name: "IIT Kanpur DoMS", city: "Kanpur", exam_name: "CAT", category: "General", percentile: 90, cutoff_band: "90+", fees: "₹5L", avg_package: "₹18L+", college_slug: "", highlight: "Very high ROI", display_order: 4, is_active: true },

  { module_slug: "cmat-based-colleges-and-cutoffs", college_name: "K J Somaiya Institute of Management", city: "Mumbai", exam_name: "CMAT", category: "General", percentile: 95, cutoff_band: "95+", fees: "₹22L", avg_package: "₹13L+", college_slug: "", highlight: "High urban demand", display_order: 1, is_active: true },
  { module_slug: "cmat-based-colleges-and-cutoffs", college_name: "Welingkar Mumbai", city: "Mumbai", exam_name: "CMAT", category: "General", percentile: 90, cutoff_band: "90+", fees: "₹14L", avg_package: "₹12L+", college_slug: "", highlight: "Strong CMAT interest", display_order: 2, is_active: true },
  { module_slug: "cmat-based-colleges-and-cutoffs", college_name: "PUMBA", city: "Pune", exam_name: "CMAT", category: "General", percentile: 92, cutoff_band: "92+", fees: "₹2L", avg_package: "₹9L+", college_slug: "", highlight: "Excellent ROI", display_order: 3, is_active: true },
];

export const CAT_UNIVERSE_EXAM_LABELS: Record<string, string> = {
  cat: "CAT",
  xat: "XAT",
  cmat: "CMAT",
  mat: "MAT",
  nmat: "NMAT",
  snap: "SNAP",
  gmat: "GMAT",
  sat: "SAT",
};

export function parseMultiline(value?: string | null) {
  return (value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
