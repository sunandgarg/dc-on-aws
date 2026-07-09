import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Index page layout (static source assertions)", () => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/Index.tsx"), "utf8");

  it("does NOT import or render the LoanReferStrip below scholarships", () => {
    expect(src).not.toMatch(/LoanReferStrip/);
  });

  it("renders the LiveScholarshipsStrip", () => {
    expect(src).toMatch(/LiveScholarshipsStrip/);
  });

  it("renders the StudyMaterialStrip", () => {
    expect(src).toMatch(/StudyMaterialStrip/);
  });

  it("renders the NewsSection", () => {
    expect(src).toMatch(/NewsSection/);
  });
});
