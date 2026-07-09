import { buildCollegeHref } from "@/lib/entityUrls";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, ArrowRight, GraduationCap, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { DynamicAdBanner } from "@/components/DynamicAdBanner";
import { useDbColleges } from "@/hooks/useCollegesData";
import { useFeaturedColleges } from "@/hooks/useFeaturedColleges";
import { useMemo } from "react";

export function FeaturedColleges() {
  const { data: dbColleges } = useDbColleges();
  const { data: featuredSlugs } = useFeaturedColleges();

  const topColleges = useMemo(() => {
    const allColleges = dbColleges ?? [];
    const slugs = featuredSlugs ?? [];
    if (slugs.length > 0) {
      const slugSet = new Set(slugs);
      const featured = allColleges.filter((c) => slugSet.has(c.slug));
      return featured.slice(0, 6);
    }
    // Fallback: show top rated
    return allColleges.slice(0, 6);
  }, [dbColleges, featuredSlugs]);

  return (
    <section className="py-10 md:py-16 bg-background" aria-labelledby="featured-heading">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
              <GraduationCap className="w-4 h-4" />
              Featured Institutions
            </div>
            <h2 id="featured-heading" className="text-headline font-bold text-foreground">
              Top Colleges <span className="text-gradient">Recommended For You</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Explore India's most prestigious institutions with world-class placements
            </p>
          </div>
          <Link to="/colleges">
            <Button variant="outline" className="self-start md:self-auto rounded-xl border-primary/20 hover:bg-primary/5">
              Explore All Colleges
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-4 md:gap-6">
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {topColleges.map((college, index) => (
              <motion.article
                key={college.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all h-full flex flex-col"
              >
                <div className="relative h-40 overflow-hidden flex-shrink-0">
                  <img src={college.image} alt={college.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <h3 className="text-base font-bold text-white line-clamp-1">{college.short_name || college.name}</h3>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-1.5">{college.type}</Badge>
                    <p className="text-sm text-muted-foreground line-clamp-1">{college.name}, {college.city || college.location.split(",")[0]}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(college.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{college.rating}/5</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {college.city || college.location.split(",")[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground text-xs">Approvals:</span>
                    <div className="flex gap-1">
                      {college.approvals.slice(0, 3).map((a) => (
                        <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0 font-semibold">{a}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Est. {college.established}</span>
                    {college.naac_grade && (
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> NAAC {college.naac_grade}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
                    <Link to={buildCollegeHref(college)}>
                      <Button variant="outline" size="sm" className="w-full rounded-xl text-xs h-9">Know More</Button>
                    </Link>
                    <Button size="sm" className="w-full rounded-xl text-xs h-9 gradient-accent text-white border-0">Apply Now</Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="space-y-6">
            <LeadCaptureForm variant="sidebar" title="Need Help?" subtitle="Get expert guidance" source="colleges_sidebar" />
            <DynamicAdBanner variant="vertical" position="sidebar" />
          </div>
        </div>

        <div className="mt-10">
          <DynamicAdBanner variant="horizontal" position="mid-page" />
        </div>
      </div>
    </section>
  );
}
