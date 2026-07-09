import { useState, useMemo, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, TrendingUp, Target, Sparkles, Globe, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { silentSaveLead } from "@/lib/leadCapture";
import { DekhoCampusAILoader } from "@/components/tools/DekhoCampusAILoader";
import { buildPredictorSlug, parsePredictorSlug } from "@/lib/seoSubSlugs";

type AiBucketItem = { slug: string; reason: string };
type WebCollege = { name: string; location?: string; exam?: string; branch?: string; reason?: string; pros?: string[] };
type AiResult = {
  summary?: string;
  buckets?: { safe?: AiBucketItem[]; target?: AiBucketItem[]; reach?: AiBucketItem[] };
  advice?: string;
  webColleges?: WebCollege[];
};

type Exam = { slug: string; name: string; short_name: string | null; category: string | null };
type College = {
  slug: string; name: string; short_name: string | null; location: string | null;
  state: string | null; category: string | null; rating: number | null;
  fees: string | null; image: string | null; related_exams: string[] | null;
};

const CATEGORIES = ["General", "OBC-NCL", "EWS", "SC", "ST", "PwD"];

// Reasonable "too-low" thresholds - predictor still useful but signals lead-first path
const RANK_CEILING = 200000;

export default function CollegePredictor() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const [examSlug, setExamSlug] = useState<string>("");
  const [rank, setRank] = useState<string>("");
  const [category, setCategory] = useState<string>("General");
  const [state, setState] = useState<string>("");
  const [showLead, setShowLead] = useState(false);
  const [lowScoreLead, setLowScoreLead] = useState(false);
  const [phase, setPhase] = useState<"idle" | "low" | "eligible">("idle");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: exams = [] } = useQuery({
    queryKey: ["predictor-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("slug,name,short_name,category")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Exam[];
    },
    staleTime: 10 * 60_000,
  });

  // Hydrate from sub-slug once exams load
  useEffect(() => {
    if (!slug) return;
    const parsed = parsePredictorSlug(slug);
    if (parsed.category) setCategory(parsed.category);
    if (parsed.state) setState(parsed.state.replace(/\b\w/g, (c) => c.toUpperCase()));
    if (parsed.rankBucket) {
      const map: Record<string, string> = {
        "under-100": "50", "under-1000": "500", "under-5000": "2500", "under-10000": "7500",
        "under-25000": "18000", "under-50000": "35000", "under-100000": "75000", "above-100000": "150000",
      };
      setRank(map[parsed.rankBucket] ?? "");
    }
    if (parsed.exam && exams.length) {
      const match = exams.find((e) => e.slug === parsed.exam || e.slug.startsWith(parsed.exam!) || (e.short_name || "").toLowerCase().includes(parsed.exam!));
      if (match) setExamSlug(match.slug);
    }
  }, [slug, exams]);

  const selectedExam = exams.find((e) => e.slug === examSlug);

  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["predictor-colleges", examSlug, state],
    queryFn: async () => {
      let q = supabase
        .from("colleges")
        .select("slug,name,short_name,location,state,category,rating,fees,image,related_exams")
        .eq("is_active", true);
      if (selectedExam?.category) q = q.eq("category", selectedExam.category);
      if (state) q = q.eq("state", state);
      const { data, error } = await q.order("rating", { ascending: false, nullsFirst: false }).limit(60);
      if (error) throw error;
      return (data ?? []) as College[];
    },
    enabled: phase !== "idle" && !!examSlug,
    staleTime: 5 * 60_000,
  });

  const { data: cityColleges = [] } = useQuery({
    queryKey: ["predictor-city-colleges", state],
    queryFn: async () => {
      let q = supabase
        .from("colleges")
        .select("slug,name,short_name,location,state,category,rating,fees,image,related_exams")
        .eq("is_active", true);
      if (state) q = q.eq("state", state);
      const { data, error } = await q.order("rating", { ascending: false, nullsFirst: false }).limit(12);
      if (error) throw error;
      return (data ?? []) as College[];
    },
    enabled: phase === "low",
    staleTime: 5 * 60_000,
  });

  const rankNum = Number(rank.replace(/[^0-9]/g, "")) || 0;

  const ranked = useMemo(() => {
    const catBoost = { "General": 1, "OBC-NCL": 1.5, "EWS": 1.3, "SC": 3, "ST": 4, "PwD": 4 }[category] ?? 1;
    return colleges
      .map((c) => {
        const r = c.rating ?? 3.5;
        const baseThreshold = Math.round(Math.pow(10, (5 - r) * 1.4 + 2.7)) * catBoost;
        const chance = rankNum <= baseThreshold * 0.6 ? "Very High"
          : rankNum <= baseThreshold ? "High"
          : rankNum <= baseThreshold * 1.8 ? "Moderate" : "Reach";
        const score = chance === "Very High" ? 90 : chance === "High" ? 72 : chance === "Moderate" ? 50 : 25;
        return { c, threshold: Math.round(baseThreshold), chance, score };
      })
      .sort((a, b) => b.score - a.score || (b.c.rating ?? 0) - (a.c.rating ?? 0));
  }, [colleges, rankNum, category]);

  function onPredict(e: React.FormEvent) {
    e.preventDefault();
    if (!examSlug || !rankNum) return;

    const newSlug = buildPredictorSlug({ exam: examSlug, rank: rankNum, category, state });
    if (newSlug && newSlug !== slug) {
      navigate(`/college-predictor/${newSlug}`, { replace: true });
    }

    try { import("@/lib/intentTracking").then(({ trackIntent }) => trackIntent("rank_predictor", { exam_slug: examSlug, metadata: { rank: rankNum, category, state } })); } catch {}

    // Low-rank path: lead-first, no AI
    if (rankNum > RANK_CEILING) {
      setLowScoreLead(true);
      return;
    }
    setShowLead(true);
  }

  async function runAi() {
    try {
      setAiLoading(true);
      setAiResult(null);
      let q = supabase
        .from("colleges")
        .select("slug,name,short_name,location,state,category,rating,fees,image,related_exams")
        .eq("is_active", true);
      if (selectedExam?.category) q = q.eq("category", selectedExam.category);
      if (state) q = q.eq("state", state);
      const { data: cols } = await q.order("rating", { ascending: false, nullsFirst: false }).limit(30);
      const { data, error } = await supabase.functions.invoke("predict-colleges", {
        body: { exam: selectedExam?.name || examSlug, rank: rankNum, category, state: state || null, colleges: cols ?? [], includeWeb: true },
      });
      if (!error && data) setAiResult(data as AiResult);
    } catch (e) {
      console.error("AI predictor error", e);
    } finally {
      setAiLoading(false);
    }
  }

  const seoTitle = slug
    ? `College Predictor · ${slug.replace(/-/g, " ")} | DekhoCampus`
    : "College Predictor 2026 - Predict Colleges by JEE / NEET / CAT Rank | DekhoCampus";
  const seoDesc = slug
    ? `Predict colleges for ${slug.replace(/-/g, " ")}. Free, personalised list with cut-offs & admission help.`
    : "Free college predictor based on your entrance exam rank, category & preferred state.";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDesc} />
      <Navbar />

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <PageBreadcrumb items={[{ label: "Home", href: "/" }, { label: "College Predictor", href: "/college-predictor" }, ...(slug ? [{ label: slug }] : [])]} />

        <section className="mt-3 rounded-3xl bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 border border-indigo-200/60 p-5 md:p-7 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-300/30 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 backdrop-blur text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
              <Target className="w-3 h-3" /> AI-personalised
            </div>
            <h1 className="mt-2.5 text-[28px] md:text-4xl font-black tracking-tight text-foreground leading-[1.05]">
              Your rank → <span className="text-indigo-600">your colleges</span> 🚀
            </h1>
            <p className="mt-2 text-[13px] md:text-base text-foreground/70">
              Real cut-offs. Real chances. Zero hype. Know exactly where you stand.
            </p>

            <form onSubmit={onPredict} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Which exam?</label>
                <select value={examSlug} onChange={(e) => setExamSlug(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select an exam…</option>
                  {exams.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.short_name || e.name}{e.category ? ` · ${e.category}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Your rank / All India Rank</label>
                <Input inputMode="numeric" value={rank}
                  onChange={(e) => setRank(e.target.value.replace(/[^0-9,]/g, "").slice(0, 9))}
                  placeholder="e.g. 12500" className="h-11 rounded-xl text-base" />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button type="button" key={c} onClick={() => setCategory(c)}
                      className={`px-3 h-9 rounded-xl text-xs font-semibold border transition ${
                        category === c ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/60"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">
                  Preferred state <span className="font-normal text-muted-foreground normal-case">(optional)</span>
                </label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Karnataka" className="h-11 rounded-xl text-base" />
              </div>

              <Button type="submit" disabled={!examSlug || !rank}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold">
                Predict my colleges
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Predictions are indicative. Final admission depends on counselling, seat matrix & cut-offs.
              </p>
            </form>
          </div>
        </section>

        <AlsoCheckSection variant="strip" />

        {/* LOW-RANK PATH */}
        {phase === "low" && (
          <section className="mt-8 space-y-5">
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-extrabold text-foreground">Rank looks high - but there's still a clear path 💪</h2>
                  <p className="mt-1 text-sm text-foreground/80">
                    With rank {rankNum.toLocaleString("en-IN")} in {selectedExam?.short_name || examSlug}, top-tier seats are tight - but excellent colleges {state ? `in ${state}` : "near you"} are open.
                  </p>
                  <p className="mt-2 text-[12px] text-amber-700 font-semibold">Our counsellor will call within 24h with a custom plan.</p>
                </div>
              </div>
            </div>
            {cityColleges.length > 0 && (
              <div>
                <h3 className="text-sm font-extrabold text-foreground mb-3">Colleges {state ? `in ${state}` : "you can apply to"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cityColleges.map((c) => <CollegeRow key={c.slug} c={c} chance="Open" score={null} />)}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ELIGIBLE PATH */}
        {phase === "eligible" && (
          <section className="mt-8 space-y-6">
            {aiLoading && <DekhoCampusAILoader />}

            {aiResult && (
              <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 md:p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> AI Personalised Verdict
                </div>
                {selectedExam && (
                  <Badge variant="secondary" className="text-[10px] mb-2">
                    {(selectedExam.short_name || selectedExam.name)} · Rank {rankNum.toLocaleString("en-IN")} · {category}
                  </Badge>
                )}
                {aiResult.summary && (
                  <p className="text-sm md:text-[15px] text-foreground font-medium leading-relaxed whitespace-pre-wrap">{aiResult.summary}</p>
                )}
                {aiResult.advice && <p className="mt-3 text-xs md:text-sm text-indigo-900/85 italic leading-relaxed">💡 {aiResult.advice}</p>}
              </div>
            )}

            {aiResult?.webColleges && aiResult.webColleges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-extrabold text-foreground">Top 10 colleges for you (across India)</h2>
                </div>
                <div className="space-y-2">
                  {aiResult.webColleges.slice(0, 10).map((w, i) => (
                    <div key={i} className="p-3 rounded-xl border border-border bg-card">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 w-6 h-6 rounded-lg bg-indigo-600 text-white text-[11px] font-extrabold flex items-center justify-center">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground leading-tight">{w.name}</p>
                          {w.location && <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{w.location}</p>}
                          {(w.exam || w.branch) && (
                            <p className="text-[11px] mt-1 font-semibold text-indigo-700">
                              {w.exam && <>🎯 {w.exam}</>}{w.exam && w.branch ? " · " : ""}{w.branch && <span className="text-foreground/80">Branches: {w.branch}</span>}
                            </p>
                          )}
                          {w.reason && <p className="mt-1 text-[11px] text-foreground/70">{w.reason}</p>}
                          {w.pros && w.pros.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {w.pros.slice(0, 4).map((p, j) => (
                                <span key={j} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ {p}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ranked.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg md:text-xl font-extrabold text-foreground">🎯 Directly Apply Now</h2>
                  <Badge variant="secondary" className="text-[10px]">{ranked.length} picks</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">From DekhoCampus partners - one-tap apply.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ranked.map(({ c, chance, score }) => (
                    <CollegeRow key={c.slug} c={c} chance={chance} score={score} />
                  ))}
                </div>
              </div>
            )}

            {!aiLoading && !ranked.length && !isLoading && (
              <div className="text-center py-8 bg-card border border-border rounded-2xl text-sm text-muted-foreground">
                No colleges matched. Try removing the state filter.
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />

      <LeadGateDialog
        open={showLead}
        onOpenChange={setShowLead}
        forceShow
        title="🎯 Unlock your prediction report"
        subtitle="Get your full college list + free admission counselling within 24h."
        source={`college_predictor_${examSlug}_${rankNum}`}
        onSuccess={async () => {
          setShowLead(false);
          setPhase("eligible");
          setTimeout(() => window.scrollTo({ top: 700, behavior: "smooth" }), 100);
          silentSaveLead({
            source: "college_predictor_intent",
            cta: `Predict · ${selectedExam?.short_name || examSlug} · Rank ${rankNum} · ${category}`,
            initial_query: JSON.stringify({ tool: "college_predictor", exam: selectedExam?.name || examSlug, exam_slug: examSlug, rank: rankNum, category, preferred_state: state || null }),
            interested_exam_slug: examSlug || null,
            state: state || null,
          }).catch(() => {});
          runAi();
        }}
      />

      <LeadGateDialog
        open={lowScoreLead}
        onOpenChange={setLowScoreLead}
        forceShow
        title="📞 Get a personalised plan"
        subtitle="Share your details - our counsellor will share colleges that still fit your rank."
        source={`predictor_low_rank_${examSlug}_${rankNum}`}
        onSuccess={() => {
          setLowScoreLead(false);
          setPhase("low");
          setTimeout(() => window.scrollTo({ top: 600, behavior: "smooth" }), 100);
          silentSaveLead({
            source: "predictor_low_rank",
            cta: `LowRank · ${selectedExam?.short_name || examSlug} · Rank ${rankNum} · ${category}`,
            initial_query: JSON.stringify({ tool: "college_predictor", exam_slug: examSlug, rank: rankNum, category, preferred_state: state || null, low_rank: true }),
            interested_exam_slug: examSlug || null,
            state: state || null,
          }).catch(() => {});
        }}
      />
    </div>
  );
}

function CollegeRow({ c, chance, score }: { c: College; chance: string; score: number | null }) {
  return (
    <div className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition">
      <Link to={`/colleges/${c.slug}`} className="w-16 h-16 rounded-xl bg-muted shrink-0 overflow-hidden">
        {c.image ? (
          <img src={c.image} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
            {(c.short_name || c.name).slice(0, 3).toUpperCase()}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/colleges/${c.slug}`} className="text-sm font-semibold text-foreground truncate group-hover:text-primary block">
          {c.short_name || c.name}
        </Link>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {c.location || c.state || "India"}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            chance === "Very High" ? "bg-emerald-100 text-emerald-700"
              : chance === "High" ? "bg-teal-100 text-teal-700"
              : chance === "Moderate" ? "bg-amber-100 text-amber-700"
              : chance === "Open" ? "bg-blue-100 text-blue-700"
              : "bg-rose-100 text-rose-700"
          }`}>
            <TrendingUp className="inline w-3 h-3 mr-0.5" />
            {chance}{score != null ? ` · ${score}%` : ""}
          </span>
          {c.rating != null && (
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {c.rating}
            </span>
          )}
        </div>
        <Link to={`/colleges/${c.slug}#apply`}
          className="mt-2 inline-flex items-center justify-center w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90">
          Apply Now →
        </Link>
      </div>
    </div>
  );
}
