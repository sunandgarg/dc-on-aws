/**
 * SEO Slug Route Utilities
 * 
 * Converts SEO-friendly URL slugs like "top-btech-colleges-in-delhi"
 * into filter parameters for listing pages.
 */

/** Parse a college SEO slug into filter params */
export function parseCollegeSlug(slug: string): Record<string, string> {
  const filters: Record<string, string> = {};
  const s = slug.toLowerCase();

  // Course groups
  const courseGroups: Record<string, string> = {
    "btech": "B.Tech", "mtech": "M.Tech", "mba": "MBA", "mbbs": "MBBS",
    "bba": "BBA", "bcom": "B.Com", "mcom": "M.Com", "bsc": "B.Sc", "msc": "M.Sc",
    "llb": "LLB", "mca": "MCA", "bca": "BCA", "phd": "PhD",
  };
  for (const [key, val] of Object.entries(courseGroups)) {
    if (s.includes(key)) { filters.group = val; break; }
  }

  // Streams
  const streams: Record<string, string> = {
    "engineering": "Engineering", "medical": "Medical", "management": "Management",
    "law": "Law", "science": "Science", "arts": "Arts & Humanities",
    "commerce": "Commerce", "design": "Design", "pharmacy": "Pharmacy",
  };
  if (!filters.group) {
    for (const [key, val] of Object.entries(streams)) {
      if (s.includes(key)) { filters.stream = val; break; }
    }
  }

  // Types
  if (s.includes("private")) filters.type = "Private";
  else if (s.includes("government")) filters.type = "Government";

  // Locations - major Indian cities/states
  const locations: Record<string, { state: string; city?: string }> = {
    // Longer/more specific keys MUST be checked before shorter substrings
    // (e.g. "delhi-ncr" before "delhi", "tamil-nadu" before any "tamil").
    "delhi-ncr": { state: "Delhi NCR" },
    "new-delhi": { state: "Delhi NCR" },
    "tamil-nadu": { state: "Tamil Nadu" },
    "uttar-pradesh": { state: "Uttar Pradesh" },
    "madhya-pradesh": { state: "Madhya Pradesh" },
    "andhra-pradesh": { state: "Andhra Pradesh" },
    "west-bengal": { state: "West Bengal" },
    "delhi": { state: "Delhi NCR" },
    "mumbai": { state: "Maharashtra", city: "Mumbai" },
    "bangalore": { state: "Karnataka", city: "Bangalore" },
    "chennai": { state: "Tamil Nadu", city: "Chennai" },
    "hyderabad": { state: "Telangana", city: "Hyderabad" },
    "pune": { state: "Maharashtra", city: "Pune" },
    "kolkata": { state: "West Bengal", city: "Kolkata" },
    "jaipur": { state: "Rajasthan", city: "Jaipur" },
    "lucknow": { state: "Uttar Pradesh", city: "Lucknow" },
    "ahmedabad": { state: "Gujarat", city: "Ahmedabad" },
    "noida": { state: "Delhi NCR", city: "Noida" },
    "greater-noida": { state: "Delhi NCR", city: "Greater Noida" },
    "gurgaon": { state: "Delhi NCR", city: "Gurgaon" },
    "gurugram": { state: "Delhi NCR", city: "Gurugram" },
    "faridabad": { state: "Delhi NCR", city: "Faridabad" },
    "ghaziabad": { state: "Delhi NCR", city: "Ghaziabad" },
    "maharashtra": { state: "Maharashtra" },
    "karnataka": { state: "Karnataka" },
    "rajasthan": { state: "Rajasthan" },
    "gujarat": { state: "Gujarat" },
    "telangana": { state: "Telangana" },
    "kerala": { state: "Kerala" },
    "bihar": { state: "Bihar" },
    "punjab": { state: "Punjab" },
  };
  for (const [key, val] of Object.entries(locations)) {
    if (s.includes(key)) {
      filters.state = val.state;
      if (val.city) filters.city = val.city;
      break;
    }
  }

  return filters;
}

/** Parse a course SEO slug into filter params */
export function parseCourseSlug(slug: string): Record<string, string> {
  const filters: Record<string, string> = {};
  const s = slug.toLowerCase();

  const courseGroups: Record<string, string> = {
    "btech": "B.Tech", "mtech": "M.Tech", "mba": "MBA", "mbbs": "MBBS",
    "bba": "BBA", "bcom": "B.Com", "mcom": "M.Com", "msc": "M.Sc", "bsc": "B.Sc",
    "mca": "MCA", "bca": "BCA", "llb": "LLB", "phd": "PhD",
  };
  for (const [key, val] of Object.entries(courseGroups)) {
    if (s.includes(key)) { filters.group = val; break; }
  }

  if (s.includes("online")) filters.mode = "Online";
  else if (s.includes("distance")) filters.mode = "Distance";

  const streams: Record<string, string> = {
    "engineering": "Engineering", "medical": "Medical", "management": "Management",
  };
  if (!filters.group) {
    for (const [key, val] of Object.entries(streams)) {
      if (s.includes(key)) { filters.stream = val; break; }
    }
  }

  return filters;
}

/** Parse an exam SEO slug into filter params */
export function parseExamSlug(slug: string): Record<string, string> {
  const filters: Record<string, string> = {};
  const s = slug.toLowerCase();

  const streams: Record<string, string> = {
    "engineering": "Engineering", "medical": "Medical", "management": "Management",
    "law": "Law",
  };
  for (const [key, val] of Object.entries(streams)) {
    if (s.includes(key)) { filters.stream = val; break; }
  }

  if (s.includes("national")) filters.level = "National";
  else if (s.includes("state")) filters.level = "State";
  else if (s.includes("university")) filters.level = "University";

  return filters;
}

/** Generate SEO slug from filters */
export function filtersToSlug(type: "colleges" | "courses" | "exams", filters: Record<string, string>): string {
  const parts: string[] = ["top"];

  if (filters.type) parts.push(filters.type.toLowerCase());

  if (filters.group) {
    parts.push(filters.group.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  } else if (filters.stream) {
    parts.push(filters.stream.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  }

  if (type === "exams") {
    if (filters.level) parts.push(filters.level.toLowerCase());
    parts.push("entrance-exams");
  } else {
    parts.push(type);
  }

  const location = filters.city || filters.state || "india";
  parts.push("in", location.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

  return parts.join("-");
}
