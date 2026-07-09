/**
 * Slug-with-ID URL helpers (Shiksha / KollegeApply style).
 *   /colleges/iit-bombay-10042
 *   /courses/btech-cs-20015
 *   /exams/jee-main-30007
 * The trailing numeric id is the canonical resolver; the slug
 * stays human-readable + SEO friendly. Old slug-only URLs continue
 * to resolve through the slug fallback in the data hooks.
 */

export function parseSlugWithId(param: string | undefined): { slug: string; id?: number } {
  if (!param) return { slug: "" };
  const m = param.match(/^(.*?)-(\d+)$/);
  if (m) return { slug: m[1], id: Number(m[2]) };
  return { slug: param };
}

export function buildCollegeHref(college: { slug?: string | null; short_id?: number | null } | null | undefined): string {
  if (!college?.slug) return "/colleges";
  return college.short_id ? `/colleges/${college.slug}-${college.short_id}` : `/colleges/${college.slug}`;
}

export function buildCourseHref(course: { slug?: string | null; short_id?: number | null } | null | undefined): string {
  if (!course?.slug) return "/courses";
  return course.short_id ? `/courses/${course.slug}-${course.short_id}` : `/courses/${course.slug}`;
}

export function buildExamHref(exam: { slug?: string | null; short_id?: number | null } | null | undefined): string {
  if (!exam?.slug) return "/exams";
  return exam.short_id ? `/exams/${exam.slug}-${exam.short_id}` : `/exams/${exam.slug}`;
}
