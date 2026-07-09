/**
 * Slug utilities - produce human-readable, URL-safe identifiers.
 *
 * Used when creating new colleges / courses / exams / articles so the
 * primary key in URLs and the database is something like
 *   "iit-delhi-7f3a"  instead of  "65b90f6e-4547-4a60-88ff-b2b5e8308a3a"
 *
 * - Stable, predictable casing (lowercase, kebab-case)
 * - Strips Indian punctuation, ampersands, accents
 * - Appends a 4-char base36 suffix to avoid collisions while keeping it short
 */

export function slugify(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")  // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug + 4-char random suffix (base36). Falls back to "item" if name empty. */
export function readableSlug(name: string): string {
  const base = slugify(name) || "item";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
