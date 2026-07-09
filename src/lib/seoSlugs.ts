/**
 * SEO Sub-Slug Utilities
 * 
 * Generates SEO-friendly headings and meta titles based on active filters.
 * These are optimized for high-volume search queries in the Indian education space.
 * 
 * Common search patterns:
 * - "Top engineering colleges in Delhi"
 * - "Best MBA courses in India 2026"
 * - "NEET exam preparation tips"
 * - "B.Tech colleges in Maharashtra fees"
 * - "Private medical colleges in Karnataka"
 */

/** Generate SEO heading for college listings */
export function getCollegeHeading(filters: {
  courseGroup?: string;
  stream?: string;
  state?: string;
  city?: string;
  type?: string;
  exam?: string;
  approval?: string;
}) {
  const parts: string[] = ["Top"];

  // Type (Private/Government)
  if (filters.type) parts.push(filters.type);

  // Course group takes priority over stream
  if (filters.courseGroup) parts.push(filters.courseGroup);
  else if (filters.stream) parts.push(filters.stream);

  // Exam acceptance
  if (filters.exam) parts.push(`Accepting ${filters.exam}`);

  parts.push("Colleges");

  // Approval
  if (filters.approval) parts.push(`(${filters.approval} Approved)`);

  // Location
  const location = filters.city || filters.state || "India";
  parts.push(`in ${location}`);

  return parts.join(" ");
}

/** Generate SEO heading for course listings */
export function getCourseHeading(filters: {
  courseGroup?: string;
  stream?: string;
  mode?: string;
  duration?: string;
}) {
  const parts: string[] = ["Top"];

  if (filters.mode) parts.push(filters.mode);
  if (filters.courseGroup) parts.push(filters.courseGroup);
  else if (filters.stream) parts.push(filters.stream);

  parts.push("Courses in India");

  if (filters.duration) parts.push(`- ${filters.duration}`);

  return parts.join(" ");
}

/** Generate SEO heading for exam listings */
export function getExamHeading(filters: {
  category?: string;
  stream?: string;
  courseGroup?: string;
  level?: string;
}) {
  const parts: string[] = ["Top"];

  if (filters.level) parts.push(filters.level + " Level");
  if (filters.courseGroup) parts.push(filters.courseGroup);
  else if (filters.stream) parts.push(filters.stream);
  else if (filters.category) parts.push(filters.category);

  parts.push("Entrance Exams in India");

  return parts.join(" ");
}

/** Generate URL-friendly slug from filter state */
export function filtersToSearchParams(filters: Record<string, string | string[]>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      if (value.length === 1) params.set(key, value[0]);
    } else {
      params.set(key, value);
    }
  }
  return params;
}

/** Common SEO sub-slug configurations for colleges */
export const collegeSeoRoutes = [
  // By stream
  { label: "Engineering Colleges", params: { stream: "Engineering" } },
  { label: "Medical Colleges", params: { stream: "Medical" } },
  { label: "Management Colleges", params: { stream: "Management" } },
  { label: "Law Colleges", params: { stream: "Law" } },
  { label: "Science Colleges", params: { stream: "Science" } },
  { label: "Arts Colleges", params: { stream: "Arts & Humanities" } },
  { label: "Commerce Colleges", params: { stream: "Commerce" } },
  { label: "Design Colleges", params: { stream: "Design" } },
  // By city
  { label: "Colleges in Delhi", params: { state: "Delhi" } },
  { label: "Colleges in Mumbai", params: { city: "Mumbai", state: "Maharashtra" } },
  { label: "Colleges in Bangalore", params: { city: "Bangalore", state: "Karnataka" } },
  { label: "Colleges in Chennai", params: { city: "Chennai", state: "Tamil Nadu" } },
  { label: "Colleges in Hyderabad", params: { city: "Hyderabad", state: "Telangana" } },
  { label: "Colleges in Pune", params: { city: "Pune", state: "Maharashtra" } },
  { label: "Colleges in Kolkata", params: { city: "Kolkata", state: "West Bengal" } },
  // By course group
  { label: "B.Tech Colleges", params: { group: "B.Tech" } },
  { label: "MBA Colleges", params: { group: "MBA" } },
  { label: "MBBS Colleges", params: { group: "MBBS" } },
  { label: "BBA Colleges", params: { group: "BBA" } },
  { label: "B.Com Colleges", params: { group: "B.Com" } },
  { label: "B.Sc Colleges", params: { group: "B.Sc" } },
  { label: "LLB Colleges", params: { group: "LLB" } },
  // Combined
  { label: "Engineering Colleges in Delhi", params: { stream: "Engineering", state: "Delhi" } },
  { label: "Medical Colleges in Karnataka", params: { stream: "Medical", state: "Karnataka" } },
  { label: "MBA Colleges in Mumbai", params: { group: "MBA", city: "Mumbai", state: "Maharashtra" } },
];

/** Common SEO sub-slug configurations for courses */
export const courseSeoRoutes = [
  { label: "Engineering Courses", params: { stream: "Engineering" } },
  { label: "Medical Courses", params: { stream: "Medical" } },
  { label: "Management Courses", params: { stream: "Management" } },
  { label: "B.Tech Courses", params: { group: "B.Tech" } },
  { label: "MBA Courses", params: { group: "MBA" } },
  { label: "MBBS Courses", params: { group: "MBBS" } },
  { label: "BCA Courses", params: { group: "BCA" } },
  { label: "MCA Courses", params: { group: "MCA" } },
  { label: "B.Sc Courses", params: { group: "B.Sc" } },
  { label: "Online Courses", params: { mode: "Online" } },
  { label: "Distance Learning Courses", params: { mode: "Distance" } },
];

/** Common SEO sub-slug configurations for exams */
export const examSeoRoutes = [
  { label: "Engineering Entrance Exams", params: { stream: "Engineering" } },
  { label: "Medical Entrance Exams", params: { stream: "Medical" } },
  { label: "Management Entrance Exams", params: { stream: "Management" } },
  { label: "Law Entrance Exams", params: { stream: "Law" } },
  { label: "National Level Exams", params: { level: "National" } },
  { label: "State Level Exams", params: { level: "State" } },
  { label: "University Level Exams", params: { level: "University" } },
];
