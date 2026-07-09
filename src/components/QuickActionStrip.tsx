import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { Laptop, GraduationCap, Globe, ArrowRight } from "lucide-react";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { useSiteIntegration } from "@/hooks/useSiteIntegration";
import { toast } from "sonner";

type Action = "online" | "premium" | "abroad";
type ActionIcon = ComponentType<SVGProps<SVGSVGElement>>;

const items: { key: Action; label: string; sub: string; icon: ActionIcon; bg: string; ring: string; iconBg: string }[] = [
  { key: "online", label: "Online Degrees", sub: "UGC-approved", icon: Laptop, bg: "bg-emerald-50", ring: "border-emerald-200/70", iconBg: "bg-emerald-500/15 text-emerald-700" },
  { key: "premium", label: "IIT / IIM / Dr. Tag", sub: "Premium programs", icon: GraduationCap, bg: "bg-primary/5", ring: "border-primary/20", iconBg: "bg-primary/15 text-primary" },
  { key: "abroad", label: "Study Abroad", sub: "USA · UK · Canada", icon: Globe, bg: "bg-blue-50", ring: "border-blue-200/70", iconBg: "bg-blue-500/15 text-blue-700" },
];

export function QuickActionStrip() {
  const [active, setActive] = useState<Action | null>(null);
  const { data: onlineRedirect } = useSiteIntegration("online_degree_redirect_url");
  const { data: abroadRedirect } = useSiteIntegration("study_abroad_redirect_url");

  const open = (k: Action) => setActive(k);
  const close = () => setActive(null);

  const onSuccess = () => {
    const url = active === "abroad" ? abroadRedirect : active === "online" ? onlineRedirect : "";
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.success("Our counsellor will reach out shortly");
    close();
  };

  const scrollToPremium = () => {
    const el = document.getElementById("trending-programs-heading");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClick = (k: Action) => {
    if (k === "premium") return scrollToPremium();
    open(k);
  };

  return (
    <section className="my-3" aria-label="Quick actions">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => handleClick(it.key)}
            className={`group flex items-center gap-2 md:gap-3 rounded-xl border ${it.ring} ${it.bg} px-2.5 md:px-3.5 py-2 md:py-2.5 text-left hover:shadow-sm hover:-translate-y-0.5 transition`}
          >
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${it.iconBg} flex items-center justify-center flex-shrink-0`}>
              <it.icon className="w-4 h-4 md:w-4.5 md:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] md:text-sm font-bold text-foreground leading-tight truncate">{it.label}</p>
              <p className="hidden sm:block text-[10.5px] md:text-[11px] text-muted-foreground truncate">{it.sub}</p>
            </div>
            <ArrowRight className="hidden md:block w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition" />
          </button>
        ))}
      </div>

      <LeadGateDialog
        open={active === "online" || active === "abroad"}
        onOpenChange={(v) => { if (!v) close(); }}
        title={active === "abroad" ? "🌍 Get Study Abroad Guidance - Free!" : "💻 Get Online Degree Guidance - Free!"}
        subtitle="Fill the form & get ₹999 counselling session FREE!"
        source={active === "abroad" ? "study_abroad_strip" : "online_degree_strip"}
        onSuccess={onSuccess}
        forceShow
      />
    </section>
  );
}
