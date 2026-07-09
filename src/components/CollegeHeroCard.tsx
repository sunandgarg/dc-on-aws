import { MapPin, Calendar, Shield, ExternalLink, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplyButton } from "@/components/ApplyButton";
import { YouTubeVideoButton } from "@/components/YouTubeVideoButton";
import { CompareToggleButton } from "@/components/CompareToggleButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { trackEvent } from "@/lib/analytics";

interface Props {
  college: any;
  onCounselling?: () => void;
  onCompare?: () => void;
}

/**
 * 2026 redesign - hero matches Exam detail layout:
 * image on top, logo floating, all meta + CTAs in a card BELOW the image.
 */
export function CollegeHeroCard({ college }: Props) {
  const hasImage = !!college.image;
  const tags: string[] = (college.tags || []).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden mb-0"
    >
      {/* Image */}
      <div className="relative">
        {hasImage ? (
          <img
            src={college.image}
            alt={college.name}
            className="w-full h-48 md:h-56 object-cover object-center"
            loading="eager"
          />
        ) : (
          <div className="w-full h-48 md:h-56 bg-gradient-to-br from-slate-300 to-slate-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        {college.logo && (
          <div className="absolute left-4 -bottom-6 md:left-6 md:-bottom-8 w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-card border border-border shadow-md p-1.5 flex items-center justify-center overflow-hidden">
            <img src={college.logo} alt={`${college.name} logo`} className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Content below image */}
      <div className={`p-4 md:p-6 ${college.logo ? "pt-10 md:pt-12" : ""}`}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {tags.length > 0
            ? tags.map((t) => (
                <Badge key={t} className="bg-primary/90 text-primary-foreground text-xs">{t}</Badge>
              ))
            : college.category && (
                <Badge className="bg-primary/90 text-primary-foreground text-xs">{college.category}</Badge>
              )}
          {college.type && <Badge className="bg-accent/90 text-accent-foreground text-xs">{college.type}</Badge>}
          {college.naac_grade && (
            <Badge className="bg-success/90 text-success-foreground text-xs">NAAC {college.naac_grade}</Badge>
          )}
        </div>

        <h1 data-h className="text-xl md:text-2xl font-bold text-foreground mb-1">{college.name}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground mb-3">
          {college.location && (
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{college.location}</span>
          )}
          {college.established && (
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Estd. {college.established}</span>
          )}
          {college.naac_grade && (
            <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />NAAC {college.naac_grade}</span>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 flex-wrap">
          <ApplyButton
            collegeSlug={college.slug}
            collegeName={college.name}
            applyMode={(college as any).apply_cta_mode}
            applyUrl={(college as any).apply_url}
            className="rounded-xl text-xs gap-1 !bg-[#e85d3a] hover:!bg-[#d14b2d] !text-white font-bold shadow-lg shadow-orange-200/60 h-10 px-4"
            label="Apply Now"
          />
          {college.brochure_url && college.brochure_url !== "#" ? (
            <ApplyButton
              collegeSlug={college.slug}
              collegeName={college.name}
              variant="outline"
              className="rounded-xl text-xs gap-1 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 h-10 px-4 font-bold"
              label="Brochure"
              applyMode="lead_then_link"
              applyUrl={college.brochure_url}
            />
          ) : (
            <ApplyButton
              collegeSlug={college.slug}
              collegeName={college.name}
              variant="outline"
              className="rounded-xl text-xs gap-1 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 h-10 px-4 font-bold"
              label="Brochure"
            />
          )}
          {college.website && college.website !== "#" && (
            <a
              href={college.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { try { trackEvent("cta_click", { page: "college", cta: "Official Website", college_slug: college.slug }); } catch {} }}
            >
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1 h-10">
                <Globe className="w-3.5 h-3.5" />Official Website
              </Button>
            </a>
          )}
          <YouTubeVideoButton
            url={college.youtube_video_url}
            category="college"
            title={`${college.name} - Campus Tour`}
            label="Campus Tour"
            className="h-10 rounded-xl text-xs"
          />
          <CompareToggleButton
            college={{
              slug: college.slug,
              name: college.name,
              short_name: college.short_name,
              image: college.image,
              city: college.city,
              state: college.state,
            }}
            className="h-10 rounded-xl text-xs"
          />
          <FavoriteButton collegeSlug={college.slug} variant="button" />
        </div>
      </div>
    </motion.div>
  );
}
