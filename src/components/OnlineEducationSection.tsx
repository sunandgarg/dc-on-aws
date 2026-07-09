import { useState } from "react";
import { motion } from "framer-motion";
import { Laptop, Globe, ArrowRight, Monitor, BookOpen, Award, Briefcase, TrendingUp, Users, Clock, Wifi, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadGateDialog } from "@/components/LeadGateDialog";
import { useTrustedPartners, type TrustedPartner } from "@/hooks/useTrustedPartners";
import { useSiteIntegration } from "@/hooks/useSiteIntegration";
import { toast } from "sonner";

const onlineFeatures = [
  { icon: Monitor, label: "Live Classes", desc: "Interactive sessions" },
  { icon: Clock, label: "Flexible Hours", desc: "Learn at your pace" },
  { icon: Award, label: "UGC Approved", desc: "Valid degrees" },
  { icon: Wifi, label: "100% Online", desc: "Learn anywhere" },
];

const onlineDegrees = [
  { name: "Online MBA", university: "Top B-Schools", fee: "₹1.5L - ₹6L", duration: "2 Years" },
  { name: "Online B.Tech", university: "AICTE Approved", fee: "₹1L - ₹3L", duration: "4 Years" },
  { name: "Online BCA", university: "UGC Approved", fee: "₹60K - ₹2L", duration: "3 Years" },
  { name: "Online MCA", university: "Top Universities", fee: "₹80K - ₹2.5L", duration: "2 Years" },
];

export function OnlineEducationSection() {
  const [showLead, setShowLead] = useState(false);
  const [leadSource, setLeadSource] = useState("online_degree");
  const { data: partners } = useTrustedPartners();
  const onlineLogos = (partners ?? []).filter((p: TrustedPartner) => p.is_active !== false).slice(0, 24);
  const { data: onlineRedirect } = useSiteIntegration("online_degree_redirect_url");
  const { data: abroadRedirect } = useSiteIntegration("study_abroad_redirect_url");

  const handleOnlineClick = () => {
    setLeadSource("online_degree_explore");
    setShowLead(true);
  };

  const handleAbroadClick = () => {
    setLeadSource("study_abroad_explore");
    setShowLead(true);
  };

  const onLeadSuccess = () => {
    const url = leadSource.includes("abroad") ? abroadRedirect : onlineRedirect;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.success("Our counsellor will reach out shortly");
    setShowLead(false);
  };

  return (
    <>
      <section className="py-12 md:py-20 relative overflow-hidden" aria-labelledby="online-edu-heading">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
        
        <div className="container relative z-10">
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide mb-3">
              <Globe className="w-3.5 h-3.5" /> We have this too
            </div>
            <h2 id="online-edu-heading" className="text-headline font-bold text-foreground">
              Online Degrees & <span className="text-gradient">Study Abroad</span>
            </h2>
            <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Flexible online programs and globally recognised universities - all in one place.
            </p>
          </div>
          <div className="flex md:grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 snap-x snap-mandatory md:snap-none overflow-x-auto overflow-y-clip md:overflow-visible scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 [&>*]:snap-start [&>*]:shrink-0 [&>*]:w-[88%] sm:[&>*]:w-[70%] md:[&>*]:w-auto md:[&>*]:shrink">
            {/* Online Degrees Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="snap-start group relative min-w-0 w-full rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative h-44 sm:h-52 md:h-56 bg-gradient-to-br from-accent/20 via-accent/10 to-background overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="relative">
                    <div className="w-40 h-2 bg-accent/30 rounded-full mx-auto" />
                    <motion.div className="relative -mt-12 mx-auto" animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                      <div className="w-28 h-20 bg-gradient-to-b from-foreground/90 to-foreground/70 rounded-t-lg mx-auto flex items-center justify-center border-2 border-foreground/20">
                        <div className="w-24 h-16 bg-accent/20 rounded overflow-hidden p-1">
                          <motion.div className="space-y-1" animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                            <div className="h-1.5 w-full bg-accent/40 rounded" />
                            <div className="h-1.5 w-3/4 bg-primary/40 rounded" />
                            <div className="h-1.5 w-full bg-accent/30 rounded" />
                            <div className="h-3 w-8 bg-accent rounded-sm mx-auto mt-1" />
                          </motion.div>
                        </div>
                      </div>
                      <div className="w-32 h-1.5 bg-foreground/60 rounded-b-lg mx-auto" />
                      <div className="w-16 h-1 bg-foreground/40 rounded-b mx-auto" />
                    </motion.div>
                    <motion.div className="absolute -top-24 left-1/2 -translate-x-1/2" animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
                      <div className="w-10 h-10 rounded-full bg-accent/60 mx-auto" />
                      <div className="w-16 h-12 bg-accent/40 rounded-t-xl mx-auto -mt-2" />
                    </motion.div>
                  </motion.div>
                </div>
                {[
                  { icon: Briefcase, x: "15%", y: "20%", delay: 0 },
                  { icon: TrendingUp, x: "80%", y: "15%", delay: 0.5 },
                  { icon: GraduationCap, x: "10%", y: "70%", delay: 1 },
                  { icon: Users, x: "85%", y: "65%", delay: 1.5 },
                ].map(({ icon: Icon, x, y, delay }) => (
                  <motion.div key={`${x}-${y}`} className="absolute" style={{ left: x, top: y }} animate={{ x: [0, 8, 0], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay }}>
                    <div className="w-8 h-8 rounded-lg bg-card/80 backdrop-blur-sm border border-accent/20 flex items-center justify-center shadow-sm">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                  </motion.div>
                ))}
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-accent text-accent-foreground">🔥 Trending</span>
                </div>
              </div>

              <div className="p-3 md:p-6">
                <h3 className="text-sm md:text-xl font-extrabold text-foreground mb-1 md:mb-2">Online Degrees</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 leading-snug">
                  UGC-approved online B.Tech, MBA, BCA & more from top universities. Study while you work!
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {onlineFeatures.map((f) => (
                    <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-xs font-medium text-accent">
                      <f.icon className="w-3.5 h-3.5" />
                      {f.label}
                    </div>
                  ))}
                </div>
                <div className="block space-y-2 mb-5">
                  {onlineDegrees.map((d) => (
                    <div key={d.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={handleOnlineClick}>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.university} • {d.duration}</p>
                      </div>
                      <span className="text-xs font-bold text-accent">{d.fee}</span>
                    </div>
                  ))}
                </div>
                {onlineLogos.length > 0 && (
                  <div className="block mb-4 -mx-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">Our partner universities</p>
                    <div className="overflow-hidden relative" style={{ maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)" }}>
                      <div className="flex gap-6 items-center animate-[marquee_25s_linear_infinite] whitespace-nowrap py-1">
                        {[...onlineLogos, ...onlineLogos].map((p, i) => (
                          p.logo_url ? (
                            <img key={`${p.id}-${i}`} src={p.logo_url} alt={p.name} className="h-7 md:h-8 w-auto object-contain opacity-80 hover:opacity-100 transition flex-shrink-0" loading="lazy" />
                          ) : (
                            <span key={`${p.id}-${i}`} className="text-xs font-semibold text-muted-foreground flex-shrink-0">{p.name}</span>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <Button size="sm" className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-xs md:text-sm px-2" onClick={handleOnlineClick}>
                  Explore <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1 md:ml-2" />
                </Button>
              </div>
            </motion.div>

            {/* Study Abroad Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="snap-start group relative min-w-0 w-full rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative h-44 sm:h-52 md:h-56 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="w-32 h-32 rounded-full border-2 border-primary/20 relative">
                    <div className="absolute inset-2 rounded-full border border-dashed border-primary/15" />
                    <div className="absolute inset-4 rounded-full border border-dashed border-primary/10" />
                  </motion.div>
                  {["🇺🇸", "🇬🇧", "🇨🇦", "🇦🇺"].map((flag, i) => (
                    <motion.div key={flag} className="absolute text-2xl"
                      animate={{
                        x: [Math.cos(i * Math.PI / 2) * 80, Math.cos(i * Math.PI / 2 + Math.PI * 2) * 80],
                        y: [Math.sin(i * Math.PI / 2) * 80, Math.sin(i * Math.PI / 2 + Math.PI * 2) * 80],
                      }}
                      transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: i * 3 }}
                      style={{ left: "50%", top: "50%", marginLeft: "-12px", marginTop: "-12px" }}
                    >{flag}</motion.div>
                  ))}
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">🌍 Popular</span>
                </div>
              </div>

              <div className="p-3 md:p-6">
                <h3 className="text-sm md:text-xl font-extrabold text-foreground mb-1 md:mb-2">Study Abroad</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-5 leading-snug">
                  MS, MBA & Bachelors from top universities in US, UK, Canada, Australia & Germany
                </p>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { flag: "🇺🇸", name: "USA", count: "2000+" },
                    { flag: "🇬🇧", name: "UK", count: "150+" },
                    { flag: "🇨🇦", name: "Canada", count: "300+" },
                    { flag: "🇦🇺", name: "Australia", count: "200+" },
                    { flag: "🇩🇪", name: "Germany", count: "400+" },
                    { flag: "🇳🇿", name: "NZ", count: "80+" },
                  ].map((c) => (
                    <motion.div key={c.name} whileHover={{ scale: 1.05 }} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/50 hover:bg-primary/5 cursor-pointer transition-colors" onClick={handleAbroadClick}>
                      <span className="text-2xl">{c.flag}</span>
                      <span className="text-xs font-bold text-foreground">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.count}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-5">
                  {["SOP Review", "Visa Guidance", "IELTS Prep", "Scholarship Help"].map((s) => (
                    <span key={s} className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary">{s}</span>
                  ))}
                </div>
                <Button size="sm" className="w-full rounded-xl gradient-primary text-primary-foreground text-xs md:text-sm px-2" onClick={handleAbroadClick}>
                  <Globe className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Explore <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1 md:ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <LeadGateDialog
        open={showLead}
        onOpenChange={setShowLead}
        title={leadSource.includes("abroad") ? "🌍 Get Study Abroad Guidance - Free!" : "💻 Get Online Degree Guidance - Free!"}
        subtitle="Fill the form & get ₹999 counselling session FREE!"
        source={leadSource}
        onSuccess={onLeadSuccess}
        forceShow
      />
    </>
  );
}
