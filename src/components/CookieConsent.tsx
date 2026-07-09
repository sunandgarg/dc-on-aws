import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, Settings2, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "dc_cookie_consent_v1";       // "accepted" | "essential" | "rejected"
const PROFILE_KEY = "dc_user_prefill_v1";
const PREFS_KEY = "dc_cookie_prefs_v1";          // JSON {essential:true, prefill:bool, analytics:bool, marketing:bool}

interface Prefs {
  essential: true;
  prefill: boolean;
  analytics: boolean;
  marketing: boolean;
}
const DEFAULT_PREFS: Prefs = { essential: true, prefill: true, analytics: true, marketing: true };

export interface PrefillCookie {
  name?: string;
  email?: string;
  phone?: string;
  state?: string;
  city?: string;
  className?: string;
}

function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

export function getPrefillCookie(): PrefillCookie {
  try {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (consent !== "accepted" && consent !== "essential") return {};
    if (!getPrefs().prefill) return {};
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePrefillCookie(data: PrefillCookie) {
  try {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (consent !== "accepted" && consent !== "essential") return;
    if (!getPrefs().prefill) return;
    const existing = getPrefillCookie();
    const merged = { ...existing, ...data };
    Object.keys(merged).forEach(k => { if (!merged[k as keyof PrefillCookie]) delete merged[k as keyof PrefillCookie]; });
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  } catch {}
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    setPrefs(getPrefs());
    if (!saved) {
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const persist = (consent: "accepted" | "essential" | "rejected", finalPrefs: Prefs) => {
    localStorage.setItem(COOKIE_KEY, consent);
    localStorage.setItem(PREFS_KEY, JSON.stringify(finalPrefs));
    if (consent === "rejected") localStorage.removeItem(PROFILE_KEY);
    setOpen(false);
    // Log opt-in choice (best-effort, anonymous)
    try {
      const sid = localStorage.getItem("dc_session_id") || `s_${Date.now()}`;
      import("@/integrations/supabase/client").then(({ supabase }) =>
        (supabase as any).from("user_consent").insert({
          session_id: sid,
          essential: finalPrefs.essential,
          analytics: finalPrefs.analytics,
          marketing: finalPrefs.marketing,
          prefill: finalPrefs.prefill,
          user_agent: navigator.userAgent,
        })
      );
    } catch {}
  };

  const acceptAll = () => persist("accepted", { essential: true, prefill: true, analytics: true, marketing: true });
  const acceptEssential = () => persist("essential", { essential: true, prefill: prefs.prefill, analytics: false, marketing: false });
  const saveCustom = () => persist(prefs.analytics || prefs.marketing ? "accepted" : "essential", prefs);

  const Toggle = ({ k, label, desc, locked }: { k: keyof Prefs; label: string; desc: string; locked?: boolean }) => (
    <label className="flex items-start gap-3 py-2 cursor-pointer">
      <input
        type="checkbox"
        disabled={locked}
        checked={prefs[k] as boolean}
        onChange={e => setPrefs(p => ({ ...p, [k]: e.target.checked }))}
        className="mt-0.5 w-4 h-4 rounded accent-primary disabled:opacity-50"
      />
      <div className="flex-1">
        <div className="text-xs font-semibold flex items-center gap-1.5">{label}{locked && <span className="text-[10px] text-muted-foreground font-normal">(always on)</span>}</div>
        <div className="text-[11px] text-muted-foreground leading-snug">{desc}</div>
      </div>
    </label>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 22 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[120]"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm">We value your privacy</h3>
                  <button onClick={() => persist("rejected", { ...DEFAULT_PREFS, prefill: false, analytics: false, marketing: false })} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  We use cookies to keep the site running and to pre-fill your details so guidance reaches you faster. Pick what's right for you.
                </p>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {showCustom && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 border-t border-border overflow-hidden"
                >
                  <Toggle k="essential" label="Essential" desc="Required for login, security and basic site functionality." locked />
                  <Toggle k="prefill" label="Personalisation (prefill)" desc="Remember your name, mobile, state, city so forms are auto-filled." />
                  <Toggle k="analytics" label="Analytics" desc="Help us understand which pages and tools work best." />
                  <Toggle k="marketing" label="Marketing" desc="Show counselling offers most relevant to your interests." />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-4 pb-4 pt-3 flex flex-wrap items-center gap-2">
              {!showCustom ? (
                <>
                  <Button onClick={() => setShowCustom(true)} variant="ghost" size="sm" className="rounded-xl text-xs gap-1">
                    <Settings2 className="w-3.5 h-3.5" /> Customise <ChevronDown className="w-3 h-3" />
                  </Button>
                  <div className="ml-auto flex gap-2">
                    <Button onClick={acceptEssential} variant="outline" size="sm" className="rounded-xl">Essential only</Button>
                    <Button onClick={acceptAll} size="sm" className="rounded-xl bg-primary hover:bg-primary/90">
                      <ShieldCheck className="w-4 h-4 mr-1.5" /> Accept all
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button onClick={() => setShowCustom(false)} variant="ghost" size="sm" className="rounded-xl text-xs">Back</Button>
                  <div className="ml-auto flex gap-2">
                    <Button onClick={() => persist("rejected", { ...DEFAULT_PREFS, prefill: false, analytics: false, marketing: false })} variant="outline" size="sm" className="rounded-xl">Decline all</Button>
                    <Button onClick={saveCustom} size="sm" className="rounded-xl bg-primary hover:bg-primary/90">Save preferences</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
