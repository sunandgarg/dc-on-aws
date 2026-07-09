import { useState, useMemo, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { AIDisclaimer } from "@/components/AIDisclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, MapPin, Star, Globe, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { silentSaveLead } from "@/lib/leadCapture";
import { DekhoCampusAILoader } from "@/components/tools/DekhoCampusAILoader";
import { buildEligibilitySlug, parseEligibilitySlug } from "@/lib/seoSubSlugs";

type AiBucketItem = { slug: string; reason: string };
type WebCollege = { name: string; location?: string; exam?: string; reason?: string; pros?: string[] };
type AiResult = {
  summary?: string;
  buckets?: { high?: AiBucketItem[]; medium?: AiBucketItem[]; reach?: AiBucketItem[] };
  advice?: string;
  webColleges?: WebCollege[];
};

type College = {
  slug: string; name: string; short_name: string | null; location: string | null;
  state: string | null; category: string | null; rating: number | null;
  fees: string | null; image: string | null;
  is_partner?: boolean | null; priority?: number | null;
};

const STREAMS = [
  { key: "Engineering", label: "Engineering", min12: 60, exams: ["JEE", "BITSAT", "VITEEE"] },
  { key: "Medical", label: "Medical", min12: 50, exams: ["NEET"] },
  { key: "Management", label: "Management / BBA", min12: 50, exams: ["CUET", "IPMAT", "SET"] },
  { key: "Arts", label: "Arts / Humanities", min12: 45, exams: ["CUET"] },
  { key: "Commerce", label: "Commerce", min12: 50, exams: ["CUET", "IPMAT"] },
  { key: "Law", label: "Law", min12: 50, exams: ["CLAT", "AILET"] },
  { key: "Design", label: "Design", min12: 50, exams: ["NID", "NIFT", "UCEED"] },
];

const CATEGORIES = [
  { key: "General", label: "General", relax: 0 },
  { key: "EWS", label: "EWS", relax: 5 },
  { key: "OBC", label: "OBC", relax: 5 },
  { key: "SC", label: "SC", relax: 10 },
  { key: "ST", label: "ST", relax: 10 },
];

export default function EligibilityChecker() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const [stream, setStream] = useState<string>("Engineering");
  const [percent, setPercent] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [category, setCategory] = useState<string>("General");
  const [showLead, setShowLead] = useState(false);
  const [lowScoreLead, setLowScoreLead] = useState(false); // lead-gate dialog before showing low-score msg
  const [bulkApply, setBulkApply] = useState<{ open: boolean; names: string[] }>({ open: false, names: [] });
  const [phase, setPhase] = useState<"idle" | "low" | "eligible">("idle");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Hydrate from sub-slug
  useEffect(() => {
    if (!slug) return;
    const parsed = parseEligibilitySlug(slug);
    if (parsed.stream) setStream(parsed.stream);
    if (parsed.state) setState(parsed.state.replace(/\b\w/g, (c) => c.toUpperCase()));
    if (parsed.percentBucket) {
      const map: Record<string, string> = { "above-90": "92", "80-90": "85", "70-80": "75", "60-70": "65", "below-60": "55" };
      setPercent(map[parsed.percentBucket] ?? "");
    }
  }, [slug]);

  const streamMeta = STREAMS.find((s) => s.key === stream)!;
  const catMeta = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];
  const pct = Number(percent) || 0;
  const effectiveMin = Math.max(0, streamMeta.min12 - catMeta.relax);
  const eligibleByThreshold = pct >= effectiveMin && pct <= 100;

  // ONE efficient boundary fetch: stream-matching colleges + partner colleges in parallel,
  // de-duped by slug. Partners always travel with the result set so they can be promoted
  // anywhere on the page without a second round-trip.
  const { data: boundary, isLoading } = useQuery({
    queryKey: ["eligibility-boundary", stream, state],
    queryFn: async () => {
      const baseCols = "slug,name,short_name,location,state,category,rating,fees,image,is_partner,priority";
      let streamQ = supabase
        .from("colleges").select(baseCols).eq("is_active", true).eq("category", stream);
      if (state) streamQ = streamQ.eq("state", state);

      let partnerQ = supabase
        .from("colleges").select(baseCols).eq("is_active", true).eq("is_partner", true);
      if (state) partnerQ = partnerQ.eq("state", state);

      const [streamRes, partnerRes] = await Promise.all([
        streamQ.order("priority", { ascending: true, nullsFirst: false })
               .order("rating", { ascending: false, nullsFirst: false }).limit(40),
        partnerQ.order("priority", { ascending: true, nullsFirst: false })
                .order("rating", { ascending: false, nullsFirst: false }).limit(20),
      ]);

      // Fallback: if state-scoped partners returned nothing, pull global partners
      let partners = (partnerRes.data ?? []) as College[];
      if (state && partners.length === 0) {
        const { data } = await supabase
          .from("colleges").select(baseCols).eq("is_active", true).eq("is_partner", true)
          .order("priority", { ascending: true, nullsFirst: false })
          .order("rating", { ascending: false, nullsFirst: false }).limit(12);
        partners = (data ?? []) as College[];
      }

      const streamCols = (streamRes.data ?? []) as College[];
      const map = new Map<string, College>();
      [...streamCols, ...partners].forEach((c) => map.set(c.slug, c));
      return { stream: streamCols, partners, all: Array.from(map.values()) };
    },
    enabled: phase !== "idle",
    staleTime: 5 * 60_000,
  });

  const colleges = boundary?.stream ?? [];
  const partnerColleges = boundary?.partners ?? [];

  // City/state-only fallback list for low-score path (no AI hit)
  const { data: cityColleges = [] } = useQuery({
    queryKey: ["eligibility-city-colleges", state],
    queryFn: async () => {
      let q = supabase
        .from("colleges")
        .select("slug,name,short_name,location,state,category,rating,fees,image,is_partner,priority")
        .eq("is_active", true);
      if (state) q = q.eq("state", state);
      const { data, error } = await q
        .order("is_partner", { ascending: false })
        .order("priority", { ascending: true, nullsFirst: false })
        .order("rating", { ascending: false, nullsFirst: false }).limit(12);
      if (error) throw error;
      return (data ?? []) as College[];
    },
    enabled: phase === "low",
    staleTime: 5 * 60_000,
  });

  // Colleges that fit the user's score range (sensible fit ≥ 50 with a small buffer).
  // Partner colleges get a +10 fit bump so qualifying partners surface higher.
  const ranked = useMemo(() => {
    return colleges.map((c) => {
      const r = c.rating ?? 3.5;
      let fit = Math.min(100, Math.round((pct / 100) * 60 + (r / 5) * 40));
      if (c.is_partner) fit = Math.min(100, fit + 10);
      let band: "High" | "Medium" | "Reach" = "Medium";
      if (fit >= 70) band = "High";
      else if (fit < 55) band = "Reach";
      return { c, fit, band };
    }).sort((a, b) => b.fit - a.fit);
  }, [colleges, pct]);

  // "Top colleges for you to apply" - prefer partners that fit, otherwise any partners.
  const topPartnerPicks = useMemo(() => {
    const inStream = partnerColleges.filter((p) => !state || p.state === state);
    const pool = inStream.length ? inStream : partnerColleges;
    // Lightweight stable shuffle (priority first, then deterministic-ish randomisation by slug hash)
    return [...pool]
      .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50))
      .slice(0, 6);
  }, [partnerColleges, state]);

  function onCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!percent) return;

    // Sync URL with sub-slug so every search is shareable & indexable
    const newSlug = buildEligibilitySlug({ stream, percent: pct, state });
    if (newSlug && newSlug !== slug) {
      navigate(`/eligibility-checker/${newSlug}`, { replace: true });
    }

    try { import("@/lib/intentTracking").then(({ trackIntent }) => trackIntent("exam_predictor", { metadata: { eligible: eligibleByThreshold } })); } catch {}

    if (!eligibleByThreshold) {
      // LOW-SCORE PATH - lead-gate first, then friendly message + city colleges, NO AI hit
      setLowScoreLead(true);
      return;
    }
    // ELIGIBLE PATH - original lead-gate -> AI
    setShowLead(true);
  }

  async function runAi() {
    try {
      setAiLoading(true);
      setAiResult(null);
      // Reuse the boundary fetch (partners + stream colleges) — no extra DB hit.
      const cols = boundary?.all ?? [];
      const { data, error } = await supabase.functions.invoke("check-eligibility", {
        body: { stream: streamMeta.label, percent: pct, state: state || null, category, exams: streamMeta.exams, colleges: cols, includeWeb: true },
      });
      if (!error && data) setAiResult(data as AiResult);
    } catch (e) {
      console.error("AI eligibility error", e);
    } finally {
      setAiLoading(false);
    }
  }

  const seoTitle = slug
    ? `Eligibility Checker · ${slug.replace(/-/g, " ")} | DekhoCampus`
    : "Free Eligibility Checker - Find Colleges You Qualify For | DekhoCampus";
  const seoDesc = slug
    ? `Check eligible colleges for ${slug.replace(/-/g, " ")}. Personalised list with cut-offs, fees & admission help.`
    : "Check your eligibility for top engineering, medical, management & law colleges in India.";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDesc} />
      <Navbar />

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <PageBreadcrumb items={[{ label: "Home", href: "/" }, { label: "Eligibility Checker", href: "/eligibility-checker" }, ...(slug ? [{ label: slug }] : [])]} />

        {/* Hero + form */}
        <section className="mt-3 rounded-3xl bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 border border-emerald-200/60 p-5 md:p-7 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-300/30 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 backdrop-blur text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Free · 30 sec
            </div>
            <h1 className="mt-2.5 text-[28px] md:text-4xl font-black tracking-tight text-foreground leading-[1.05]">
              Find colleges<br/>that actually <span className="text-emerald-600">want you</span> ✨
            </h1>
            <p className="mt-2 text-[13px] md:text-base text-foreground/70">
              Skip the maybe-list. We'll only show colleges where your score makes the cut.
            </p>

            <form onSubmit={onCheck} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Which stream?</label>
                <div className="flex flex-wrap gap-2">
                  {STREAMS.map((s) => (
                    <button type="button" key={s.key} onClick={() => setStream(s.key)}
                      className={`px-3 h-9 rounded-xl text-xs font-semibold border transition ${
                        stream === s.key ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/60"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Class 12 percentage</label>
                <Input inputMode="numeric" value={percent}
                  onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
                  placeholder="e.g. 78" className="h-11 rounded-xl text-base" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Minimum required for {streamMeta.label} ({category}): <span className="font-bold text-foreground">{effectiveMin}%</span>
                  {catMeta.relax > 0 && <span className="ml-1 text-emerald-700">· {catMeta.relax}% reservation relaxation applied</span>}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button type="button" key={c.key} onClick={() => setCategory(c.key)}
                      className={`px-3 h-9 rounded-xl text-xs font-semibold border transition ${
                        category === c.key ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/60"
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wider">
                  Preferred state / city <span className="font-normal text-muted-foreground normal-case">(optional)</span>
                </label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Delhi NCR, Maharashtra" className="h-11 rounded-xl text-base" />
              </div>

              <Button type="submit" disabled={!percent}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold">
                Check my colleges
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                Recommended exams for {streamMeta.label}: {streamMeta.exams.join(" · ")}
              </p>
            </form>
          </div>
        </section>

        {/* Mid-page discovery strip */}
        <AlsoCheckSection variant="strip" />

        {/* LOW-SCORE RESULTS - no AI, friendly + city colleges */}
        {phase === "low" && (
          <section className="mt-8 space-y-5">
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-extrabold text-foreground">Score below {streamMeta.label} cut-off - but you've got options 💪</h2>
                  <p className="mt-1 text-sm text-foreground/80">
                    Your {pct}% is below the {effectiveMin}% bar for {streamMeta.label} ({category}). Here are great colleges {state ? `in ${state}` : "near you"} you can still target - many accept management/direct seats.
                  </p>
                  <p className="mt-2 text-[12px] text-amber-700 font-semibold">Our counsellor will call you within 24h with a custom plan.</p>
                </div>
              </div>
            </div>

            {cityColleges.length > 0 && (
              <div>
                <h3 className="text-sm font-extrabold text-foreground mb-3">Colleges {state ? `in ${state}` : "you can apply to"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cityColleges.map((c) => (
                    <CollegeRow key={c.slug} c={c} band="Open" fit={null} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ELIGIBLE RESULTS */}
        {phase === "eligible" && (
          <section className="mt-8 space-y-6">
            {aiLoading && <DekhoCampusAILoader />}

            {/* SHORT AI verdict */}
            {aiResult && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> AI Personalised Verdict
                </div>
                {aiResult.summary && (
                  <p className="text-sm md:text-[15px] text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                    {aiResult.summary}
                  </p>
                )}
                {aiResult.advice && <p className="mt-3 text-xs md:text-sm text-emerald-900/85 italic leading-relaxed">💡 {aiResult.advice}</p>}
                <AIDisclaimer
                  source="eligibility_checker"
                  content={`${aiResult.summary || ""}\n\n${aiResult.advice || ""}`}
                  excerpt={aiResult.summary || aiResult.advice}
                  context={{ stream, percent: pct, category, state: state || null }}
                />
              </div>
            )}

            {/* IN-RANGE matches from our DB (only if any). Embedded right under the verdict, like the same chat thread. */}
            {aiResult && (() => {
              const inRange = ranked.filter((r) => r.band !== "Reach").slice(0, 6);
              if (inRange.length === 0) return null;
              return (
                <div className="rounded-2xl border border-emerald-100 bg-card p-4">
                  <h3 className="text-sm font-extrabold text-foreground mb-1">
                    Colleges in your range ({pct}%, {category})
                  </h3>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Matched against your stream, score & state — partner colleges get a small boost.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inRange.map(({ c, fit, band }) => (
                      <CollegeRow key={c.slug} c={c} band={band} fit={fit} />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* TOP COLLEGE FOR YOU TO APPLY - partner colleges (random/priority pick) */}
            {topPartnerPicks.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-orange-50/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base md:text-lg font-extrabold text-foreground">
                    🎯 Top colleges for you to apply
                  </h2>
                  <Badge variant="secondary" className="text-[10px]">Partner</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Hand-picked DekhoCampus partner colleges accepting applications now — one-tap apply.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topPartnerPicks.map((c) => (
                    <CollegeRow key={c.slug} c={c} band="Partner" fit={null} />
                  ))}
                </div>
              </div>
            )}

            {/* Other well-known colleges across India — editorial, non-AI look */}
            {aiResult?.webColleges && aiResult.webColleges.length > 0 && (() => {
              const list = aiResult.webColleges.slice(0, 9);
              const initials = (n: string) => n.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "C";
              return (
                <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
                  <div className="flex items-baseline justify-between gap-3 mb-1 pb-3 border-b border-border">
                    <h2 className="text-lg md:text-xl font-bold text-foreground">
                      Other well-known colleges across India
                    </h2>
                    <span className="text-[11px] text-muted-foreground shrink-0">{list.length} options</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 mb-4">
                    Hand-picked options based on your stream and score. Apply individually — our counsellor follows up for each.
                  </p>

                  <ul className="divide-y divide-border">
                    {list.map((w, i) => (
                      <li key={i} className="py-3 flex items-start gap-3">
                        <div className="shrink-0 w-11 h-11 rounded-lg bg-muted text-foreground font-bold text-sm flex items-center justify-center border border-border">
                          {initials(w.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-foreground leading-snug">{w.name}</h3>
                          {w.location && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{w.location}
                            </p>
                          )}
                          {w.exam && (
                            <p className="text-[11px] mt-1 font-semibold text-emerald-700">🎯 via {w.exam}</p>
                          )}
                          {w.reason && <p className="mt-1 text-[11px] text-foreground/70">{w.reason}</p>}
                          {w.pros && w.pros.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {w.pros.slice(0, 3).map((p, j) => (
                                <span key={j} className="text-[10px] text-muted-foreground">• {p}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setBulkApply({ open: true, names: [w.name] })}
                          className="shrink-0 h-9 px-3 rounded-md border border-foreground bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition"
                        >
                          Apply
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })()}

            {!aiLoading && aiResult && ranked.filter(r => r.band !== "Reach").length === 0 && topPartnerPicks.length === 0 && (
              <div className="text-center py-8 bg-card border border-border rounded-2xl text-sm text-muted-foreground">
                No close matches in our DB right now — the AI picks above are your best starting point.
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />

      {/* Eligible-path lead gate */}
      <LeadGateDialog
        open={showLead}
        onOpenChange={setShowLead}
        forceShow
        title="🎯 Unlock your eligibility report"
        subtitle="Get a personalised college list + free admission counselling."
        source={`eligibility_checker_${stream}_${pct}`}
        onSuccess={async () => {
          setShowLead(false);
          setPhase("eligible");
          setTimeout(() => window.scrollTo({ top: 600, behavior: "smooth" }), 100);
          silentSaveLead({
            source: "eligibility_checker_intent",
            cta: `Eligibility · ${streamMeta.label} · ${pct}%`,
            initial_query: JSON.stringify({ tool: "eligibility_checker", stream, percent: pct, preferred_state: state || null }),
            state: state || null,
          }).catch(() => {});
          runAi();
        }}
      />

      {/* Low-score lead gate - collected BEFORE showing the message; NO AI hit */}
      <LeadGateDialog
        open={lowScoreLead}
        onOpenChange={setLowScoreLead}
        forceShow
        title="📞 Get a personalised plan"
        subtitle="Share your details - our counsellor will share colleges that still fit your profile."
        source={`eligibility_low_score_${stream}_${pct}`}
        onSuccess={() => {
          setLowScoreLead(false);
          setPhase("low");
          setTimeout(() => window.scrollTo({ top: 600, behavior: "smooth" }), 100);
          silentSaveLead({
            source: "eligibility_low_score",
            cta: `LowScore · ${streamMeta.label} · ${pct}%`,
            initial_query: JSON.stringify({ tool: "eligibility_checker", stream, percent: pct, preferred_state: state || null, low_score: true }),
            state: state || null,
          }).catch(() => {});
        }}
      />

      {/* Bulk multi-college apply gate */}
      <LeadGateDialog
        open={bulkApply.open}
        onOpenChange={(v) => setBulkApply((p) => ({ ...p, open: v }))}
        forceShow
        title={bulkApply.names.length > 1
          ? `🚀 Apply to ${bulkApply.names.length} colleges at once`
          : `🎯 Apply to ${bulkApply.names[0] || "this college"}`}
        subtitle="Share details once — our counsellors will reach you for each shortlisted college."
        source={`eligibility_bulk_apply_${stream}`}
        onSuccess={() => {
          setBulkApply({ open: false, names: [] });
          silentSaveLead({
            source: "eligibility_bulk_apply",
            cta: `BulkApply · ${bulkApply.names.length} colleges`,
            initial_query: JSON.stringify({
              tool: "eligibility_checker",
              stream, percent: pct, preferred_state: state || null,
              applied_colleges: bulkApply.names,
            }),
            state: state || null,
          }).catch(() => {});
        }}
      />
    </div>
  );
}

function CollegeRow({ c, band, fit }: { c: College; band: string; fit: number | null }) {
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
            band === "High" ? "bg-emerald-100 text-emerald-700"
              : band === "Medium" ? "bg-amber-100 text-amber-700"
              : band === "Open" ? "bg-blue-100 text-blue-700"
              : band === "Partner" ? "bg-amber-500 text-white"
              : "bg-rose-100 text-rose-700"
          }`}>
            {band}{fit != null ? ` · ${fit}%` : ""}
          </span>
          {c.is_partner && band !== "Partner" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
              🤝 Partner
            </span>
          )}
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
