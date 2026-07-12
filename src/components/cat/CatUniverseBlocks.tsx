import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Calculator,
  CheckCircle2,
  Clock3,
  FileText,
  LineChart,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import {
  CAT_UNIVERSE_EXAM_LABELS,
  parseMultiline,
  type CatUniverseCutoff,
  type CatUniverseModule,
  type CatUniverseResource,
  type CatUniverseSection,
  type CatUniverseSettings,
} from "@/lib/catUniverse";

const iconMap: Record<string, any> = {
  sparkles: Sparkles,
  "book-open": BookOpen,
  target: Target,
  "bar-chart-3": BarChart3,
  calculator: Calculator,
  "file-text": FileText,
  briefcase: Briefcase,
};

function getIcon(name?: string) {
  return iconMap[name || "sparkles"] || Sparkles;
}

type BenchmarkRow = { percentile: number; score: number };

const BENCHMARKS: Record<string, { positive: number; negative: number; rows: BenchmarkRow[]; maxScore: number; helper: string }> = {
  cat: {
    positive: 3,
    negative: 1,
    maxScore: 198,
    helper: "Use section-wise correct and incorrect answers. Count only MCQ incorrect answers in the incorrect box.",
    rows: [
      { percentile: 99.9, score: 110 },
      { percentile: 99.5, score: 96 },
      { percentile: 99, score: 85 },
      { percentile: 95, score: 64 },
      { percentile: 90, score: 53 },
      { percentile: 85, score: 47 },
      { percentile: 80, score: 41 },
      { percentile: 60, score: 26 },
    ],
  },
  xat: {
    positive: 1,
    negative: 0.25,
    maxScore: 75,
    helper: "Enter total correct and incorrect attempts to get an estimated performance band.",
    rows: [
      { percentile: 99, score: 41 },
      { percentile: 95, score: 34 },
      { percentile: 90, score: 29 },
      { percentile: 85, score: 26 },
      { percentile: 80, score: 23 },
      { percentile: 70, score: 19 },
    ],
  },
  cmat: {
    positive: 4,
    negative: 1,
    maxScore: 400,
    helper: "CMAT estimates vary by paper difficulty. Use this as a directional shortlisting signal, not an official rank.",
    rows: [
      { percentile: 99, score: 320 },
      { percentile: 95, score: 280 },
      { percentile: 90, score: 250 },
      { percentile: 85, score: 230 },
      { percentile: 80, score: 215 },
      { percentile: 70, score: 185 },
    ],
  },
};

function estimatePercentile(score: number, examKey: string) {
  const rows = BENCHMARKS[examKey]?.rows || BENCHMARKS.cat.rows;
  const sorted = [...rows].sort((a, b) => b.score - a.score);

  if (score >= sorted[0].score) return sorted[0].percentile;
  if (score <= sorted[sorted.length - 1].score) return Math.max(35, sorted[sorted.length - 1].percentile - ((sorted[sorted.length - 1].score - score) / 5));

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const upper = sorted[index];
    const lower = sorted[index + 1];
    if (score <= upper.score && score >= lower.score) {
      const span = upper.score - lower.score || 1;
      const ratio = (score - lower.score) / span;
      return lower.percentile + ratio * (upper.percentile - lower.percentile);
    }
  }

  return 50;
}

function getCallout(percentile: number) {
  if (percentile >= 98) return "Elite-call zone";
  if (percentile >= 95) return "Top-school contention";
  if (percentile >= 90) return "Strong shortlist zone";
  if (percentile >= 80) return "Good private-school zone";
  if (percentile >= 70) return "Application-exploration zone";
  return "Mentor-guidance zone";
}

function ScoreSummary({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-black text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{helper}</div>
    </div>
  );
}

export function CatUniverseSpotlight({
  settings,
  sections,
  modules,
  embedded = false,
}: {
  settings: CatUniverseSettings;
  sections: CatUniverseSection[];
  modules: CatUniverseModule[];
  embedded?: boolean;
}) {
  const featured = modules.filter((item) => item.show_on_home && item.is_active).slice(0, 6);

  return (
    <section className={`${embedded ? "" : "container py-6 md:py-8"}`}>
      <div className="rounded-[28px] border border-orange-200/70 bg-gradient-to-br from-orange-50 via-white to-rose-50 p-5 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100">{settings.hero_badge}</Badge>
            <h2 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{settings.title}</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">{settings.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {sections.slice(0, 4).map((section) => (
                <div key={section.slug} className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-sm font-medium text-foreground shadow-sm">
                  {section.title}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-lg">
            <div className="text-sm font-semibold text-muted-foreground">Why this module matters</div>
            <div className="mt-2 text-xl font-bold text-foreground">Designed to convert MBA intent into guided counselling</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Score calculators hold high post-exam intent</div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Cut-off explorers keep users inside your funnel</div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Call predictors trigger the strongest counselor callbacks</div>
            </div>
            <Link to={settings.primary_cta_href} className="mt-5 inline-flex">
              <Button className="rounded-xl bg-orange-600 text-white hover:bg-orange-700">{settings.primary_cta_label}</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((module) => {
            const Icon = getIcon(module.icon_name);
            return (
              <Link
                key={module.slug}
                to={`/cat-universe/${module.slug}`}
                className="group rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  {module.badge ? <Badge variant="outline" className="rounded-full">{module.badge}</Badge> : null}
                </div>
                <div className="mt-4 text-xl font-bold text-foreground">{module.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{module.subtitle}</div>
                <div className="mt-4 rounded-2xl bg-muted/50 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{module.stat_label || "Best for"}</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{module.stat_value || module.audience_text}</div>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Open module <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CatUniverseCalculator({
  examKey,
  cutoffs = [],
}: {
  examKey: string;
  cutoffs?: CatUniverseCutoff[];
}) {
  const benchmark = BENCHMARKS[examKey] || BENCHMARKS.cat;
  const isCat = examKey === "cat";

  const [catInputs, setCatInputs] = useState({
    varcCorrect: 0,
    varcIncorrect: 0,
    dilrCorrect: 0,
    dilrIncorrect: 0,
    qaCorrect: 0,
    qaIncorrect: 0,
  });
  const [simpleInputs, setSimpleInputs] = useState({ correct: 0, incorrect: 0 });

  const score = useMemo(() => {
    if (isCat) {
      const totalCorrect = catInputs.varcCorrect + catInputs.dilrCorrect + catInputs.qaCorrect;
      const totalIncorrect = catInputs.varcIncorrect + catInputs.dilrIncorrect + catInputs.qaIncorrect;
      return totalCorrect * benchmark.positive - totalIncorrect * benchmark.negative;
    }

    return simpleInputs.correct * benchmark.positive - simpleInputs.incorrect * benchmark.negative;
  }, [benchmark.negative, benchmark.positive, catInputs, isCat, simpleInputs]);

  const percentile = useMemo(() => estimatePercentile(score, examKey), [score, examKey]);
  const shortlist = useMemo(
    () => cutoffs.filter((item) => item.percentile <= percentile + 1).slice(0, 5),
    [cutoffs, percentile],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full">{CAT_UNIVERSE_EXAM_LABELS[examKey] || examKey.toUpperCase()} estimator</Badge>
          <span className="text-sm text-muted-foreground">Directional only - always treat official results as final.</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{benchmark.helper}</p>

        {isCat ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { key: "varc", label: "VARC" },
              { key: "dilr", label: "DILR" },
              { key: "qa", label: "QA" },
            ].map((section) => (
              <div key={section.key} className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="font-semibold text-foreground">{section.label}</div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Correct</label>
                    <Input
                      type="number"
                      value={(catInputs as any)[`${section.key}Correct`]}
                      min={0}
                      onChange={(event) => setCatInputs((prev) => ({ ...prev, [`${section.key}Correct`]: Number(event.target.value || 0) }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Incorrect</label>
                    <Input
                      type="number"
                      value={(catInputs as any)[`${section.key}Incorrect`]}
                      min={0}
                      onChange={(event) => setCatInputs((prev) => ({ ...prev, [`${section.key}Incorrect`]: Number(event.target.value || 0) }))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <label className="mb-1 block text-xs text-muted-foreground">Correct answers</label>
              <Input
                type="number"
                value={simpleInputs.correct}
                min={0}
                onChange={(event) => setSimpleInputs((prev) => ({ ...prev, correct: Number(event.target.value || 0) }))}
              />
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <label className="mb-1 block text-xs text-muted-foreground">Incorrect answers</label>
              <Input
                type="number"
                value={simpleInputs.incorrect}
                min={0}
                onChange={(event) => setSimpleInputs((prev) => ({ ...prev, incorrect: Number(event.target.value || 0) }))}
              />
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ScoreSummary title="Estimated score" value={Number.isFinite(score) ? score.toFixed(2) : "0"} helper={`Approx max score ${benchmark.maxScore}`} />
          <ScoreSummary title="Estimated percentile" value={`${Math.min(99.99, Math.max(35, percentile)).toFixed(2)}%ile`} helper="Interpolated from recent score-vs-percentile benchmarks" />
          <ScoreSummary title="Likely zone" value={getCallout(percentile)} helper="Use this to decide whether to chase elite, reach or value schools" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-lg font-bold text-foreground">
            <LineChart className="h-5 w-5 text-primary" />
            Recent benchmark ladder
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">Percentile</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Estimated score</th>
                </tr>
              </thead>
              <tbody>
                {benchmark.rows.map((row) => (
                  <tr key={`${examKey}-${row.percentile}`} className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">{row.percentile} %ile</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.score}+</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="text-lg font-bold text-foreground">Likely shortlist signal</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Based on your estimate, these cut-off bands may deserve attention first.
          </div>
          <div className="mt-4 space-y-3">
            {shortlist.length ? (
              shortlist.map((item) => (
                <div key={`${item.module_slug}-${item.college_name}`} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-foreground">{item.college_name}</div>
                      <div className="text-xs text-muted-foreground">{item.city} • {item.cutoff_band}</div>
                    </div>
                    <Badge variant="outline">{item.avg_package || "Explore"}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{item.highlight}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No nearby cut-off rows matched yet. This is still useful - it usually means you should widen the college list and talk to a counselor quickly.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CatUniversePredictor({
  cutoffs,
  title = "IIM and B-school Call Predictor",
}: {
  cutoffs: CatUniverseCutoff[];
  title?: string;
}) {
  const [form, setForm] = useState({
    percentile: "",
    category: "General",
    gender: "Male",
    tenth: "",
    twelfth: "",
    graduation: "",
    workEx: "",
  });

  const output = useMemo(() => {
    const percentile = Number(form.percentile || 0);
    if (!percentile) return [];

    const tenth = Number(form.tenth || 0);
    const twelfth = Number(form.twelfth || 0);
    const graduation = Number(form.graduation || 0);
    const workEx = Number(form.workEx || 0);

    const profileBonus =
      (form.gender === "Female" ? 0.4 : 0) +
      (form.category !== "General" ? 0.5 : 0) +
      (tenth >= 90 ? 0.3 : tenth >= 80 ? 0.15 : 0) +
      (twelfth >= 90 ? 0.3 : twelfth >= 80 ? 0.15 : 0) +
      (graduation >= 80 ? 0.35 : graduation >= 70 ? 0.15 : 0) +
      (workEx >= 24 && workEx <= 36 ? 0.4 : workEx >= 12 ? 0.2 : 0);

    return cutoffs
      .map((item) => {
        const adjusted = percentile + profileBonus - item.percentile;
        const chance = adjusted >= 1 ? "Likely" : adjusted >= -1.5 ? "Reach" : "Dream";
        return { ...item, adjusted, chance };
      })
      .sort((a, b) => b.adjusted - a.adjusted)
      .slice(0, 8);
  }, [cutoffs, form]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="text-2xl font-black text-foreground">{title}</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Use your percentile and profile signals to estimate likely, reach and dream outcomes. This is a decision aid, not an official shortlist.
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Percentile</label>
            <Input value={form.percentile} onChange={(event) => setForm((prev) => ({ ...prev, percentile: event.target.value }))} placeholder="e.g. 96.4" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
            <select className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
              {["General", "OBC", "EWS", "SC", "ST", "PwD"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Gender</label>
            <select className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}>
              {["Male", "Female", "Other"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Work experience (months)</label>
            <Input value={form.workEx} onChange={(event) => setForm((prev) => ({ ...prev, workEx: event.target.value }))} placeholder="e.g. 24" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">10th %</label>
            <Input value={form.tenth} onChange={(event) => setForm((prev) => ({ ...prev, tenth: event.target.value }))} placeholder="e.g. 92" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">12th %</label>
            <Input value={form.twelfth} onChange={(event) => setForm((prev) => ({ ...prev, twelfth: event.target.value }))} placeholder="e.g. 88" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Graduation %</label>
            <Input value={form.graduation} onChange={(event) => setForm((prev) => ({ ...prev, graduation: event.target.value }))} placeholder="e.g. 79" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {output.length ? output.map((item) => (
          <div key={`${item.module_slug}-${item.college_name}`} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-foreground">{item.college_name}</div>
                <div className="text-sm text-muted-foreground">{item.city} • {item.cutoff_band}</div>
              </div>
              <Badge className={`rounded-full ${item.chance === "Likely" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : item.chance === "Reach" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "bg-rose-100 text-rose-700 hover:bg-rose-100"}`}>
                {item.chance}
              </Badge>
            </div>
            <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
              {item.highlight}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Fees</div>
                <div className="mt-1 font-semibold text-foreground">{item.fees || "TBA"}</div>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg package</div>
                <div className="mt-1 font-semibold text-foreground">{item.avg_package || "Explore"}</div>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Start with a percentile to see likely, reach and dream outcomes.
          </div>
        )}
      </div>
    </div>
  );
}

export function CatUniverseCutoffTable({ cutoffs }: { cutoffs: CatUniverseCutoff[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All");
  const [band, setBand] = useState("All");

  const cities = useMemo(() => ["All", ...Array.from(new Set(cutoffs.map((item) => item.city).filter(Boolean)))], [cutoffs]);
  const bands = useMemo(() => ["All", ...Array.from(new Set(cutoffs.map((item) => item.cutoff_band).filter(Boolean)))], [cutoffs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cutoffs.filter((item) => {
      if (city !== "All" && item.city !== city) return false;
      if (band !== "All" && item.cutoff_band !== band) return false;
      if (!q) return true;
      return [item.college_name, item.city, item.exam_name, item.highlight].join(" ").toLowerCase().includes(q);
    });
  }, [band, city, cutoffs, query]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-3xl border border-border bg-card p-5 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search college, city or highlight" />
        <select className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={city} onChange={(event) => setCity(event.target.value)}>
          {cities.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" value={band} onChange={(event) => setBand(event.target.value)}>
          {bands.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">College</th>
                <th className="px-4 py-3 font-semibold text-foreground">City</th>
                <th className="px-4 py-3 font-semibold text-foreground">Cut-off</th>
                <th className="px-4 py-3 font-semibold text-foreground">Fees</th>
                <th className="px-4 py-3 font-semibold text-foreground">Avg package</th>
                <th className="px-4 py-3 font-semibold text-foreground">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={`${item.module_slug}-${item.college_name}`} className="border-t border-border align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-foreground">{item.college_name}</div>
                    <div className="text-xs text-muted-foreground">{item.exam_name} • {item.category}</div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{item.city}</td>
                  <td className="px-4 py-4 text-foreground">{item.cutoff_band || `${item.percentile}+`}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.fees || "TBA"}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.avg_package || "Explore"}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.highlight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CatUniverseResourceGrid({ resources }: { resources: CatUniverseResource[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((item) => (
        <div key={`${item.module_slug}-${item.title}-${item.year || "na"}`} className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="rounded-full">{item.badge || item.resource_type}</Badge>
            {item.year ? <div className="text-sm font-semibold text-foreground">{item.year}</div> : <Clock3 className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="mt-4 text-lg font-bold text-foreground">{item.title}</div>
          <div className="mt-2 text-sm text-muted-foreground">{item.subtitle}</div>
          <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-xs uppercase tracking-wide text-muted-foreground">{item.meta || "Admin-editable resource card"}</div>
          {item.href ? (
            <a href={item.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Open resource <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <div className="mt-4 text-sm text-primary">Add a live PDF or link from admin when ready</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function CatUniverseCounsellingModule({ module, resources }: { module: CatUniverseModule; resources: CatUniverseResource[] }) {
  const points = parseMultiline(module.detail_points);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="text-lg font-bold text-foreground">What this module helps the student do</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {points.map((point) => (
            <div key={point} className="flex items-start gap-2 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>
      {resources.length ? <CatUniverseResourceGrid resources={resources} /> : null}
      <LeadCaptureForm
        variant="banner"
        title="Need personal MBA admission support?"
        subtitle="Share your profile and our counselors will guide your next steps."
        source={module.lead_source || `cat_universe_${module.slug}`}
      />
    </div>
  );
}

export function CatUniverseSectionCards({
  section,
  modules,
}: {
  section: CatUniverseSection;
  modules: CatUniverseModule[];
}) {
  const Icon = getIcon(section.icon_name);

  return (
    <section className="rounded-[28px] border border-border bg-card p-5 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${section.accent_class} text-white shadow-lg`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="mt-4 text-2xl font-black text-foreground">{section.title}</div>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{section.description}</div>
        </div>
        <div className="max-w-md rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {section.lead_hook}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {modules.map((module) => {
          const ModuleIcon = getIcon(module.icon_name);
          return (
            <Link
              key={module.slug}
              to={`/cat-universe/${module.slug}`}
              className="group rounded-3xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ModuleIcon className="h-6 w-6" />
                </div>
                {module.badge ? <Badge variant="outline">{module.badge}</Badge> : null}
              </div>
              <div className="mt-4 text-xl font-bold text-foreground">{module.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{module.subtitle}</div>
              <div className="mt-4 rounded-2xl bg-muted/40 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{module.stat_label || "Signal"}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{module.stat_value || module.description}</div>
              </div>
              <div className="mt-4 text-sm leading-6 text-muted-foreground">{module.description}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Open module <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
