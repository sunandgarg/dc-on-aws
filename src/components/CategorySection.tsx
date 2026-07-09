import { motion } from "framer-motion";
import { useMemo, useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Star, MapPin, ArrowRight, Clock, Users, TrendingUp, GraduationCap, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useDbColleges } from "@/hooks/useCollegesData";
import { useDbCourses } from "@/hooks/useCoursesData";
import { useDbExams } from "@/hooks/useExamsData";

import { useStreamCategories } from "@/hooks/useStreamCategories";

const DEFAULT_CATEGORY = "Engineering";

export function CategorySection() {
  const { data: dbCategories = [] } = useStreamCategories();
  const categories = useMemo(() => dbCategories, [dbCategories]);
  const [activeCategory, setActiveCategory] = useState<string>(DEFAULT_CATEGORY);
  const { data: allColleges } = useDbColleges();
  const { data: allCourses } = useDbCourses();
  const { data: allExams } = useDbExams();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const userInteractedRef = useRef(false);

  // Gentle one-time hint scroll so users see there's content to the right.
  // Stops on ANY user interaction (touch, wheel, scroll, click).
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el || userInteractedRef.current) return;
    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      if (cancelled || userInteractedRef.current) return;
      const max = el.scrollWidth - el.clientWidth - 1;
      if (max <= 0) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const peak = Math.min(max, 80);
      el.scrollLeft = t < 0.5 ? eased * peak * 2 : peak * 2 * (1 - eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => { raf = requestAnimationFrame(tick); }, 600);
    const stop = () => { userInteractedRef.current = true; cancelled = true; cancelAnimationFrame(raf); };
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("pointerdown", stop, { passive: true });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("pointerdown", stop);
    };
  }, [isMobile]);

  const eqCat = (a?: string, b?: string) => (a || "").toLowerCase() === (b || "").toLowerCase();
  const matchCat = (item: any, cat: string) => {
    if (eqCat(item.category, cat)) return true;
    const arr: string[] = item.categories || [];
    return arr.some((c) => eqCat(c, cat));
  };

  const colleges = useMemo(() => (allColleges || [])
    .filter((c: any) => matchCat(c, activeCategory))
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5), [allColleges, activeCategory]);

  const courses = useMemo(() => (allCourses || [])
    .filter((c: any) => matchCat(c, activeCategory))
    .slice(0, 5), [allCourses, activeCategory]);

  const exams = useMemo(() => (allExams || [])
    .filter((e: any) => matchCat(e, activeCategory))
    .slice(0, 5), [allExams, activeCategory]);

  return (
    <section className="py-10 md:py-14 bg-gradient-to-b from-primary/5 to-background" aria-labelledby="explore-heading">
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 id="explore-heading" className="text-headline font-bold text-foreground">
            Explore by <span className="text-gradient-accent">Category</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Browse colleges, courses, and entrance exams across all fields
          </p>
        </motion.div>

        <div className="mb-8 md:mb-10 -mx-4 px-4 md:mx-0 md:px-2 overflow-x-auto md:overflow-visible scrollbar-hide">
          <div
            className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 w-max md:flex md:flex-wrap md:justify-center md:w-auto md:gap-2.5"
            role="tablist"
          >
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap border transition-all shadow-sm hover:shadow-md ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-foreground border-border/60 hover:border-primary/40 hover:-translate-y-0.5"
                  }`}
                >
                  <span className="text-sm md:text-base leading-none" aria-hidden>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>


        <div
          ref={scrollRef}
          key={activeCategory}
          className="lg:grid lg:grid-cols-3 gap-5 flex overflow-x-auto snap-x snap-proximity scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible"
          style={{ touchAction: "pan-x pan-y" }}
        >
          {/* Top Colleges */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-5 flex-shrink-0 w-[85vw] max-w-sm lg:w-auto lg:max-w-none snap-start">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" /> Top Colleges
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{activeCategory}</p>
              </div>
              <Link to={`/colleges?category=${encodeURIComponent(activeCategory)}`}>
                <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></span>
              </Link>
            </div>
            <div className="space-y-3">
              {colleges.length === 0 && <p className="text-xs text-muted-foreground italic">No colleges yet.</p>}
              {colleges.map((college: any, i: number) => (
                <Link key={college.slug} to={`/colleges/${college.slug}`} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="relative flex-shrink-0">
                    <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center z-10">#{i + 1}</span>
                    {college.image ? (
                      <img src={college.image} alt={college.name} className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{college.short_name || college.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3" />{college.city || college.state}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" /> {college.rating || "-"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Trending Courses */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-5 flex-shrink-0 w-[85vw] max-w-sm lg:w-auto lg:max-w-none snap-start">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Trending Courses
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">High demand programs</p>
              </div>
              <Link to={`/courses?category=${encodeURIComponent(activeCategory)}`}>
                <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></span>
              </Link>
            </div>
            <div className="space-y-3">
              {courses.length === 0 && <p className="text-xs text-muted-foreground italic">No courses yet.</p>}
              {courses.map((course: any) => (
                <Link key={course.slug} to={`/courses/${course.slug}`} className="group block p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{course.name}</h4>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Users className="w-3 h-3" />{course.colleges_count || 0}+ colleges</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {course.growth && <Badge className="bg-accent/10 text-accent hover:bg-accent/10 text-[10px] px-1.5 py-0"><TrendingUp className="w-3 h-3 mr-0.5" />{course.growth}</Badge>}
                      {course.avg_salary && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] px-1.5 py-0">{course.avg_salary}</Badge>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-5 flex-shrink-0 w-[85vw] max-w-sm lg:w-auto lg:max-w-none snap-start">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Top Exams
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Most important entrance exams</p>
              </div>
              <Link to={`/exams?category=${encodeURIComponent(activeCategory)}`}>
                <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></span>
              </Link>
            </div>
            <div className="space-y-3">
              {exams.length === 0 && <p className="text-xs text-muted-foreground italic">No exams yet.</p>}
              {exams.map((exam: any) => (
                <Link key={exam.slug} to={`/exams/${exam.slug}`} className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{exam.short_name || exam.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">{exam.exam_date || exam.application_start_date || "TBA"}</span>
                      {exam.applicants && <><span>•</span><span className="truncate">{exam.applicants}</span></>}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                    exam.level === "National" ? "border-destructive/40 text-destructive" : "border-primary/30 text-primary"
                  }`}>{exam.level || exam.category}</Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
