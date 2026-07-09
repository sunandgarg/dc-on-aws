/**
 * Generate fuzzy search variants for a query.
 * Handles dot/space variants (b.tech ↔ btech ↔ b tech),
 * common abbreviations and PG/UG prefixes.
 */
export function buildSearchVariants(s: string): string[] {
  const norm = s.replace(/\s+/g, " ").trim();
  const noDot = norm.replace(/\./g, "");
  const noPunct = noDot.replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
  const compact = noPunct.replace(/\s+/g, "");
  const spaced = noDot.replace(/([a-z])\.?(tech|com|sc|ed|ca|pharm|arch|des|ba|ma|phil|phd)\b/gi, "$1 $2");
  const dotted = compact.replace(/^(b|m)(tech|com|sc|ed|ca|pharm|arch|des|ba|ma|phil|phd)/i, "$1.$2");
  const synonyms: Record<string, string[]> = {
    btech: ["b.tech", "bachelor of technology", "be"],
    mtech: ["m.tech", "master of technology"],
    bsc: ["b.sc", "bachelor of science"],
    msc: ["m.sc", "master of science"],
    ba: ["b.a", "bachelor of arts"],
    ma: ["m.a", "master of arts"],
    mba: ["master of business"],
    bba: ["bachelor of business"],
    bcom: ["b.com", "bachelor of commerce"],
    mcom: ["m.com", "master of commerce"],
    bca: ["b.c.a", "bachelor of computer"],
    mca: ["m.c.a", "master of computer"],
  };
  const extras = synonyms[compact.toLowerCase()] || [];
  return Array.from(
    new Set([norm, noDot, noPunct, compact, spaced, dotted, ...extras].filter((v) => v && v.length >= 2))
  );
}

/** Build a PostgREST `or=` clause across one column for all variants. */
export function buildIlikeOr(column: string, variants: string[]): string {
  return variants.map((v) => `${column}.ilike.%${v.replace(/[%,()]/g, "")}%`).join(",");
}
