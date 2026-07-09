import { buildCollegeHref } from "@/lib/entityUrls";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Calendar, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DbCollege } from "@/hooks/useCollegesData";
import { CompareToggleButton } from "@/components/CompareToggleButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PriorityBadge } from "@/components/PriorityBadge";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function LogoAvatar({ college }: { college: DbCollege }) {
  const logoUrl = (college as any).logo || college.image;
  const initials = getInitials(college.short_name || college.name);
  const bgGradient = `linear-gradient(135deg, hsl(${Math.abs(college.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 360} 70% 60%), hsl(${(Math.abs(college.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) + 40) % 360} 70% 50%))`;

  return (
    <div
      className="absolute -bottom-7 left-4 w-16 h-16 rounded-2xl border-[3px] border-card bg-background shadow-lg flex items-center justify-center overflow-hidden z-10"
      style={{ background: bgGradient }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${college.short_name || college.name} logo`}
          className="w-full h-full object-contain p-1.5"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            const fallback = (e.target as HTMLImageElement).parentElement?.querySelector(".logo-fallback");
            if (fallback) fallback.classList.remove("hidden");
          }}
        />
      ) : null}
      <span
        className={`logo-fallback text-[13px] font-extrabold text-white tracking-tight leading-none ${logoUrl ? "hidden" : ""}`}
      >
        {initials}
      </span>
    </div>
  );
}


interface CollegeCardProps {
  college: DbCollege;
  index: number;
}

export function CollegeCard({ college, index }: CollegeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.04, duration: 0.3 }}
    >
      <article className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
        {/* Image - clickable, with overlaid compare toggle */}
        <div className="relative h-48 flex-shrink-0 overflow-hidden">
          <Link to={buildCollegeHref(college)} className="block w-full h-full group">
            <img
              src={college.image}
              alt={college.name}
              className="w-full h-full object-cover object-center scale-110"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
              <Badge className="bg-foreground/80 text-background border-0 text-xs">
                {college.type}
              </Badge>
              <PriorityBadge priority={(college as any).priority} />
              {((college as any).featured_rank != null) && (
                <Badge
                  className="bg-amber-500 text-white border-0 text-[10px] font-bold"
                  title={`Pinned to Featured slot #${(college as any).featured_rank}`}
                  data-testid="featured-rank-badge"
                >
                  ★ Featured #{(college as any).featured_rank}
                </Badge>
              )}
            </div>
          </Link>
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            <FavoriteButton collegeSlug={college.slug} />
            <CompareToggleButton
              variant="icon"
              college={{ slug: college.slug, name: college.name, short_name: college.short_name, image: college.image, city: college.city, state: college.state }}
              className="shadow-md"
            />
          </div>
        </div>

        <LogoAvatar college={college} />

        {/* Content */}
        <div className="p-4 pt-9 space-y-3 flex-1 flex flex-col">
          <Link to={buildCollegeHref(college)} className="block group">
            <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{college.short_name}</h2>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {college.name}, {college.location.split(",")[0]}
            </p>
            {(college as any).affiliation_kind === "affiliated" && (college as any).parent_university_slug && (
              <p className="text-[11px] text-primary/90 font-medium mt-0.5 line-clamp-1">
                Affiliated to {(college as any).parent_university_slug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </p>
            )}
            {(college as any).affiliation_kind === "university" && (
              <p className="text-[11px] text-primary/90 font-medium mt-0.5">University</p>
            )}
          </Link>

          {/* Rating & Location */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(college.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">{college.rating}/5</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {college.city || college.location}
            </span>
          </div>

          {/* Approvals */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Approvals:</span>
            <div className="flex gap-1.5">
              {college.approvals.slice(0, 3).map((a) => (
                <Badge key={a} variant="outline" className="text-xs px-1.5 py-0.5 font-semibold">
                  {a}
                </Badge>
              ))}
            </div>
          </div>

          {/* Established & NAAC */}
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              Established {college.established}
            </span>
            {college.naac_grade && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                NAAC {college.naac_grade}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-auto pt-3">
            <Link to={buildCollegeHref(college)}>
              <Button variant="outline" className="w-full rounded-xl h-10 text-sm">
                Know More
              </Button>
            </Link>
            <Button className="w-full rounded-xl h-10 text-sm gradient-accent text-white border-0">
              Apply Now
            </Button>
          </div>
        </div>
      </article>
    </motion.div>
  );
}
