import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { AIDisclaimer } from "@/components/AIDisclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Download, Sparkles, Calendar, BookOpen, AlertTriangle, Trophy, Lock, Flame, Share2, Check, LayoutDashboard, Zap, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { silentSaveLead } from "@/lib/leadCapture";
import { DekhoCampusAILoader } from "@/components/tools/DekhoCampusAILoader";
import { downloadRoadmapPDF, type RoadmapData } from "@/lib/targetRoadmapPdf";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { buildLockTargetSeo } from "@/lib/lockTargetSeo";


const CLASS_LEVELS = ["10", "11", "12", "Dropper"];
const STREAMS = ["Science (PCM)", "Science (PCB)", "Science (PCMB)", "Commerce", "Arts", "Vocational"];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE"];

// SEO-friendly trending target slugs students search for.
// These are auto-handled at /lock-target/:slug.
const TRENDING_TARGETS: { slug: string; college: string; course: string }[] = [
  { slug: "iit-bombay-cse", college: "IIT Bombay", course: "Computer Science Engineering" },
  { slug: "iit-delhi-cse", college: "IIT Delhi", course: "Computer Science Engineering" },
  { slug: "iit-madras-cse", college: "IIT Madras", course: "Computer Science Engineering" },
  { slug: "aiims-delhi-mbbs", college: "AIIMS Delhi", course: "MBBS" },
  { slug: "nit-trichy-cse", college: "NIT Trichy", course: "Computer Science Engineering" },
  { slug: "iiit-hyderabad-cse", college: "IIIT Hyderabad", course: "Computer Science Engineering" },
  { slug: "bits-pilani-cse", college: "BITS Pilani", course: "Computer Science Engineering" },
  { slug: "iim-ahmedabad-mba", college: "IIM Ahmedabad", course: "MBA / PGP" },
  { slug: "nlsiu-bangalore-llb", college: "NLSIU Bangalore", course: "5-year B.A. LL.B (Hons.)" },
  { slug: "srcc-delhi-bcom", college: "SRCC, Delhi University", course: "B.Com (Hons.)" },
  { slug: "st-stephens-delhi", college: "St. Stephen's College, DU", course: "BA Economics (Hons.)" },
  { slug: "miranda-house-delhi", college: "Miranda House, DU", course: "BA / BSc (Hons.)" },
  { slug: "nid-ahmedabad-bdes", college: "NID Ahmedabad", course: "B.Des" },
  { slug: "nift-delhi-bdes", college: "NIFT Delhi", course: "B.Des / B.FTech" },
];

export default function LockTarget() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [targetCollege, setTargetCollege] = useState("");
  const [targetCourse, setTargetCourse] = useState("");
  const [classLevel, setClassLevel] = useState("11");
  const [stream, setStream] = useState(STREAMS[0]);
  const [board, setBoard] = useState("CBSE");
  const [currentPercent, setCurrentPercent] = useState("");
  const [state, setState] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("6");
  const [weaknesses, setWeaknesses] = useState("");

  const [showLead, setShowLead] = useState(false);
  const [phase, setPhase] = useState<"idle" | "locked">("idle");
  const [aiLoading, setAiLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [readOnlyShare, setReadOnlyShare] = useState(false);

  // Hydrate from query params (e.g. ?class=12)
  useEffect(() => {
    const q = searchParams.get("class");
    if (q && CLASS_LEVELS.includes(q)) setClassLevel(q);
  }, [searchParams]);

  // Load shared roadmap from ?s=<token>
  useEffect(() => {
    const token = searchParams.get("s");
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from("target_roadmaps")
        .select("*")
        .eq("share_token", token)
        .maybeSingle();
      if (error || !data) return;
      setTargetCollege(data.target_college || "");
      setTargetCourse(data.target_course || "");
      setClassLevel(data.class_level || "11");
      setStream(data.stream || STREAMS[0]);
      setBoard(data.board || "CBSE");
      setCurrentPercent(data.current_percent || "");
      setState(data.state || "");
      setHoursPerDay(String(data.hours_per_day || 6));
      setWeaknesses(data.weaknesses || "");
      setRoadmap(data.roadmap as RoadmapData);
      setShareToken(data.share_token);
      setSavedId(data.id);
      setPhase("locked");
      setReadOnlyShare(true);
      setTimeout(() => window.scrollTo({ top: 500, behavior: "smooth" }), 100);
    })();
  }, [searchParams]);

  // Personalize from logged-in profile (silent prefill — user can still edit)
  useEffect(() => {
    if (!user || readOnlyShare) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_stream,state,city,class_10_percentage,class_12_percentage,education_status,current_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return;
      if (data.preferred_stream) {
        const match = STREAMS.find((s) => s.toLowerCase().includes(String(data.preferred_stream).toLowerCase()));
        if (match) setStream((prev) => (prev === STREAMS[0] ? match : prev));
      }
      if (data.state) setState((prev) => prev || String(data.state));
      const pct = data.class_12_percentage || data.class_10_percentage;
      if (pct) setCurrentPercent((prev) => prev || String(pct));
      const status = String(data.education_status || data.current_status || "").toLowerCase();
      if (status.includes("12")) setClassLevel((prev) => prev === "11" ? "12" : prev);
      if (status.includes("drop")) setClassLevel("Dropper");
    })();
  }, [user, readOnlyShare]);

  // Hydrate from trending slug
  useEffect(() => {
    if (!slug || readOnlyShare) return;
    const match = TRENDING_TARGETS.find((t) => t.slug === slug);
    if (match) {
      setTargetCollege(match.college);
      setTargetCourse(match.course);
    } else {
      const parts = slug.split("-");
      setTargetCollege(parts.slice(0, -1).join(" ").replace(/\b\w/g, (c) => c.toUpperCase()) || slug.replace(/-/g, " "));
    }
  }, [slug, readOnlyShare]);



  function onLock(e: React.FormEvent) {
    e.preventDefault();
    if (!targetCollege.trim()) return;
    // Sync URL for SEO
    const newSlug = (targetCollege + (targetCourse ? "-" + targetCourse : "")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    if (newSlug && newSlug !== slug) navigate(`/lock-target/${newSlug}`, { replace: true });
    setShowLead(true);
  }

  async function runAi() {
    try {
      setAiLoading(true);
      setRoadmap(null);
      const { data, error } = await supabase.functions.invoke("target-roadmap", {
        body: {
          targetCollege: targetCollege.trim(),
          targetCourse: targetCourse.trim() || null,
          classLevel,
          stream,
          board,
          currentPercent: currentPercent || null,
          state: state || null,
          hoursPerDay: Number(hoursPerDay) || 6,
          weaknesses: weaknesses || null,
        },
      });
      if (!error && data) {
        setRoadmap(data as RoadmapData);
        // Save for logged-in users → enables dashboard + shareable link
        if (user) {
          try {
            const { data: saved } = await supabase
              .from("target_roadmaps")
              .insert({
                user_id: user.id,
                slug: slug || null,
                target_college: targetCollege.trim(),
                target_course: targetCourse.trim() || null,
                class_level: classLevel,
                stream,
                board,
                current_percent: currentPercent || null,
                state: state || null,
                hours_per_day: Number(hoursPerDay) || 6,
                weaknesses: weaknesses || null,
                roadmap: data as any,
                is_primary: true,
              })
              .select("id, share_token")
              .single();
            if (saved) {
              setSavedId(saved.id);
              setShareToken(saved.share_token);
              // Demote previous primary roadmaps for this user
              await supabase
                .from("target_roadmaps")
                .update({ is_primary: false })
                .eq("user_id", user.id)
                .neq("id", saved.id);
            }
          } catch (e) {
            console.warn("save roadmap failed", e);
          }
        }
      } else toast.error("Couldn't generate roadmap. Try again.");
    } catch (e) {
      console.error("roadmap error", e);
      toast.error("Couldn't generate roadmap.");
    } finally {
      setAiLoading(false);
    }
  }

  async function onDownload() {
    if (!roadmap) return;
    try {
      setDownloading(true);
      await downloadRoadmapPDF(roadmap, {
        targetCollege,
        targetCourse,
        classLevel,
        stream,
      });
      toast.success("Roadmap downloaded 🎯");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't download PDF.");
    } finally {
      setDownloading(false);
    }
  }

  async function onShare() {
    if (!shareToken) {
      toast.error("Sign in once so we can save & share your roadmap.");
      return;
    }
    const url = `${window.location.origin}/lock-target${slug ? `/${slug}` : ""}?s=${shareToken}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `🎯 My ${targetCollege} roadmap`,
          text: `My AI roadmap to crack ${targetCollege}${targetCourse ? " " + targetCourse : ""}. Built on DekhoCampus.`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        toast.success("Share link copied 🔗");
      }
    } catch {
      /* user cancelled */
    }
  }

  const seo = useMemo(() => buildLockTargetSeo(slug), [slug]);
  const seoTitle = seo.title;
  const seoDesc = seo.description;

  // Derived AI widgets from roadmap (no extra API calls)
  const next7Days = useMemo(() => buildNext7Days(roadmap, Number(hoursPerDay) || 6), [roadmap, hoursPerDay]);
  const checkpoints = useMemo(() => buildCheckpoints(roadmap), [roadmap]);


  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDesc}
        keywords={seo.keywords}
        canonical={seo.canonical}
        ogImage={seo.ogImage}
        ogType="article"
        jsonLd={seo.jsonLd}
      />

      <Navbar />

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <PageBreadcrumb items={[{ label: "Home", href: "/" }, { label: "Lock Your Target", href: "/lock-target" }, ...(slug ? [{ label: slug.replace(/-/g, " ") }] : [])]} />

        {/* HERO */}
        <section className="mt-3 rounded-3xl bg-gradient-to-br from-orange-100 via-rose-50 to-amber-100 border border-orange-200/60 p-5 md:p-7 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-orange-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-52 h-52 bg-rose-200/40 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur text-[10px] font-bold text-orange-700 uppercase tracking-wider">
              <Flame className="w-3 h-3" /> Target with AI · New · Free PDF
            </div>
            <h1 className="mt-2.5 text-[28px] md:text-4xl font-black tracking-tight text-foreground leading-[1.05]">
              🎯 Target with <span className="text-orange-600">AI</span>.<br />
              Lock your <span className="underline decoration-orange-400 decoration-4 underline-offset-4">dream college</span> 🔒
            </h1>
            <p className="mt-2 text-[13px] md:text-base text-foreground/70">
              Built for GenZ. Tell us your dream college — our AI mentor breaks down the exact exam, syllabus, books, mock schedule & backup plan, then ships a downloadable PDF roadmap with your name on it.
            </p>


            <form onSubmit={onLock} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">🎯 Target college</label>
                <Input value={targetCollege} onChange={(e) => setTargetCollege(e.target.value)}
                  placeholder="e.g. IIT Bombay, AIIMS Delhi, NLSIU Bangalore" className="h-11 rounded-xl text-base" />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Course / Branch <span className="font-normal text-muted-foreground normal-case">(optional)</span></label>
                <Input value={targetCourse} onChange={(e) => setTargetCourse(e.target.value)}
                  placeholder="e.g. Computer Science, MBBS, B.A. LL.B" className="h-11 rounded-xl text-base" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">I'm in class</label>
                  <div className="flex flex-wrap gap-2">
                    {CLASS_LEVELS.map((c) => (
                      <button type="button" key={c} onClick={() => setClassLevel(c)}
                        className={`px-3 h-9 rounded-xl text-xs font-semibold border transition ${
                          classLevel === c ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:border-primary/60"
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Hrs/day</label>
                  <Input inputMode="numeric" value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                    className="h-11 rounded-xl text-base" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Stream</label>
                  <select value={stream} onChange={(e) => setStream(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Board</label>
                  <select value={board} onChange={(e) => setBoard(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Current %</label>
                  <Input inputMode="numeric" value={currentPercent}
                    onChange={(e) => setCurrentPercent(e.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
                    placeholder="e.g. 78" className="h-11 rounded-xl text-base" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">State</label>
                  <Input value={state} onChange={(e) => setState(e.target.value)}
                    placeholder="optional" className="h-11 rounded-xl text-base" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Where do you struggle? <span className="font-normal text-muted-foreground normal-case">(optional)</span></label>
                <Input value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="e.g. Physics numericals, time management" className="h-11 rounded-xl text-base" />
              </div>

              <Button type="submit" disabled={!targetCollege.trim()}
                className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-base font-bold">
                <Lock className="w-4 h-4 mr-2" /> Lock my target & build roadmap
              </Button>
            </form>
          </div>
        </section>

        {/* Trending targets - SEO + GenZ social proof */}
        {phase === "idle" && (
          <section className="mt-6">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">🔥 What other students are locking</p>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TARGETS.slice(0, 10).map((t) => (
                <button key={t.slug} onClick={() => { setTargetCollege(t.college); setTargetCourse(t.course); navigate(`/lock-target/${t.slug}`); }}
                  className="text-xs font-semibold px-3 h-8 rounded-full border border-border bg-card hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition">
                  {t.college} · {t.course.split(" ").slice(0, 2).join(" ")}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* RESULT */}
        {phase === "locked" && (
          <section className="mt-8 space-y-5">
            {aiLoading && <DekhoCampusAILoader />}

            {roadmap && (
              <>
                {/* Verdict + download */}
                <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-rose-50 p-5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-700 uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" /> Your locked roadmap
                  </div>
                  <Badge variant="secondary" className="text-[10px] mb-2">{targetCollege}{targetCourse ? ` · ${targetCourse}` : ""} · Class {classLevel}</Badge>
                  {roadmap.verdict && (
                    <p className="text-sm md:text-[15px] text-foreground leading-relaxed font-medium">{roadmap.verdict}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <Button onClick={onDownload} disabled={downloading}
                      className="h-11 rounded-xl bg-foreground hover:bg-foreground/90 text-background text-sm font-bold col-span-1 sm:col-span-1">
                      <Download className="w-4 h-4 mr-1.5" />
                      {downloading ? "Preparing…" : "Download PDF"}
                    </Button>
                    <Button onClick={onShare} variant="outline"
                      className="h-11 rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50 text-sm font-bold">
                      {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Share2 className="w-4 h-4 mr-1.5" />}
                      {copied ? "Link copied" : "Share my target"}
                    </Button>
                    <Button asChild variant="outline"
                      className="h-11 rounded-xl border-border text-foreground text-sm font-bold">
                      <Link to="/target-dashboard">
                        <LayoutDashboard className="w-4 h-4 mr-1.5" /> My dashboard
                      </Link>
                    </Button>
                  </div>

                  {!user && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      <Link to="/auth" className="text-orange-700 font-bold underline">Sign in</Link> to save this roadmap & unlock shareable link + dashboard.
                    </p>
                  )}

                  <AIDisclaimer
                    source="lock_target"
                    content={JSON.stringify(roadmap).slice(0, 6000)}
                    excerpt={roadmap.verdict}
                    context={{ targetCollege, targetCourse, classLevel, stream, board }}
                  />
                </div>

                {/* AI WIDGET — Next 7 days action plan */}
                {next7Days.length > 0 && (
                  <Block icon={<Zap className="w-4 h-4" />} title="🤖 AI · Next 7 days action plan">
                    <ul className="space-y-2">
                      {next7Days.map((d, i) => (
                        <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100 text-orange-700 text-[11px] font-extrabold shrink-0">{d.day}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground leading-tight">{d.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{d.subtitle}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-muted-foreground mt-2">Auto-generated from your locked target, daily hours and weekly plan.</p>
                  </Block>
                )}

                {/* AI WIDGET — Study plan checkpoints */}
                {checkpoints.length > 0 && (
                  <Block icon={<CalendarCheck className="w-4 h-4" />} title="🤖 AI · Study plan checkpoints">
                    <ol className="space-y-2">
                      {checkpoints.map((c, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-bold shrink-0">{i + 1}</span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{c.label}</p>
                            <p className="text-[11px] text-muted-foreground">{c.when}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </Block>
                )}


                {/* Entrance exams */}
                {roadmap.entranceExams?.length ? (
                  <Block icon={<Trophy className="w-4 h-4" />} title="Entrance exams you must crack">
                    <div className="space-y-2">
                      {roadmap.entranceExams.map((e, i) => (
                        <div key={i} className="p-3 rounded-xl border border-border bg-card overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 min-w-0">
                            <h4 className="text-sm font-bold text-foreground leading-tight min-w-0 break-words">{e.name}</h4>
                            {e.targetScore && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 max-w-full whitespace-normal break-words leading-snug self-start sm:text-right">{e.targetScore}</span>}
                          </div>
                          {e.why && <p className="text-xs text-foreground/70 mt-1 break-words">{e.why}</p>}
                          {e.officialUrl && <a href={e.officialUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-orange-600 underline mt-1 inline-block">Official site →</a>}
                        </div>
                      ))}
                    </div>
                  </Block>
                ) : null}

                {/* Milestones */}
                {roadmap.milestones?.length ? (
                  <Block icon={<Calendar className="w-4 h-4" />} title="Phase-by-phase plan">
                    <div className="space-y-3">
                      {roadmap.milestones.map((m, i) => (
                        <div key={i} className="relative pl-6 pb-3 border-l-2 border-orange-200 last:border-transparent">
                          <span className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-orange-500" />
                          <h4 className="text-sm font-bold text-foreground">{m.phase}</h4>
                          {m.focus && <p className="text-xs text-muted-foreground mb-1.5">{m.focus}</p>}
                          {m.tasks?.length ? (
                            <ul className="space-y-1">
                              {m.tasks.map((t, j) => <li key={j} className="text-xs text-foreground/85 flex gap-1.5"><span className="text-orange-500 shrink-0">›</span>{t}</li>)}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </Block>
                ) : null}

                {/* Weekly plan */}
                {roadmap.weeklyPlan?.subjects?.length ? (
                  <Block icon={<BookOpen className="w-4 h-4" />} title="Weekly subject plan">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {roadmap.weeklyPlan.subjects.map((s, i) => (
                        <div key={i} className="p-3 rounded-xl border border-border bg-card">
                          <p className="text-sm font-bold text-foreground">{s.subject} {s.hoursPerWeek ? <span className="text-[10px] text-orange-600 font-semibold">· {s.hoursPerWeek}h/wk</span> : null}</p>
                          {s.approach && <p className="text-[11px] text-foreground/70 mt-1">{s.approach}</p>}
                          {s.topPriorityChapters?.length ? (
                            <p className="text-[11px] text-muted-foreground mt-1.5">📌 {s.topPriorityChapters.join(", ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {roadmap.weeklyPlan.mockSchedule && (
                      <p className="text-xs text-foreground/80 mt-3"><span className="font-bold">Mocks:</span> {roadmap.weeklyPlan.mockSchedule}</p>
                    )}
                  </Block>
                ) : null}

                {/* Books + resources */}
                {(roadmap.books?.length || roadmap.freeResources?.length) ? (
                  <Block icon={<BookOpen className="w-4 h-4" />} title="Books & free resources">
                    {roadmap.books?.length ? (
                      <ul className="space-y-1 mb-3">
                        {roadmap.books.map((b, i) => <li key={i} className="text-xs text-foreground"><span className="font-bold">{b.subject}:</span> {b.books.join(" · ")}</li>)}
                      </ul>
                    ) : null}
                    {roadmap.freeResources?.length ? (
                      <ul className="space-y-1">
                        {roadmap.freeResources.map((r, i) => (
                          <li key={i} className="text-xs text-foreground">
                            <span className="font-bold">{r.name}</span>{r.use ? ` — ${r.use}` : ""}
                            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-orange-600 underline">link</a>}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Block>
                ) : null}

                {/* Backup */}
                {roadmap.backupColleges?.length ? (
                  <Block icon={<Target className="w-4 h-4" />} title="Backup colleges (Plan B)">
                    <ul className="space-y-1.5">
                      {roadmap.backupColleges.map((c, i) => (
                        <li key={i} className="text-xs text-foreground">
                          <span className="font-bold">{c.name}</span>{c.exam ? <span className="text-muted-foreground"> · via {c.exam}</span> : ""}
                          {c.why && <span className="text-foreground/70"> — {c.why}</span>}
                        </li>
                      ))}
                    </ul>
                  </Block>
                ) : null}

                {/* Red flags */}
                {roadmap.redFlags?.length ? (
                  <Block icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} title="Watch out for" tint="amber">
                    <ul className="space-y-1">
                      {roadmap.redFlags.map((r, i) => <li key={i} className="text-xs text-foreground">⚠️ {r}</li>)}
                    </ul>
                  </Block>
                ) : null}

                {roadmap.mentorNote && (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
                    <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider mb-1">Mentor note</p>
                    <p className="text-sm text-foreground/90 italic leading-relaxed">{roadmap.mentorNote}</p>
                  </div>
                )}

                <Button onClick={onDownload} disabled={downloading}
                  className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold">
                  <Download className="w-4 h-4 mr-2" /> {downloading ? "Preparing PDF…" : "Download roadmap as PDF"}
                </Button>
              </>
            )}
          </section>
        )}
      </main>

      <Footer />

      <LeadGateDialog
        open={showLead}
        onOpenChange={setShowLead}
        forceShow
        title="🔒 Lock your target & unlock the roadmap"
        subtitle="Share details once — our mentor will follow up with admission help too."
        source={`lock_target_${targetCollege}`}
        onSuccess={() => {
          setShowLead(false);
          setPhase("locked");
          setTimeout(() => window.scrollTo({ top: 600, behavior: "smooth" }), 100);
          silentSaveLead({
            source: "lock_target",
            cta: `LockTarget · ${targetCollege}`,
            initial_query: JSON.stringify({ tool: "lock_target", targetCollege, targetCourse, classLevel, stream, board, currentPercent, state }),
            state: state || null,
          }).catch(() => {});
          runAi();
        }}
      />
    </div>
  );
}

function Block({ icon, title, children, tint = "orange" }: { icon: React.ReactNode; title: string; children: React.ReactNode; tint?: "orange" | "amber" }) {
  const border = tint === "amber" ? "border-amber-200" : "border-border";
  return (
    <div className={`rounded-2xl border ${border} bg-card p-4 md:p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">{icon}</div>
        <h3 className="text-sm md:text-base font-extrabold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ─────────────  AI-derived widget helpers (no extra API calls) ───────────── */

interface Next7Day { day: string; title: string; subtitle: string; }
function buildNext7Days(roadmap: RoadmapData | null, hoursPerDay: number): Next7Day[] {
  if (!roadmap) return [];
  const subjects = roadmap.weeklyPlan?.subjects ?? [];
  if (!subjects.length) return [];
  // Distribute subjects across 7 days, sprinkle in mocks + revision on day 6/7
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const out: Next7Day[] = [];
  for (let i = 0; i < 7; i++) {
    if (i === 5) {
      out.push({
        day: labels[i],
        title: `Full-length mock + analysis`,
        subtitle: roadmap.weeklyPlan?.mockSchedule || `Simulate exam conditions, then mark weak areas.`,
      });
      continue;
    }
    if (i === 6) {
      out.push({
        day: labels[i],
        title: `Revision + weak-chapter drill`,
        subtitle: `Revisit anything you scored low on this week. Sleep early.`,
      });
      continue;
    }
    const s = subjects[i % subjects.length];
    const chapter = s?.topPriorityChapters?.[0];
    out.push({
      day: labels[i],
      title: `${s?.subject || "Focus subject"} · ${hoursPerDay}h`,
      subtitle: chapter
        ? `Priority chapter: ${chapter}. ${s?.approach || "Theory → solved examples → 20-Q practice."}`
        : (s?.approach || "Theory → solved examples → 20-Q practice."),
    });
  }
  return out;
}

interface Checkpoint { label: string; when: string; }
function buildCheckpoints(roadmap: RoadmapData | null): Checkpoint[] {
  if (!roadmap) return [];
  const milestones = roadmap.milestones ?? [];
  if (!milestones.length) return [];
  return milestones.slice(0, 6).map((m) => ({
    label: m.phase + (m.focus ? ` · ${m.focus}` : ""),
    when: m.tasks?.[0] || "Track progress weekly. Adjust hours if behind.",
  }));
}

