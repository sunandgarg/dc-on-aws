// Pure helper used by listings AND tested in src/test/priority-sort.test.ts.
// Sort order (priority 1 = TOP rank, like a leaderboard):
//   1. priority asc (lower number = surfaces first; null/undefined → 9999 = bottom)
//   2. priority_updated_at desc (most recently re-pinned wins ties; null = oldest)
//   3. rating desc
//   4. name asc
// Mirrors the SQL ORDER BY used in useColleges/Courses/Exams hooks.
export type Sortable = {
  priority?: number | null;
  priority_updated_at?: string | null;
  rating?: number | null;
  name?: string | null;
};

const NO_PRIORITY = 9999;

export function sortByPriority<T extends Sortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pa = a.priority ?? NO_PRIORITY;
    const pb = b.priority ?? NO_PRIORITY;
    if (pa !== pb) return pa - pb;
    const ta = a.priority_updated_at ? Date.parse(a.priority_updated_at) : 0;
    const tb = b.priority_updated_at ? Date.parse(b.priority_updated_at) : 0;
    if (tb !== ta) return tb - ta;
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

// Pinned = manually given a top slot (priority 1–10), default is 50.
export function isPinned(priority?: number | null) {
  const p = priority ?? 50;
  return p > 0 && p <= 10;
}
