import { describe, it, expect } from "vitest";
import { buildSearchVariants, buildIlikeOr } from "./fuzzySearch";

describe("buildSearchVariants", () => {
  it("returns variants that overlap for b.tech / btech / bachelor of technology", () => {
    const a = buildSearchVariants("b.tech");
    const b = buildSearchVariants("btech");
    const c = buildSearchVariants("bachelor of technology");
    const intersects = (x: string[], y: string[]) =>
      x.some((v) => y.some((w) => v.toLowerCase() === w.toLowerCase()));
    expect(intersects(a, b)).toBe(true);
    // bachelor of technology must be reachable from compact "btech" synonyms
    expect(b.map((v) => v.toLowerCase())).toContain("bachelor of technology");
    expect(intersects(b, c)).toBe(true);
  });

  it("normalises punctuation and spacing", () => {
    const v = buildSearchVariants("B.Tech");
    expect(v.length).toBeGreaterThan(1);
    expect(v.some((s) => s.toLowerCase() === "btech")).toBe(true);
  });
});

describe("buildIlikeOr", () => {
  const variants = buildSearchVariants("btech");
  const clause = buildIlikeOr("name", variants);

  it("targets the right column for every variant", () => {
    expect(clause.startsWith("name.ilike.%")).toBe(true);
    // every comma-separated chunk should reference `name.ilike.%...%`
    for (const chunk of clause.split(",")) {
      expect(chunk).toMatch(/^name\.ilike\.%.+%$/);
    }
  });

  it("includes the natural-language variant so colleges/courses/exams named 'Bachelor of Technology' match", () => {
    expect(clause.toLowerCase()).toContain("bachelor of technology");
  });

  it("matches b.tech and btech through overlapping variants", () => {
    const cb = buildIlikeOr("name", buildSearchVariants("b.tech"));
    const cc = buildIlikeOr("name", buildSearchVariants("btech"));
    expect(cb).toContain("btech");
    expect(cc).toContain("btech");
  });
});
