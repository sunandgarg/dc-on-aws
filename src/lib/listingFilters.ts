export type SearchGroup = {
  terms: string[];
  fields?: string[];
};

export const uniqueValues = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)));

export function readMultiParam(params: URLSearchParams, key: string, fallback: string[] = []) {
  const values = params.getAll(key).flatMap((value) => value.split(","));
  return uniqueValues(values.length > 0 ? values : fallback);
}

export function writeMultiParam(params: URLSearchParams, key: string, values: string[]) {
  uniqueValues(values).forEach((value) => params.append(key, value));
}

export function normalizeCollegeCourseGroup(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const map: Record<string, string> = {
    be: "B.E. / B.Tech",
    btech: "B.E. / B.Tech",
    bebtech: "B.E. / B.Tech",
    betech: "B.E. / B.Tech",
    mtech: "M.E./M.Tech",
    memtech: "M.E./M.Tech",
    mba: "MBA/PGDM",
    pgdm: "MBA/PGDM",
    mbapgdm: "MBA/PGDM",
    llb: "LL.B.",
    bcom: "B.Com",
    bsc: "B.Sc.",
    msc: "M.Sc.",
    phd: "Ph.D.",
  };
  return map[normalized] ?? value;
}

export function normalizeCourseGroup(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const map: Record<string, string> = {
    be: "B.Tech",
    btech: "B.Tech",
    bebtech: "B.Tech",
    betech: "B.Tech",
    mtech: "M.Tech",
    memtech: "M.Tech",
    mba: "MBA",
    pgdm: "PGDM",
    mbapgdm: "MBA/PGDM",
    llb: "LL.B.",
    bcom: "B.Com",
    bsc: "B.Sc.",
    msc: "M.Sc.",
    phd: "Ph.D",
  };
  return map[normalized] ?? value;
}

export function normalizeStudyMode(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const map: Record<string, string> = {
    fulltime: "Full-Time",
    parttime: "Part-Time",
  };
  return map[normalized] ?? value;
}

const groupAliases: Record<string, string[]> = {
  "B.E. / B.Tech": ["B.Tech", "BTech", "B.E", "Bachelor of Technology", "Engineering"],
  "B.Tech": ["B.Tech", "BTech", "Bachelor of Technology"],
  "M.E./M.Tech": ["M.Tech", "MTech", "Master of Technology", "Engineering"],
  "M.Tech": ["M.Tech", "MTech", "Master of Technology"],
  "MBA/PGDM": ["MBA", "PGDM", "Management", "Business Administration"],
  MBA: ["MBA", "Master of Business Administration", "Management"],
  PGDM: ["PGDM", "Management"],
  BBA: ["BBA", "Bachelor of Business Administration", "Management"],
  BCA: ["BCA", "Bachelor of Computer Applications", "Computer Applications", "IT"],
  MCA: ["MCA", "Master of Computer Applications", "Computer Applications", "IT"],
  "B.Com": ["B.Com", "BCom", "Commerce"],
  "B.Sc.": ["B.Sc", "BSc", "Science"],
  "B.Sc": ["B.Sc", "BSc", "Science"],
  "M.Sc.": ["M.Sc", "MSc", "Science"],
  "M.Sc": ["M.Sc", "MSc", "Science"],
  MBBS: ["MBBS", "Medical"],
  "LL.B.": ["LLB", "LL.B", "Law"],
  LLB: ["LLB", "LL.B", "Law"],
  "Ph.D.": ["PhD", "Ph.D", "Doctor of Philosophy", "Research"],
  "Ph.D": ["PhD", "Ph.D", "Doctor of Philosophy", "Research"],
};

const groupCategories: Record<string, string[]> = {
  "B.E. / B.Tech": ["Engineering"],
  "B.Tech": ["Engineering"],
  "M.E./M.Tech": ["Engineering"],
  "M.Tech": ["Engineering"],
  "MBA/PGDM": ["Management"],
  MBA: ["Management"],
  PGDM: ["Management"],
  BBA: ["Management"],
  BCA: ["Computer Applications", "IT and Software", "IT & Computing"],
  MCA: ["Computer Applications", "IT and Software", "IT & Computing"],
  "B.Com": ["Commerce"],
  "B.Sc.": ["Science"],
  "B.Sc": ["Science"],
  "M.Sc.": ["Science"],
  "M.Sc": ["Science"],
  MBBS: ["Medical"],
  "LL.B.": ["Law"],
  LLB: ["Law"],
  "Ph.D.": ["Research"],
  "Ph.D": ["Research"],
};

export function getCourseGroupSearchTerms(groups: string[]) {
  return uniqueValues(groups.flatMap((group) => groupAliases[group] ?? [group]));
}

export function getCourseGroupCategories(groups: string[]) {
  return uniqueValues(groups.flatMap((group) => groupCategories[group] ?? []));
}

export function resolveFacetCategories(streams: string[], groups: string[]) {
  const selectedStreams = uniqueValues(streams);
  const groupCategories = getCourseGroupCategories(groups);
  if (selectedStreams.length > 0 && groupCategories.length > 0) {
    const matches = selectedStreams.filter((stream) => groupCategories.includes(stream));
    return matches.length > 0 ? matches : ["__no_matching_category__"];
  }
  return selectedStreams.length > 0 ? selectedStreams : groupCategories;
}

export function matchesAnyTerm(record: Record<string, any>, fields: string[], terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = fields
    .flatMap((field) => {
      const value = record[field];
      if (Array.isArray(value)) return value;
      return value ? [String(value)] : [];
    })
    .join(" ")
    .toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}