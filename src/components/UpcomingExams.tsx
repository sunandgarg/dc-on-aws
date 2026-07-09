import { motion } from "framer-motion";
import { Calendar, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useDbExams } from "@/hooks/useExamsData";

export function UpcomingExams() {
  const { data: allExams } = useDbExams();

  // Show exams marked as top by admin (is_top_exam), fallback to highest priority ones
  const topExams = (() => {
    if (!allExams?.length) return [];
    const marked = allExams.filter((e: any) => e.is_top_exam);
    if (marked.length > 0) return marked.slice(0, 6);
    // Fallback: show first 6 active exams
    return allExams.slice(0, 6);
  })();

  if (!topExams.length) return null;

  return (
    <section className="py-8 md:py-12 bg-background" aria-labelledby="top-exams-heading">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
              <Trophy className="w-4 h-4" />
              Top Exams
            </div>
            <h2 id="top-exams-heading" className="text-headline font-bold text-foreground">
              Top <span className="text-gradient">Exams</span> in India
            </h2>
            <p className="text-muted-foreground mt-1">Most important entrance exams curated by our experts</p>
          </div>
          <Link to="/exams">
            <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
              All Exams <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topExams.map((exam: any, index: number) => (
            <motion.div
              key={exam.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/exams/${exam.slug}`}
                className="group block bg-card rounded-2xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                    {exam.logo || exam.image ? (
                      <img src={exam.logo || exam.image} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Calendar className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {exam.short_name || exam.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{exam.full_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{exam.category}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{exam.level}</Badge>
                      {exam.mode && (
                        <span className="text-[10px] text-muted-foreground">{exam.mode}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
