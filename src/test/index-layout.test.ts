import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Index page layout (static source assertions)", () => {
  const indexSrc = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");
  const belowFoldSrc = readFileSync(resolve(process.cwd(), "src/components/HomeBelowFold.tsx"), "utf8");

  it("does NOT import or render the LoanReferStrip below scholarships", () => {
    expect(indexSrc).not.toMatch(/LoanReferStrip/);
    expect(belowFoldSrc).not.toMatch(/LoanReferStrip/);
  });

  it("defers below-fold homepage content through HomeBelowFold", () => {
    expect(indexSrc).toMatch(/HomeBelowFold/);
  });

  it("keeps Study Material out of the homepage body because it now lives in the header mega-menu", () => {
    expect(belowFoldSrc).not.toMatch(/StudyMaterialStrip/);
    expect(belowFoldSrc).not.toMatch(/CollegeStudyStrip/);
  });

  it("renders the NewsSection", () => {
    expect(belowFoldSrc).toMatch(/NewsSection/);
  });

  it("does NOT render the removed LiveScholarshipsStrip", () => {
    expect(indexSrc).not.toMatch(/LiveScholarshipsStrip/);
    expect(belowFoldSrc).not.toMatch(/LiveScholarshipsStrip/);
  });
});
