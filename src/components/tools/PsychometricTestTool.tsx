import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, RotateCw, Sparkles } from "lucide-react";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

/**
 * RIASEC-based career interest psychometric test.
 * 100% client-side, no AI credits used. Maps Holland codes to streams/careers.
 */

type Trait = "R" | "I" | "A" | "S" | "E" | "C";

const QUESTIONS: { q: string; t: Trait }[] = [
  { q: "I enjoy fixing or building things with my hands.", t: "R" },
  { q: "I like working outdoors or with tools, machines, plants.", t: "R" },
  { q: "I prefer doing physical activities over desk work.", t: "R" },
  { q: "I love solving puzzles, equations and figuring out how things work.", t: "I" },
  { q: "I enjoy doing research, reading and learning new theories.", t: "I" },
  { q: "I get excited about science, data and experiments.", t: "I" },
  { q: "I love drawing, music, design, writing or any form of art.", t: "A" },
  { q: "I prefer creative freedom over fixed rules.", t: "A" },
  { q: "I daydream a lot and have wild original ideas.", t: "A" },
  { q: "I enjoy helping, teaching or counseling people.", t: "S" },
  { q: "Friends often come to me with their problems.", t: "S" },
  { q: "I feel happy when I make a real difference in someone's life.", t: "S" },
  { q: "I love leading a team, pitching ideas or convincing people.", t: "E" },
  { q: "I want to start my own business someday.", t: "E" },
  { q: "I enjoy competition and chasing big goals.", t: "E" },
  { q: "I like organising things, making lists and following a plan.", t: "C" },
  { q: "I am detail oriented and notice small mistakes others miss.", t: "C" },
  { q: "I enjoy working with numbers, spreadsheets or records.", t: "C" },
];

const TRAIT_META: Record<Trait, { name: string; tag: string; emoji: string; color: string; streams: string[]; careers: string[] }> = {
  R: {
    name: "The Builder (Realistic)",
    tag: "Hands-on, practical, action-first",
    emoji: "🛠️",
    color: "from-amber-400 to-orange-500",
    streams: ["Engineering (Mech / Civil / Auto)", "Polytechnic / ITI", "Defence & Aviation", "Agriculture"],
    careers: ["Mechanical Engineer", "Pilot", "Architect", "Defence Officer", "Automobile Designer"],
  },
  I: {
    name: "The Thinker (Investigative)",
    tag: "Curious, analytical, deep diver",
    emoji: "🧪",
    color: "from-indigo-500 to-violet-600",
    streams: ["Science (PCM / PCB)", "B.Sc / Research", "Computer Science & AI", "Medical / Pharmacy"],
    careers: ["Data Scientist", "Doctor", "Researcher", "AI Engineer", "Forensic Expert"],
  },
  A: {
    name: "The Creator (Artistic)",
    tag: "Imaginative, expressive, original",
    emoji: "🎨",
    color: "from-pink-500 to-rose-500",
    streams: ["Design (NIFT / NID)", "Mass Communication", "Fine Arts / Animation", "Performing Arts"],
    careers: ["UI/UX Designer", "Content Creator", "Filmmaker", "Fashion Designer", "Musician"],
  },
  S: {
    name: "The Helper (Social)",
    tag: "Warm, empathetic, people-first",
    emoji: "🤝",
    color: "from-emerald-400 to-teal-500",
    streams: ["Psychology", "Education / B.Ed", "Social Work / Sociology", "Nursing / Allied Health"],
    careers: ["Psychologist", "Teacher", "HR Manager", "Counselor", "Doctor / Nurse"],
  },
  E: {
    name: "The Leader (Enterprising)",
    tag: "Bold, persuasive, founder energy",
    emoji: "🚀",
    color: "from-orange-500 to-red-500",
    streams: ["BBA / MBA", "Commerce", "Law (BA LLB)", "Hotel Management"],
    careers: ["Entrepreneur", "Marketing Manager", "Lawyer", "Investment Banker", "Brand Manager"],
  },
  C: {
    name: "The Organiser (Conventional)",
    tag: "Structured, precise, reliable",
    emoji: "📊",
    color: "from-sky-500 to-blue-600",
    streams: ["B.Com / CA / CS / CMA", "Banking & Finance", "Statistics / Actuarial", "Public Administration"],
    careers: ["Chartered Accountant", "Banker", "Civil Services Officer", "Data Analyst", "Auditor"],
  },
};

const SCALE = [
  { v: 1, label: "Not me" },
  { v: 2, label: "Meh" },
  { v: 3, label: "Maybe" },
  { v: 4, label: "Sounds like me" },
  { v: 5, label: "Totally me" },
];

export function PsychometricTestTool() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;
  const progress = Math.round((Object.keys(answers).length / QUESTIONS.length) * 100);

  const handleAnswer = (idx: number, val: number) => {
    setAnswers((prev) => ({ ...prev, [idx]: val }));
  };

  const computeResult = () => {
    const scores: Record<Trait, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    QUESTIONS.forEach((q, i) => {
      scores[q.t] += answers[i] || 0;
    });
    const sorted = (Object.entries(scores) as [Trait, number][]).sort((a, b) => b[1] - a[1]);
    const max = sorted[0][1] || 1;
    return { sorted, max, scores };
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  if (submitted) {
    const { sorted, max } = computeResult();
    const top = sorted[0][0];
    const second = sorted[1][0];
    const topMeta = TRAIT_META[top];
    const secondMeta = TRAIT_META[second];

    return (
      <div className="space-y-5">
        <div className={`rounded-2xl p-5 bg-gradient-to-br ${topMeta.color} text-white shadow-md`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Your Career DNA
          </div>
          <div className="text-3xl mb-1">{topMeta.emoji}</div>
          <h3 className="text-xl font-extrabold leading-tight">{topMeta.name}</h3>
          <p className="text-sm opacity-95 mt-1">{topMeta.tag}</p>
          <p className="text-xs opacity-90 mt-2">
            Secondary vibe: <span className="font-semibold">{secondMeta.emoji} {secondMeta.name.split("(")[0].trim()}</span>
          </p>
        </div>

        <div className="bg-muted/40 rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your trait breakdown</p>
          <div className="space-y-2">
            {sorted.map(([trait, score]) => {
              const meta = TRAIT_META[trait];
              const pct = Math.round((score / max) * 100);
              return (
                <div key={trait}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{meta.emoji} {meta.name.split("(")[0].trim()}</span>
                    <span className="text-muted-foreground">{score} pts</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${meta.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Best-fit streams</p>
            <ul className="space-y-1.5 text-sm text-foreground">
              {topMeta.streams.map((s) => (
                <li key={s} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">●</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Careers you'd love</p>
            <ul className="space-y-1.5 text-sm text-foreground">
              {topMeta.careers.map((c) => (
                <li key={c} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">●</span>{c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-foreground mb-1">Want a free personalised roadmap? 🎯</p>
          <p className="text-xs text-muted-foreground mb-3">Our counsellors will guide you on colleges, exams & scholarships matching your personality.</p>
          <LeadCaptureForm variant="inline" source="psychometric_test_result" simple />
        </div>

        <Button onClick={reset} variant="outline" className="w-full rounded-xl">
          <RotateCw className="w-4 h-4 mr-2" /> Retake Test
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Psychometric Career Test</h3>
          <p className="text-sm text-muted-foreground">18 quick questions. Find your career personality & best-fit streams in under 2 minutes.</p>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur py-2 -mx-1 px-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold text-foreground">Progress</span>
          <span className="text-muted-foreground">{Object.keys(answers).length} / {QUESTIONS.length}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {QUESTIONS.map((q, i) => (
          <div key={i} className="bg-muted/30 rounded-xl p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              <span className="text-primary font-bold mr-1">Q{i + 1}.</span> {q.q}
            </p>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {SCALE.map((s) => (
                <button
                  key={s.v}
                  onClick={() => handleAnswer(i, s.v)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    answers[i] === s.v
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                      : "bg-card text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() => setSubmitted(true)}
        disabled={!allAnswered}
        className="gradient-primary text-primary-foreground rounded-xl w-full h-12 text-base font-bold disabled:opacity-50"
      >
        {allAnswered ? "Reveal My Career DNA ✨" : `Answer ${QUESTIONS.length - Object.keys(answers).length} more to unlock`}
      </Button>
    </div>
  );
}
