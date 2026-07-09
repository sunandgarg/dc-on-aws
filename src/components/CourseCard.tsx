import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Building, TrendingUp, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DbCourse } from "@/hooks/useCoursesData";
import { PriorityBadge } from "@/components/PriorityBadge";
import { buildCourseHref } from "@/lib/entityUrls";

interface CourseCardProps {
  course: DbCourse;
  index: number;
}

export function CourseCard({ course, index }: CourseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.04, duration: 0.3 }}
    >
      <Link to={buildCourseHref(course)} className="block h-full">
        <article className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
          <div className="relative">
            <img src={course.image} alt={course.name} className="w-full h-40 object-cover flex-shrink-0" loading="lazy" />
            <div className="absolute top-2 left-2"><PriorityBadge priority={(course as any).priority} /></div>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{course.category}</Badge>
              <Badge variant="outline" className="text-xs">{course.level}</Badge>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">{course.mode}</Badge>
            </div>

            <h2 className="text-base font-bold text-foreground mb-1">{course.name}</h2>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{course.full_name}</p>

            {/* Specializations */}
            {course.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {course.specializations.slice(0, 3).map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary font-medium">
                    {s}
                  </span>
                ))}
                {course.specializations.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    +{course.specializations.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground">{course.duration}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground">{course.colleges_count} colleges</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-semibold text-success">{course.growth}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground">{course.avg_salary}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
