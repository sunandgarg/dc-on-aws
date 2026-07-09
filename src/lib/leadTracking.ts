// Helpers for enriching lead submissions with device + source category context.

export type DeviceType = "mobile" | "tablet" | "desktop";

export function detectDeviceType(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  // Treat narrow touch viewports as mobile
  if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 768px)").matches) {
    return "mobile";
  }
  return "desktop";
}

export const SOURCE_CATEGORIES = [
  "college",
  "course",
  "exam",
  "career",
  "scholarship",
  "study_material",
  "college_study_material",
  "news",
  "article",
  "ai_chat",
  "ai_search",
  "homepage",
  "trending_program",
  "online_degree",
  "study_abroad",
  "education_loan",
  "refer_earn",
  "other",
] as const;

export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

export const SOURCE_CATEGORY_LABELS: Record<string, string> = {
  college: "College",
  course: "Course",
  exam: "Exam",
  career: "Career",
  scholarship: "Scholarship",
  study_material: "Study Material",
  college_study_material: "College Study Material",
  news: "News",
  article: "Article",
  ai_chat: "AI Chat",
  ai_search: "AI Search",
  homepage: "Homepage",
  trending_program: "Trending Program",
  online_degree: "Online Degree",
  study_abroad: "Study Abroad",
  education_loan: "Education Loan",
  refer_earn: "Refer & Earn",
  other: "Other",
};

/** Best-effort inference of the broad source category from the current URL + lead source string. */
export function inferSourceCategory(source?: string | null, pathname?: string): SourceCategory {
  const s = (source || "").toLowerCase();
  const p = (pathname ?? (typeof window !== "undefined" ? window.location.pathname : "")).toLowerCase();

  if (s.includes("ai_chat") || p.startsWith("/ai/chat") || p.startsWith("/chat")) return "ai_chat";
  if (s.includes("ai_search") || p.startsWith("/ai/search")) return "ai_search";
  if (s.includes("refer")) return "refer_earn";
  if (s.includes("loan") || p.includes("/loan")) return "education_loan";
  if (s.includes("trending") || p.includes("/trending")) return "trending_program";
  if (s.includes("online_degree") || p.includes("/online-degree")) return "online_degree";
  if (s.includes("study_abroad") || p.includes("/study-abroad")) return "study_abroad";

  if (p.startsWith("/college-study-material") || p.includes("college-study-material")) return "college_study_material";
  if (p.startsWith("/study-material") || p.startsWith("/resources")) return "study_material";
  if (p.startsWith("/news")) return "news";
  if (p.startsWith("/articles") || p.startsWith("/article")) return "article";
  if (p.startsWith("/colleges") || p.startsWith("/college/")) return "college";
  if (p.startsWith("/courses") || p.startsWith("/course/")) return "course";
  if (p.startsWith("/exams") || p.startsWith("/exam/")) return "exam";
  if (p.startsWith("/careers") || p.startsWith("/career/")) return "career";
  if (p.startsWith("/scholarships") || p.startsWith("/scholarship/")) return "scholarship";
  if (p === "/" || p === "") return "homepage";

  return "other";
}
