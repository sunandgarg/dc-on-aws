import { motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { useState } from "react";

interface AdBannerProps {
  variant?: "horizontal" | "vertical" | "square" | "leaderboard";
  position?: string;
  className?: string;
}

const adContent = {
  horizontal: {
    title: `Prepare for JEE/NEET ${new Date().getFullYear()}`,
    subtitle: "Get 50% off on premium courses",
    cta: "Enroll Now",
    bg: "from-violet-600 to-purple-600",
    size: "h-24 md:h-28",
  },
  vertical: {
    title: "Study Abroad",
    subtitle: "Free counseling for top universities",
    cta: "Apply Free",
    bg: "from-teal-500 to-emerald-500",
    size: "min-h-[280px]",
  },
  square: {
    title: "MBA Admissions",
    subtitle: `CAT ${new Date().getFullYear()} prep starts now`,
    cta: "Start Free",
    bg: "from-amber-500 to-orange-500",
    size: "aspect-square",
  },
  leaderboard: {
    title: `🎓 Admissions Open ${new Date().getFullYear()} - Top Engineering Colleges - Apply Now & Get Scholarship Up to ₹2 Lakhs`,
    subtitle: "",
    cta: "Apply",
    bg: "from-rose-500 to-pink-500",
    size: "h-14 md:h-16",
  },
};

export function AdBanner({ variant = "horizontal", position = "Ad", className = "" }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const content = adContent[variant];

  if (!isVisible) return null;

  // Leaderboard - thin horizontal banner
  if (variant === "leaderboard") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative bg-gradient-to-r ${content.bg} ${content.size} flex items-center justify-center px-4 ${className}`}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <p className="text-white text-sm md:text-base font-medium truncate animate-marquee">
            {content.title}
          </p>
          <button className="flex-shrink-0 px-4 py-1.5 bg-white text-foreground text-sm font-semibold rounded-full hover:bg-white/90 transition-colors">
            {content.cta}
          </button>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          aria-label="Close ad"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/50 uppercase tracking-wider">
          Ad
        </span>
      </motion.div>
    );
  }

  // Horizontal banner
  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`relative bg-gradient-to-r ${content.bg} ${content.size} rounded-2xl overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNGMwIDItMiA0LTIgNHMtMi0yLTItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative h-full flex items-center justify-between px-6 md:px-8">
          <div className="flex-1">
            <h4 className="text-lg md:text-xl font-bold text-white">{content.title}</h4>
            <p className="text-white/80 text-sm">{content.subtitle}</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-foreground font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg">
            {content.cta}
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
        <span className="absolute left-3 bottom-2 text-[10px] text-white/40 uppercase tracking-wider">
          {position}
        </span>
      </motion.div>
    );
  }

  // Vertical sidebar ad
  if (variant === "vertical") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className={`relative bg-gradient-to-b ${content.bg} ${content.size} rounded-2xl overflow-hidden flex flex-col justify-between p-5 ${className}`}
      >
        <div>
          <span className="text-[10px] text-white/50 uppercase tracking-wider mb-3 block">{position}</span>
          <h4 className="text-xl font-bold text-white mb-2">{content.title}</h4>
          <p className="text-white/80 text-sm">{content.subtitle}</p>
        </div>
        <button className="w-full py-2.5 bg-white text-foreground font-semibold rounded-xl hover:bg-white/90 transition-colors mt-4">
          {content.cta}
        </button>
      </motion.div>
    );
  }

  // Square ad
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`relative bg-gradient-to-br ${content.bg} ${content.size} rounded-2xl overflow-hidden flex flex-col items-center justify-center p-5 text-center ${className}`}
    >
      <span className="absolute top-2 left-2 text-[10px] text-white/50 uppercase tracking-wider">{position}</span>
      <h4 className="text-xl font-bold text-white mb-2">{content.title}</h4>
      <p className="text-white/80 text-sm mb-4">{content.subtitle}</p>
      <button className="px-6 py-2 bg-white text-foreground font-semibold rounded-xl hover:bg-white/90 transition-colors">
        {content.cta}
      </button>
    </motion.div>
  );
}