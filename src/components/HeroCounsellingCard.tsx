import { useState } from "react";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";

const goals = [
  "College admission",
  "Online degree",
  "MBA and CAT",
  "Study abroad",
  "Career clarity",
] as const;

const profiles = ["Student", "Parent", "Working professional"] as const;

interface HeroCounsellingCardProps {
  onStart: (message: string) => void;
}

export function HeroCounsellingCard({ onStart }: HeroCounsellingCardProps) {
  const [goal, setGoal] = useState<(typeof goals)[number]>("College admission");
  const [profile, setProfile] = useState<(typeof profiles)[number]>("Student");

  const start = () => {
    onStart(`I am a ${profile.toLowerCase()} looking for help with ${goal.toLowerCase()}. Please build my personalised shortlist.`);
  };

  return (
    <aside className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-28px_rgba(15,55,120,0.45)] backdrop-blur-xl sm:p-6" aria-label="Free counselling starter">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Free and counsellor verified
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">1 of 2</span>
        </div>

        <div className="mb-5 flex gap-1.5" aria-hidden="true">
          <span className="h-1 flex-1 rounded-full bg-primary" />
          <span className="h-1 flex-1 rounded-full bg-primary/15" />
        </div>

        <div className="mb-5">
          <div className="mb-1.5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Build your personalised shortlist</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">Tell us what you need. We will match you with the right colleges, courses and next steps.</p>
        </div>

        <fieldset className="mb-5">
          <legend className="mb-2.5 text-sm font-semibold text-foreground">What are you planning next?</legend>
          <div className="flex flex-wrap gap-2">
            {goals.map((item) => {
              const selected = goal === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGoal(item)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selected ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-white text-foreground hover:border-primary/30 hover:bg-primary/5"}`}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                  {item}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mb-5">
          <legend className="mb-2.5 text-sm font-semibold text-foreground">I am a</legend>
          <div className="grid grid-cols-3 gap-2">
            {profiles.map((item) => {
              const selected = profile === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setProfile(item)}
                  aria-pressed={selected}
                  className={`min-h-10 rounded-xl border px-2 py-2 text-[11px] font-semibold transition-colors sm:text-xs ${selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-white text-foreground hover:bg-primary/5"}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={start}
          className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Get my free shortlist
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">No agent markups - no obligation - your details stay private</p>
      </div>
    </aside>
  );
}
