import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Compass,
  GraduationCap,
  Laptop,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const goals = [
  { label: "College admission", icon: GraduationCap },
  { label: "Online degree", icon: Laptop },
  { label: "MBA and CAT", icon: TrendingUp },
  { label: "Study abroad", icon: Compass },
  { label: "Career clarity", icon: BriefcaseBusiness },
] as const;

const profiles = ["Student", "Parent", "Professional"] as const;

interface HeroCounsellingCardProps {
  onStart: (message: string) => void;
}

export function HeroCounsellingCard({ onStart }: HeroCounsellingCardProps) {
  const [goal, setGoal] = useState<(typeof goals)[number]["label"]>("College admission");
  const [profile, setProfile] = useState<(typeof profiles)[number]>("Student");

  const start = () => {
    onStart(`I am a ${profile.toLowerCase()} looking for help with ${goal.toLowerCase()}. Please build my personalised shortlist.`);
  };

  return (
    <aside className="group relative mx-auto w-full max-w-[430px] lg:mx-0 lg:ml-auto" aria-label="Free counselling starter">
      <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-br from-primary/20 via-white/10 to-accent/20 blur-2xl transition-opacity duration-500 group-hover:opacity-90" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/88 p-5 shadow-[0_32px_90px_-32px_rgba(20,65,150,0.55)] backdrop-blur-2xl sm:p-6">
        <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-primary/12 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-14 h-36 w-36 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
              <ShieldCheck className="h-3.5 w-3.5" />
              Free expert guidance
            </span>
            <div className="flex items-center gap-1.5" aria-label="Step 1 of 2">
              <span className="h-1.5 w-8 rounded-full bg-primary" />
              <span className="h-1.5 w-4 rounded-full bg-primary/15" />
            </div>
          </div>

          <div className="mb-4">
            <span className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Your decision studio
            </span>
            <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">What are you planning next?</h2>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">Pick one goal. We will turn it into a verified shortlist and action plan.</p>
          </div>

          <fieldset className="mb-4">
            <legend className="sr-only">Select your goal</legend>
            <div className="grid grid-cols-2 gap-2">
              {goals.map(({ label, icon: Icon }, index) => {
                const selected = goal === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setGoal(label)}
                    aria-pressed={selected}
                    className={`relative flex min-h-[52px] items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold transition-all ${index === goals.length - 1 ? "col-span-2" : ""} ${selected ? "border-primary/35 bg-primary/[0.07] text-primary shadow-[0_8px_24px_-16px_rgba(25,90,200,0.8)]" : "border-border/70 bg-white/75 text-foreground hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.03]"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{label}</span>
                    {selected && <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-2.5 w-2.5" /></span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold text-foreground">I am a</legend>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/70 p-1">
              {profiles.map((item) => {
                const selected = profile === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setProfile(item)}
                    aria-pressed={selected}
                    className={`min-h-9 rounded-xl px-2 py-2 text-[11px] font-bold transition-all sm:text-xs ${selected ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
            className="group/cta flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-[0_14px_32px_-14px_rgba(20,80,200,0.8)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-14px_rgba(20,80,200,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Reveal my best-fit options
            <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
            <span className="flex -space-x-1.5" aria-hidden="true">
              {["S", "A", "R"].map((letter, index) => (
                <span key={letter} className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold text-white ${index === 0 ? "bg-primary" : index === 1 ? "bg-accent" : "bg-emerald-500"}`}>{letter}</span>
              ))}
            </span>
            Trusted by students and parents across India
          </div>
        </div>
      </div>
    </aside>
  );
}
