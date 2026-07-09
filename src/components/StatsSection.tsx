import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users, Award, TrendingUp, Sparkles } from "lucide-react";

const stats = [
  { icon: GraduationCap, value: "5,000+", label: "Partner Colleges", color: "from-amber-400 to-orange-500" },
  { icon: BookOpen, value: "10,000+", label: "Courses Available", color: "from-teal-400 to-emerald-500" },
  { icon: Users, value: "1M+", label: "Students Guided", color: "from-violet-400 to-purple-500" },
  { icon: Award, value: "500+", label: "Entrance Exams", color: "from-rose-400 to-pink-500" },
  { icon: TrendingUp, value: "95%", label: "Success Rate", color: "from-amber-500 to-orange-600" },
  { icon: Sparkles, value: "24/7", label: "AI Support", color: "from-sky-400 to-blue-500" },
];

export function StatsSection() {
  return (
    <section className="py-8 md:py-12 bg-card relative overflow-hidden" aria-label="Platform statistics">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-headline font-bold text-foreground">
            Trusted by <span className="text-gradient-accent">Millions</span>
          </h2>
          <p className="mt-2 text-muted-foreground">
            India's most comprehensive education platform
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border p-5 text-center group shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
