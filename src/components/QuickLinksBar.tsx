import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap, BookOpen, FileText, Globe, Laptop, Calculator, Newspaper,
  Layers, Star, Image as ImageIcon, Compass, Sparkles, MapPin,
  Briefcase, ShieldCheck, HelpCircle, Building2,
} from "lucide-react";

type QL =
  | { icon: any; label: string; href: string; external?: boolean }
  | { icon: any; label: string; sectionId: string };

const links: QL[] = [
  // Priority order requested
  { icon: Laptop, label: "Online Degrees", sectionId: "online-education-heading" },
  { icon: Sparkles, label: "CAT Universe", href: "/cat-universe" },
  { icon: Sparkles, label: "Earn IIT/IIM/Dr. Tag", sectionId: "trending-programs-heading" },
  { icon: Globe, label: "Study Abroad", sectionId: "online-education-heading" },
  // Then the rest
  { icon: GraduationCap, label: "Top Colleges", href: "/colleges" },
  { icon: BookOpen, label: "Courses", href: "/courses" },
  { icon: FileText, label: "Exams", href: "/exams" },
  { icon: Layers, label: "Explore by Category", sectionId: "explore-heading" },
  { icon: Star, label: "Featured Colleges", sectionId: "top-colleges-heading" },
  { icon: ImageIcon, label: "Recommended", sectionId: "recommended-colleges-heading" },
  { icon: Compass, label: "Explore More", sectionId: "explore-cta-heading" },
  { icon: MapPin, label: "By City", sectionId: "city-search-heading" },
  { icon: Briefcase, label: "Career Scope", sectionId: "career-scope-heading" },
  { icon: Calculator, label: "Tools", sectionId: "tools-heading" },
  { icon: Newspaper, label: "News", sectionId: "news-heading" },
  { icon: BookOpen, label: "Study Material", sectionId: "study-material-heading" },
  { icon: ShieldCheck, label: "Why Us", sectionId: "features-heading" },
  { icon: HelpCircle, label: "FAQs", sectionId: "faq-heading" },
  { icon: Building2, label: "Trusted Partners", sectionId: "trusted-heading" },
];

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: "smooth" });
}

const cls = "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap border border-border/60 bg-card hover:border-primary hover:bg-primary/5 hover:text-primary transition-all shadow-sm hover:shadow-md";

function Item({ link }: { link: QL }) {
  const Icon = link.icon;
  const location = useLocation();
  const navigate = useNavigate();
  const inner = (<><Icon className="w-4 h-4" />{link.label}</>);
  if ("sectionId" in link) {
    const onClick = () => {
      if (location.pathname === "/") {
        scrollToId(link.sectionId);
      } else {
        // Navigate home then scroll once the section mounts
        navigate(`/#${link.sectionId}`);
        setTimeout(() => scrollToId(link.sectionId), 400);
      }
    };
    return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  }
  if (link.external) {
    return <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  }
  return <Link to={link.href} className={cls}>{inner}</Link>;
}

export function QuickLinksBar({ compact = false }: { compact?: boolean } = {}) {
  return (
    <section
      className={compact ? "py-4" : "py-6 md:py-8 border-b border-border/60 bg-gradient-to-b from-background to-card/30"}
      aria-label="Quick Links"
    >
      <div className="overflow-x-auto scrollbar-thin -mx-3 px-3">
        <div className="flex flex-nowrap items-center gap-2.5 w-max mx-auto">
          {links.map((link, i) => <Item key={i} link={link} />)}
        </div>
      </div>
    </section>
  );
}
