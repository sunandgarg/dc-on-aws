import { motion, useScroll, useTransform } from "framer-motion";
import { Globe, ArrowRight, Plane, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

const countries = [
  { name: "United States", flag: "🇺🇸", colleges: "2000+", color: "from-blue-500 to-blue-700" },
  { name: "United Kingdom", flag: "🇬🇧", colleges: "150+", color: "from-red-500 to-red-700" },
  { name: "Canada", flag: "🇨🇦", colleges: "300+", color: "from-red-500 to-red-600" },
  { name: "Australia", flag: "🇦🇺", colleges: "200+", color: "from-yellow-500 to-yellow-600" },
  { name: "Germany", flag: "🇩🇪", colleges: "400+", color: "from-gray-700 to-gray-900" },
  { name: "New Zealand", flag: "🇳🇿", colleges: "80+", color: "from-blue-600 to-blue-800" },
];

const flightPath = "M 50,80 Q 150,20 300,40 Q 450,60 550,25 Q 650,0 750,30 Q 850,50 950,20";

export function StudyAbroadSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const planeX = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "85%"]);
  const planeY = useTransform(scrollYProgress, [0.1, 0.4, 0.6, 0.9], ["60px", "10px", "30px", "5px"]);
  const planeRotate = useTransform(scrollYProgress, [0.1, 0.3, 0.5, 0.7, 0.9], [-15, 5, -10, 5, -5]);

  return (
    <section ref={sectionRef} className="py-12 md:py-20 relative overflow-hidden" aria-labelledby="abroad-heading">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      {/* Dotted flight path SVG */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg viewBox="0 0 1000 100" className="w-full h-24 mt-20" preserveAspectRatio="none">
          <path d={flightPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="8 6" />
        </svg>
      </div>

      {/* Animated plane */}
      <motion.div
        style={{ x: planeX, y: planeY, rotate: planeRotate }}
        className="absolute top-16 left-4 z-10 pointer-events-none"
      >
        <div className="relative">
          <Plane className="w-10 h-10 md:w-14 md:h-14 text-primary fill-primary/20 drop-shadow-lg" />
          {/* Trail effect */}
          <motion.div
            className="absolute -left-8 top-1/2 -translate-y-1/2 w-12 h-1 rounded-full bg-gradient-to-l from-primary/40 to-transparent"
            animate={{ opacity: [0.3, 0.7, 0.3], scaleX: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {/* Smoke dots */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-primary/20"
              style={{ left: -16 - i * 10, top: "45%", width: 6 - i, height: 6 - i }}
              animate={{ opacity: [0.4, 0, 0.4], scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </motion.div>

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Globe className="w-4 h-4" />
            Study Abroad Programs
          </div>
          <h2 id="abroad-heading" className="text-headline font-extrabold text-foreground mb-3">
            Your Dream of Studying <span className="text-gradient">Abroad</span> Starts Here
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            MS, MBA & Bachelors from top universities in US, UK, Canada, Australia & Germany
          </p>
        </motion.div>

        {/* Country Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
          {countries.map((country, i) => (
            <motion.div
              key={country.name}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              whileHover={{ y: -8, scale: 1.05 }}
              className="group relative bg-card rounded-2xl border border-border p-4 md:p-5 text-center cursor-pointer overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${country.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              
              <motion.div
                className="text-4xl md:text-5xl mb-2"
                whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                {country.flag}
              </motion.div>
              <h3 className="font-bold text-sm text-foreground">{country.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                {country.colleges} Universities
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button size="lg" className="gradient-primary btn-glow rounded-xl text-base px-8">
            <Globe className="w-5 h-5 mr-2" />
            Explore Study Abroad <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
