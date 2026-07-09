import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Sparkles, Target, Flame, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HOT_TARGETS = [
  { slug: "iit-bombay-cse", label: "IIT Bombay · CSE" },
  { slug: "aiims-delhi-mbbs", label: "AIIMS Delhi · MBBS" },
  { slug: "nlsiu-bangalore-llb", label: "NLSIU · Law" },
  { slug: "iim-ahmedabad-mba", label: "IIM-A · MBA" },
  { slug: "nid-ahmedabad-bdes", label: "NID · Design" },
  { slug: "srcc-delhi-bcom", label: "SRCC · B.Com" },
];

export function LockTargetTool() {
  const navigate = useNavigate();
  const [college, setCollege] = useState("");
  const [klass, setKlass] = useState("11");

  function go(e?: React.FormEvent) {
    e?.preventDefault();
    const slug = (college || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    if (slug) navigate(`/lock-target/${slug}?class=${klass}`);
    else navigate(`/lock-target?class=${klass}`);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 border border-orange-200/60 p-4 md:p-6">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-300/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -left-8 w-44 h-44 bg-rose-200/40 rounded-full blur-3xl" />

      <div className="relative grid md:grid-cols-2 gap-5 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-extrabold text-orange-700 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> New · AI Powered
          </div>
          <h3 className="mt-2 text-xl md:text-2xl font-black tracking-tight text-foreground leading-tight">
            🎯 Target with <span className="text-orange-600">AI</span> — lock your dream college
          </h3>
          <p className="mt-1.5 text-sm text-foreground/70">
            Tell us your dream college. Our AI mentor ships a personalised roadmap — exam, books, weekly plan & a downloadable PDF. Built for GenZ.
          </p>

          <form onSubmit={go} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="IIT Bombay, AIIMS Delhi, NLSIU…"
                className="h-11 rounded-xl text-sm"
              />
              <Button
                type="submit"
                className="h-11 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                <Lock className="w-4 h-4 mr-1.5" /> Lock
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">I'm in</span>
              {["10", "11", "12", "Dropper"].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setKlass(c)}
                  className={`px-2.5 h-7 rounded-full text-[11px] font-bold border transition ${
                    klass === c
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-background border-border text-foreground hover:border-orange-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" /> Trending
            </span>
            {HOT_TARGETS.map((t) => (
              <Link
                key={t.slug}
                to={`/lock-target/${t.slug}`}
                className="text-[11px] font-semibold px-2.5 h-7 rounded-full border border-border bg-card hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition inline-flex items-center"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-orange-200/70 bg-white/80 backdrop-blur p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2">
              <Wand2 className="w-3.5 h-3.5" /> What you'll get
            </div>
            <ul className="space-y-2 text-sm">
              {[
                "🎯 AI verdict — can you actually crack it?",
                "📅 Phase-by-phase roadmap till the exam",
                "📚 Best books, mocks & weekly subject plan",
                "🛟 Backup college list (no L's allowed)",
                "📄 Downloadable PDF roadmap with your name",
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-foreground/85">
                  <Target className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" /> {s}
                </li>
              ))}
            </ul>
            <Link
              to="/lock-target"
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-orange-700 hover:text-orange-800"
            >
              Open full Target AI <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
