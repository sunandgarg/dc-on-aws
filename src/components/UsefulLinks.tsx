import { Link } from "react-router-dom";
import type { ScrollSection } from "@/components/ScrollSpy";

interface UsefulLinksProps {
  type: "college" | "course" | "exam";
  name: string;
  shortName?: string;
  slug: string;
  state?: string;
  city?: string;
  category?: string;
  sections: ScrollSection[];
  courseGroups?: string[];
  topCourses?: { name: string; slug: string }[];
}

// Course-group keys produce SEO links like "msc-colleges-in-mumbai"
const COURSE_GROUP_LINKS = [
  "B.Tech", "B.Sc", "M.Sc", "MBA", "BBA", "BCA", "MCA",
  "B.Com", "M.Com", "B.A", "M.A", "Ph.D", "B.Des", "LLB",
];

export function UsefulLinks({
  type, name, shortName, slug, state, city, category,
  sections, courseGroups, topCourses,
}: UsefulLinksProps) {
  const displayName = shortName || name;
  const location = city || state || "India";
  const locationSlug = location.toLowerCase().replace(/\s+/g, "-");

  const knowMoreLinks = sections.slice(0, 8).map((s) => ({
    label: s.label,
    sectionId: s.id,
  }));

  const courseGroupLinks = (courseGroups || COURSE_GROUP_LINKS).slice(0, 12).map((cg) => ({
    label: cg,
    href: `/courses?group=${encodeURIComponent(cg)}`,
  }));

  const topCourseLinks = (topCourses || []).slice(0, 8).map((c) => ({
    label: c.name,
    href: `/courses/${c.slug}`,
  }));

  // Location-based course-group SEO links: navigate to /colleges/<seo-slug>
  // matching the same route patterns AllColleges generates.
  const locationCourseLinks = location !== "India" ? COURSE_GROUP_LINKS.slice(0, 10).map((cg) => {
    const groupSlug = cg.toLowerCase().replace(/[.\s]/g, "");
    return {
      label: `${cg} in ${location}`,
      href: `/colleges/top-${groupSlug}-colleges-in-${locationSlug}`,
    };
  }) : [];

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 150);
      window.scrollTo({ top: y, behavior: "smooth" });
      window.history.replaceState(null, "", `/${type}s/${slug}/${sectionId}`);
    }
  };

  return (
    <section className="bg-card rounded-2xl border border-border p-5 mt-6">
      <h2 className="text-lg font-bold text-foreground mb-5">Useful Links</h2>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Know more about {displayName}
          </h3>
          <div className="flex flex-wrap gap-2">
            {knowMoreLinks.map((l) => (
              <button
                key={l.sectionId}
                onClick={() => scrollToSection(l.sectionId)}
                className="text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg cursor-pointer"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {type === "college" && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Top Course Group Offered by {displayName}
            </h3>
            <div className="flex flex-wrap gap-2">
              {courseGroupLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  className="text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {type === "college" && topCourseLinks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Top Courses Offered in {displayName}
            </h3>
            <div className="flex flex-wrap gap-2">
              {topCourseLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  className="text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {locationCourseLinks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Top Courses Offered in {location}
            </h3>
            <div className="flex flex-wrap gap-2">
              {locationCourseLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  className="text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
