import { describe, it, expect } from "vitest";
import { sortByPriority, isPinned } from "@/lib/prioritySort";

describe("sortByPriority (priority 1 = top)", () => {
  it("places lower priority number first", () => {
    const out = sortByPriority([
      { name: "A", priority: 50, rating: 5 },
      { name: "B", priority: 1, rating: 4 },
      { name: "C", priority: 10, rating: 4.5 },
    ]);
    expect(out.map(o => o.name)).toEqual(["B", "C", "A"]);
  });

  it("breaks ties on rating (desc)", () => {
    const out = sortByPriority([
      { name: "Low", priority: 5, rating: 3.0 },
      { name: "High", priority: 5, rating: 4.8 },
      { name: "Mid", priority: 5, rating: 4.0 },
    ]);
    expect(out.map(o => o.name)).toEqual(["High", "Mid", "Low"]);
  });

  it("falls back to name when everything ties", () => {
    const out = sortByPriority([
      { name: "Charlie", priority: 50, rating: 4 },
      { name: "Alpha", priority: 50, rating: 4 },
      { name: "Bravo", priority: 50, rating: 4 },
    ]);
    expect(out.map(o => o.name)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("treats null/undefined priority as bottom", () => {
    const out = sortByPriority([
      { name: "NoPri", rating: 5 },
      { name: "Pri10", priority: 10, rating: 1 },
    ]);
    expect(out[0].name).toBe("Pri10");
  });

  it("does not mutate input", () => {
    const input = [
      { name: "A", priority: 1 },
      { name: "B", priority: 2 },
    ];
    const snapshot = [...input];
    sortByPriority(input);
    expect(input).toEqual(snapshot);
  });

  it("breaks priority ties on most recent priority_updated_at", () => {
    const out = sortByPriority([
      { name: "Old",    priority: 1, rating: 5, priority_updated_at: "2024-01-01T00:00:00Z" },
      { name: "Newest", priority: 1, rating: 5, priority_updated_at: "2026-05-10T00:00:00Z" },
      { name: "Mid",    priority: 1, rating: 5, priority_updated_at: "2025-06-01T00:00:00Z" },
    ]);
    expect(out.map(o => o.name)).toEqual(["Newest", "Mid", "Old"]);
  });

  it("treats null/missing priority_updated_at as oldest", () => {
    const out = sortByPriority([
      { name: "NoTs",   priority: 1, rating: 5, priority_updated_at: null },
      { name: "Recent", priority: 1, rating: 5, priority_updated_at: "2026-05-10T00:00:00Z" },
      { name: "Older",  priority: 1, rating: 5, priority_updated_at: "2024-01-01T00:00:00Z" },
    ]);
    expect(out.map(o => o.name)).toEqual(["Recent", "Older", "NoTs"]);
  });

  it("priority still wins over recency", () => {
    const out = sortByPriority([
      { name: "RecentLow", priority: 50, priority_updated_at: "2026-05-10T00:00:00Z" },
      { name: "OldTop",    priority: 1,  priority_updated_at: "2020-01-01T00:00:00Z" },
    ]);
    expect(out[0].name).toBe("OldTop");
  });
});

describe("isPinned", () => {
  it("returns true for 1..10", () => {
    expect(isPinned(1)).toBe(true);
    expect(isPinned(10)).toBe(true);
  });
  it("returns false outside 1..10", () => {
    expect(isPinned(11)).toBe(false);
    expect(isPinned(50)).toBe(false);
    expect(isPinned(0)).toBe(false);
    expect(isPinned(null)).toBe(false);
    expect(isPinned(undefined)).toBe(false);
  });
});
