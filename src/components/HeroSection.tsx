import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Zap,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  Star,
  Newspaper,
  MapPin,
  ArrowRight,
  Search,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useHeroSettings } from "@/hooks/useHeroSettings";
import dcLogo from "@/assets/dc-logo.png";
import iconCollege from "@/assets/cat-college.png";
import iconCourse from "@/assets/cat-course.png";
import iconExam from "@/assets/cat-exam.png";
import iconApplication from "@/assets/cat-application.png";
import iconReviews from "@/assets/cat-reviews.png";
import iconNews from "@/assets/cat-news.png";
import { HeroCounsellingCard } from "@/components/HeroCounsellingCard";

const rotatingWords = ["College", "Course", "Career", "Exam", "Future"];
const wordColors = ["text-gradient", "text-gradient-accent", "text-gradient", "text-gradient-accent", "text-gradient"];

const YEAR = new Date().getFullYear();
const suggestedPrompts = [
  "Best colleges for B.Tech CSE?",
  `How to crack JEE Main ${YEAR}?`,
  "IIT vs NIT - what's right for me?",
  "Top MBA colleges after graduation?",
];

type QuickCategory = { key: string; label: string; img: string; tint: string; href: string };

const DEFAULT_QUICK_CATEGORIES: QuickCategory[] = [
  { key: "college",     label: "13,004+ Colleges", img: iconCollege,     tint: "bg-rose-50 hover:bg-rose-100/70 border-rose-100",         href: "/colleges" },
  { key: "course",      label: "840+ Courses",     img: iconCourse,      tint: "bg-sky-50 hover:bg-sky-100/70 border-sky-100",            href: "/courses" },
  { key: "exam",        label: "219+ Exams",       img: iconExam,        tint: "bg-violet-50 hover:bg-violet-100/70 border-violet-100",   href: "/exams" },
  { key: "application", label: "Application Form", img: iconApplication, tint: "bg-emerald-50 hover:bg-emerald-100/70 border-emerald-100", href: "/colleges" },
  { key: "review",      label: "Review",           img: iconReviews,     tint: "bg-amber-50 hover:bg-amber-100/70 border-amber-100",      href: "/colleges" },
  { key: "news",        label: "News",             img: iconNews,        tint: "bg-sky-50 hover:bg-sky-100/70 border-sky-100",            href: "/news" },
];

interface SearchResult {
  type: "College" | "Course" | "Exam" | "Career" | "Faculty";
  name: string;
  location: string;
  slug: string;
  logo?: string;
  image?: string;
}

interface HeroSectionProps {
  onOpenChat?: (initialMessage?: string) => void;
}

export function HeroSection({ onOpenChat }: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  // Admin-managed hero bar tiles (fallback to static if unavailable/empty)
  const { data: heroCategoryRows } = useQuery({
    queryKey: ["hero-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hero_categories")
        .select("key,label,image_url,href,tint,is_active,display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as Array<{ key: string; label: string; image_url: string; href: string; tint: string }>) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const quickCategories: QuickCategory[] = useMemo(() => {
    const rows = heroCategoryRows ?? [];
    if (rows.length === 0) return DEFAULT_QUICK_CATEGORIES;
    const byKey = new Map(DEFAULT_QUICK_CATEGORIES.map((d) => [d.key, d]));
    return rows.map((r) => {
      const fallback = byKey.get(r.key);
      return {
        key: r.key,
        label: r.label || fallback?.label || r.key,
        img: r.image_url || fallback?.img || iconCollege,
        tint: r.tint || fallback?.tint || "bg-muted border-border",
        href: r.href || fallback?.href || "/",
      };
    });
  }, [heroCategoryRows]);


  const [bgIndex, setBgIndex] = useState(0);
  const { data: heroSettings } = useHeroSettings();
  const bgImages = useMemo(() => {
    return (heroSettings?.is_active && heroSettings.image_urls?.filter(Boolean)) || [];
  }, [heroSettings]);
  const rotationMs = (heroSettings?.rotation_seconds ?? 11) * 1000;

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // 2026 UX: ambient campus carousel - admin-configurable rotation, respects reduced-motion
  useEffect(() => {
    if (bgImages.length <= 1) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setBgIndex((i) => (i + 1) % bgImages.length), rotationMs);
    return () => clearInterval(id);
  }, [bgImages.length, rotationMs]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) {
      setDbResults([]);
      return;
    }

    // Fuzzy variants: handle dots/spaces (b.tech ↔ btech ↔ b tech),
    // common abbreviations and PG/UG prefixes.
    const buildVariants = (s: string) => {
      const norm = s.replace(/\s+/g, " ").trim();
      const noDot = norm.replace(/\./g, "");
      const noPunct = noDot.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
      const compact = noPunct.replace(/\s+/g, "");
      const spaced = noDot.replace(/([a-z])\.?(tech|com|sc|ed|ca|pharm|arch|des|ba|ma|phil|phd)\b/gi, "$1 $2");
      const dotted = compact.replace(/^(b|m)(tech|com|sc|ed|ca|pharm|arch|des|ba|ma|phil|phd)/i, "$1.$2");
      const synonyms: Record<string, string[]> = {
        btech: ["b.tech", "bachelor of technology", "be"],
        mtech: ["m.tech", "master of technology"],
        bsc: ["b.sc", "bachelor of science"],
        msc: ["m.sc", "master of science"],
        ba: ["b.a", "bachelor of arts"],
        ma: ["m.a", "master of arts"],
        mba: ["master of business"],
        bba: ["bachelor of business"],
        bcom: ["b.com", "bachelor of commerce"],
        mcom: ["m.com", "master of commerce"],
        bca: ["b.c.a", "bachelor of computer"],
        mca: ["m.c.a", "master of computer"],
      };
      const extras = synonyms[compact.toLowerCase()] || [];
      return Array.from(new Set([norm, noDot, noPunct, compact, spaced, dotted, ...extras].filter(v => v && v.length >= 2)));
    };

    const variants = buildVariants(q);
    const orFor = (col: string) =>
      variants.map(v => `${col}.ilike.%${v.replace(/[%,()]/g, "")}%`).join(",");

    const timeout = setTimeout(async () => {
      try {
        const [colleges, courses, exams, careers, faculty] = await Promise.all([
          supabase
            .from("colleges")
            .select("name, slug, city, logo")
            .eq("is_active", true)
            .or(orFor("name"))
            .limit(4),
          supabase.from("courses").select("name, slug").eq("is_active", true).or(orFor("name")).limit(3),
          supabase
            .from("exams")
            .select("name, slug, image, logo")
            .eq("is_active", true)
            .or(orFor("name"))
            .limit(3),
          (supabase as any)
            .from("career_profiles")
            .select("name, slug, image, domain")
            .eq("is_active", true)
            .or(`${orFor("name")},${orFor("domain")}`)
            .limit(3),
          (supabase as any)
            .from("faculty")
            .select("name, photo, designation, college_slug")
            .eq("is_active", true)
            .or(`${orFor("name")},${orFor("designation")}`)
            .limit(3),
        ]);

        const results: SearchResult[] = [
          ...(colleges.data || []).map((c) => ({
            type: "College" as const,
            name: c.name,
            slug: c.slug,
            location: c.city || "",
            logo: c.logo || "",
          })),
          ...(courses.data || []).map((c) => ({ type: "Course" as const, name: c.name, slug: c.slug, location: "" })),
          ...(exams.data || []).map((e) => ({
            type: "Exam" as const,
            name: e.name,
            slug: e.slug,
            location: "",
            image: e.image || "",
            logo: e.logo || "",
          })),
          ...((careers.data as any[]) || []).map((c: any) => ({
            type: "Career" as const,
            name: c.name,
            slug: c.slug,
            location: c.domain || "",
            image: c.image || "",
          })),
          ...((faculty.data as any[]) || []).map((f: any) => ({
            type: "Faculty" as const,
            name: f.name,
            slug: f.college_slug,
            location: f.designation || "",
            image: f.photo || "",
          })),
        ];
        setDbResults(results);
      } catch {
        /* skip */
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOpenChat) {
      onOpenChat(searchQuery.trim() || undefined);
      setSearchQuery("");
    }
  };

  const handleResultClick = (item: SearchResult) => {
    setSearchQuery("");
    setIsFocused(false);
    const route =
      item.type === "College" ? `/colleges/${item.slug}` :
      item.type === "Course"  ? `/courses/${item.slug}`  :
      item.type === "Exam"    ? `/exams/${item.slug}`    :
      item.type === "Career"  ? `/careers/${item.slug}`  :
      `/colleges/${item.slug}#faculty`;
    navigate(route);
  };

  const handleSuggestionClick = (prompt: string) => {
    if (onOpenChat) onOpenChat(prompt);
  };

  const showDropdown = isFocused && searchQuery.trim().length >= 2 && dbResults.length > 0;

  const getIcon = (item: SearchResult) => {
    if (item.type === "College") return GraduationCap;
    if (item.type === "Course") return BookOpen;
    if (item.type === "Career") return Sparkles;
    if (item.type === "Faculty") return Star;
    return FileText;
  };

  const getThumb = (item: SearchResult) => {
    if (item.type === "College" && item.logo) {
      return <img src={item.logo} alt="" className="w-10 h-10 rounded-xl object-cover" />;
    }
    if (item.type === "Exam" && (item.image || item.logo)) {
      return <img src={item.logo || item.image!} alt="" className="w-10 h-10 rounded-xl object-cover" />;
    }
    if ((item.type === "Career" || item.type === "Faculty") && item.image) {
      return <img src={item.image} alt="" className="w-10 h-10 rounded-xl object-cover" />;
    }
    const Icon = getIcon(item);
    return (
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    );
  };

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-background via-secondary/30 to-background"
      aria-label="Hero"
    >
      {/* Background - bold campus image at top, smoothly fading to background where search bar sits */}
      {bgImages.length > 0 && <div className="absolute inset-x-0 top-0 h-[58%] md:h-[62%] overflow-hidden" aria-hidden="true">
        <AnimatePresence mode="sync">
          <motion.div
            key={bgIndex}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ opacity: { duration: 1.6, ease: "easeInOut" }, scale: { duration: rotationMs / 1000, ease: "linear" } }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bgImages[bgIndex % bgImages.length]})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: heroSettings?.overlay_mode === "none" ? 1 : (heroSettings?.overlay_opacity ?? 0.45) + 0.4,
              filter: `blur(${heroSettings?.blur_px ?? 3}px) saturate(${heroSettings?.saturation ?? 1.05}) brightness(${heroSettings?.brightness ?? 1}) grayscale(${heroSettings?.grayscale ?? 0})`,
              transform: "scale(1.05)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.95) 35%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.95) 35%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)",
            }}
          />
        </AnimatePresence>
        {/* Admin-configurable tint/overlay */}
        {heroSettings && heroSettings.overlay_mode !== "none" && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: heroSettings.overlay_mode === "gradient"
              ? `linear-gradient(180deg, ${heroSettings.tint_color}00 0%, ${heroSettings.tint_color}${Math.round(heroSettings.overlay_opacity * 255).toString(16).padStart(2,"0")} 100%)`
              : heroSettings.overlay_mode === "tint"
                ? `${heroSettings.tint_color}${Math.round(heroSettings.overlay_opacity * 255).toString(16).padStart(2,"0")}`
                : heroSettings.overlay_mode === "light"
                  ? `rgba(255,255,255,${heroSettings.overlay_opacity})`
                  : `rgba(0,0,0,${heroSettings.overlay_opacity})`,
          }} />
        )}
        {/* Crisp top + smooth fade to base background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/35 to-background pointer-events-none" />
      </div>}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* 2026 aurora orbs - ambitio-style ambient gradient glow */}
        <motion.div
          aria-hidden
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[10%] w-[520px] h-[520px] bg-accent/20 rounded-full blur-[140px]"
        />
        <motion.div
          aria-hidden
          animate={{ x: [0, -30, 25, 0], y: [0, 25, -15, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] right-[5%] w-[460px] h-[460px] bg-primary/20 rounded-full blur-[140px]"
        />
        <motion.div
          aria-hidden
          animate={{ x: [0, 25, -25, 0], y: [0, -20, 15, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-5%] left-[35%] w-[380px] h-[380px] bg-accent/8 rounded-full blur-[140px]"
        />
      </div>

      <div className="container relative z-10 px-4 py-8 md:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] lg:gap-12">
            <div className="space-y-5 text-left md:space-y-7">
              {/* AI Badge + Built by IIT Delhi Alumni hero statement */}
              <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-start justify-start gap-4"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/25">
              <img src={dcLogo} alt="DekhoCampus" className="w-4 h-4 object-contain" />
              <span className="text-[11px] md:text-xs font-semibold tracking-wide uppercase text-accent">
                AI-Powered Education
              </span>
            </span>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 22 }}
              className="relative flex max-w-2xl flex-col items-start gap-2 text-left"
              aria-label="An Initiative by IIT Delhi Alumni - trusted by 1 lakh plus students"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight text-primary">
                An Initiative by IIT Delhi Alumni
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground font-medium max-w-xl">
                We went through the same journey - now we've built the system to simplify yours.
              </p>
              <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] md:text-xs font-medium text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Trusted by 1L+ Students
              </span>
            </motion.div>
          </motion.div>

          {/* Rotating headline */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-[33px] sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.15] tracking-tight">
              Discover Your Ideal
              <br />
              <AnimatePresence mode="wait">
                <motion.span
                  key={rotatingWords[wordIndex]}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`inline-block ${wordColors[wordIndex]}`}
                >
                  {rotatingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </h1>
          </motion.div>

          {/* Unified Search Bar with AI icon */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
                className="max-w-2xl"
              >
            <form onSubmit={handleAskAI}>
              <div className="relative">
                <div
                  className={`relative flex items-center bg-card/90 backdrop-blur-xl rounded-full shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.25)] border p-1.5 transition-all ${isFocused ? "border-primary/40 ring-2 ring-primary/10" : "border-border/60"}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center ml-1">
                    {searchQuery.trim() ? (
                      <Search className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Search className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder="Search Colleges, Courses, Exams or Ask AI..."
                    className="flex-1 bg-transparent border-0 text-sm md:text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 py-2.5 md:py-3 px-1 text-foreground min-w-0"
                    aria-label="Search or ask AI"
                  />
                  <Button
                    type="submit"
                    size="default"
                    className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground px-4 md:px-6 shadow-lg h-10 md:h-11 relative"
                    aria-label="Ask AI"
                  >
                    <Send className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline font-semibold text-sm">Ask AI</span>
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 h-4 rounded-full bg-white border border-accent/30 text-[9px] text-accent font-bold flex items-center justify-center shadow-sm">
                      AI
                    </span>
                  </Button>
                </div>

                {/* Search Results Dropdown */}
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="py-2">
                      {dbResults.map((item) => (
                        <button
                          key={`${item.type}-${item.slug}`}
                          onMouseDown={() => handleResultClick(item)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          {getThumb(item)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate text-sm">{item.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{item.type}</span>
                              {item.location && (
                                <>
                                  <span>•</span>
                                  <MapPin className="w-3 h-3" />
                                  <span>{item.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                    {/* Ask AI option at bottom */}
                    <div className="border-t border-border px-4 py-2.5">
                      <button
                        onMouseDown={handleAskAI as any}
                        className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-accent text-sm">Ask AI Counselor</p>
                          <p className="text-xs text-muted-foreground">Get personalized guidance for "{searchQuery}"</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </form>

            {/* Prompt chips */}
            <div className="mt-3 flex flex-wrap items-center justify-start gap-1.5 md:gap-2">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs text-muted-foreground font-medium">Try:</span>
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestionClick(prompt)}
                  className="px-2.5 py-1 text-[11px] md:text-xs bg-card border border-border/60 rounded-full text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {prompt}
                </button>
              ))}
              </div>
          </motion.div>

            </div>

            <HeroCounsellingCard onStart={(message) => handleSuggestionClick(message)} />
          </div>

          {/* Big stat tiles (dekhocampus-style) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-8 max-w-7xl px-4 pt-3 -mx-4 md:mx-0 md:px-0 lg:mt-10"
          >
            <div className="flex md:grid md:grid-cols-6 gap-3 md:gap-5 overflow-x-auto md:overflow-visible scrollbar-hide snap-x snap-mandatory pb-1">
              {quickCategories.map((cat, index) => (
                <motion.a
                  key={cat.label}
                  href={cat.href}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.04 }}
                  className={`snap-start shrink-0 basis-[22%] min-w-[78px] md:min-w-0 flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-5 min-h-[112px] md:min-h-[160px] rounded-2xl md:rounded-3xl border shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 group text-center ${cat.tint}`}
                >
                  <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center transition-transform group-hover:scale-110">
                    <img src={cat.img} alt="" className="w-full h-full object-contain" loading="lazy" />
                  </div>
                  <span className="text-[11px] md:text-[14px] font-semibold text-foreground leading-tight line-clamp-2 [overflow-wrap:normal] [word-break:keep-all]">
                    {cat.label}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 shadow-sm sm:grid-cols-3 lg:grid-cols-6" aria-label="DekhoCampus trust markers">
            {["13,000+ colleges", "1L+ students guided", "Verified fees", "AI + human guidance", "No agent markup", "Built for Bharat"].map((item) => (
              <div key={item} className="bg-card/90 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground backdrop-blur sm:text-[11px]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
