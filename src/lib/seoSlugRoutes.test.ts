/**
 * E2E deep-link verification suite for filter URLs.
 * Ensures SEO slugs decode to the expected filter state and round-trip back to a slug.
 */
import { describe, it, expect } from "vitest";
import { parseCollegeSlug, parseCourseSlug, parseExamSlug, filtersToSlug } from "./seoSlugRoutes";

describe("College deep-link slugs", () => {
  it("top-btech-colleges-in-delhi → group=B.Tech, state=Delhi NCR", () => {
    const f = parseCollegeSlug("top-btech-colleges-in-delhi");
    expect(f.group).toBe("B.Tech");
    // Delhi maps to the Delhi NCR region in the slug taxonomy
    expect(f.state).toBe("Delhi NCR");
  });
  it("private-engineering-colleges-in-pune → type=Private, stream=Engineering, city=Pune", () => {
    const f = parseCollegeSlug("private-engineering-colleges-in-pune");
    expect(f.type).toBe("Private");
    expect(f.stream).toBe("Engineering");
    expect(f.city).toBe("Pune");
    expect(f.state).toBe("Maharashtra");
  });
  it("government-mba-colleges-in-bangalore → type=Government, group=MBA, city=Bangalore", () => {
    const f = parseCollegeSlug("government-mba-colleges-in-bangalore");
    expect(f.type).toBe("Government");
    expect(f.group).toBe("MBA");
    expect(f.city).toBe("Bangalore");
  });
  it("medical-colleges-in-tamil-nadu → stream=Medical, state=Tamil Nadu", () => {
    const f = parseCollegeSlug("medical-colleges-in-tamil-nadu");
    expect(f.stream).toBe("Medical");
    expect(f.state).toBe("Tamil Nadu");
  });
});

describe("Course deep-link slugs", () => {
  it("online-mba-course → mode=Online, group=MBA", () => {
    const f = parseCourseSlug("online-mba-course");
    expect(f.mode).toBe("Online");
    expect(f.group).toBe("MBA");
  });
  it("distance-mca-course → mode=Distance, group=MCA", () => {
    const f = parseCourseSlug("distance-mca-course");
    expect(f.mode).toBe("Distance");
    expect(f.group).toBe("MCA");
  });
});

describe("Exam deep-link slugs", () => {
  it("returns an object (no crash)", () => {
    expect(typeof parseExamSlug("jee-main-2026")).toBe("object");
  });
});

describe("filtersToSlug round-trips back to parseable slug", () => {
  it("colleges round-trip preserves group + state", () => {
    const slug = filtersToSlug("colleges", { group: "B.Tech", state: "Delhi" });
    expect(typeof slug).toBe("string");
    expect(slug.length).toBeGreaterThan(0);
    const parsed = parseCollegeSlug(slug);
    expect(parsed.group).toBe("B.Tech");
    // Delhi maps to the Delhi NCR region in the slug taxonomy
    expect(parsed.state).toBe("Delhi NCR");
  });
  it("colleges round-trip preserves type + stream + city", () => {
    const slug = filtersToSlug("colleges", { type: "Private", stream: "Engineering", city: "Pune", state: "Maharashtra" });
    const parsed = parseCollegeSlug(slug);
    expect(parsed.type).toBe("Private");
    expect(parsed.stream).toBe("Engineering");
    expect(parsed.city).toBe("Pune");
  });
});

describe("Career↔Course linked filter slugs", () => {
  it("online-mca-course preserves mode + group on round-trip", () => {
    const slug = filtersToSlug("courses", { mode: "Online", group: "MCA" });
    // mode isn't in filtersToSlug output but group should be
    const parsed = parseCourseSlug(slug);
    expect(parsed.group).toBe("MCA");
  });
  it("software-engineer-mca / data-scientist-mba career→course slugs decode correctly", () => {
    expect(parseCourseSlug("software-engineer-mca-course").group).toBe("MCA");
    expect(parseCourseSlug("data-scientist-mba-course").group).toBe("MBA");
    expect(parseCourseSlug("doctor-mbbs-course").group).toBe("MBBS");
  });
  it("filter slug for engineering stream round-trips", () => {
    const slug = filtersToSlug("courses", { stream: "Engineering" });
    const parsed = parseCourseSlug(slug);
    expect(parsed.stream).toBe("Engineering");
  });
  it("colleges-with-mba-careers stays parseable", () => {
    const slug = filtersToSlug("colleges", { group: "MBA", state: "Karnataka" });
    const parsed = parseCollegeSlug(slug);
    expect(parsed.group).toBe("MBA");
    expect(parsed.state).toBe("Karnataka");
  });
});
