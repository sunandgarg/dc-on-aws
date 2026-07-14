import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Send, Loader2, User, Mail, BookOpen, MapPin, ShieldCheck } from "lucide-react";
import dcLogo from "@/assets/dc-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useStatesAndCities } from "@/hooks/useLocations";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getPrefillCookie, savePrefillCookie } from "@/components/CookieConsent";

import { useInlineOtp, isValidIndianMobile, PHONE_HINT, sanitizeIndianMobile } from "@/components/LeadInlineOtp";
import { ProgramModeToggle, type ProgramMode } from "@/components/ProgramModeToggle";
import { detectDeviceType, inferSourceCategory } from "@/lib/leadTracking";
import { functionUrl } from "@/lib/backendMode";

const LEAD_URL = functionUrl("save-lead");

const courseOptions = [
  "B.Tech / B.E.", "MBBS / BDS", "B.Com / BBA / MBA", "B.Sc / M.Sc",
  "B.A / M.A", "Law (LLB)", "Design / Architecture",
  "Other UG Program", "Other PG Program", "Other UG Medical", "Other PG Medical",
  "Other",
];

interface AILeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; course: string; state: string; city: string }) => void;
}

export function AILeadForm({ isOpen, onClose, onSubmit }: AILeadFormProps) {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", course: "", otherCourse: "", state: "", city: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const [programMode, setProgramMode] = useState<ProgramMode>("regular");
  const { data: locations } = useStatesAndCities();
  const { data: profile } = useUserProfile();
  const otp = useInlineOtp(formData.phone, "ai_chat");

  useEffect(() => {
    if (!isOpen) return;
    const c = getPrefillCookie();
    setFormData(f => ({
      ...f,
      name: f.name || profile?.name || c.name || "",
      email: f.email || profile?.email || c.email || "",
      phone: f.phone || sanitizeIndianMobile(profile?.phone || c.phone || ""),
      state: f.state || profile?.state || c.state || "",
      city: f.city || profile?.city || c.city || "",
    }));
  }, [isOpen, profile?.name, profile?.email, profile?.phone, profile?.state, profile?.city]);

  const update = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));

  const cities = formData.state ? (locations?.citiesByState[formData.state] || []) : [];

  const submitLead = async () => {
    setIsLoading(true);
    savePrefillCookie({ name: formData.name, email: formData.email, phone: formData.phone, state: formData.state, city: formData.city });
    const courseValue = formData.course === "Other" ? formData.otherCourse : formData.course;
    try {
      await fetch(LEAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          name: formData.name, email: formData.email || null, phone: sanitizeIndianMobile(formData.phone),
          city: formData.city || null, state: formData.state || null,
          current_situation: courseValue || null,
          source: "ai_chat_lead",
          otp_verified: otp.verified,
          program_mode: programMode,
          device_type: detectDeviceType(),
          source_category: inferSourceCategory("ai_chat_lead"),
        }),
      });
      onSubmit({ name: formData.name, course: courseValue, state: formData.state, city: formData.city });
    } catch (error) {
      console.error("Lead save error:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.course) {
      toast.error("Please add your name, mobile number and course interest");
      return;
    }
    if (!isValidIndianMobile(formData.phone)) {
      toast.error(PHONE_HINT);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    // If user clicked Get OTP, they must verify before submit.
    if (otp.requested && !otp.verified) {
      otp.markMissing();
      return;
    }
    await submitLead();
  };

  if (!isOpen) return null;

  const selectCls = "w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-card rounded-[28px] shadow-elevated w-full max-w-md overflow-visible my-auto border border-border/70"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - warm & personal */}
        <div className="bg-gradient-to-r from-primary to-blue-700 px-5 py-4 flex items-center justify-between rounded-t-[27px]">
          <div className="flex items-center gap-3">
            <img src={dcLogo} alt="DekhoCampus" className="w-10 h-10 object-contain rounded-full bg-primary-foreground/20 p-1" />
            <div>
              <h3 className="font-bold text-primary-foreground">Start with iKi</h3>
              <p className="text-[11px] text-primary-foreground/90">Three quick details for personalised guidance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-primary-foreground/80 hover:text-primary-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Free guidance - no sales pressure</div>

          {/* Name */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your Name *"
              className="pl-10 rounded-xl h-10 text-sm"
              required
            />
          </div>

          {/* Phone with +91 + inline Get OTP */}
          <div className="space-y-1">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 flex items-center gap-0 min-w-0">
                <span className="flex-shrink-0 px-3 py-2.5 bg-muted rounded-l-xl border border-r-0 border-border text-sm text-muted-foreground font-medium">+91</span>
                <Input
                  value={formData.phone}
                  onChange={(e) => update("phone", sanitizeIndianMobile(e.target.value))}
                  placeholder="Contact Number *"
                  type="tel"
                  maxLength={15}
                  pattern="[6-9][0-9]{9}"
                  className="rounded-l-none rounded-r-xl h-10 text-sm min-w-0"
                  required
                />
              </div>
              {otp.getOtpButton}
            </div>
            {formData.phone.length > 0 && !isValidIndianMobile(formData.phone) && (
              <p className="text-xs text-destructive pl-1">{PHONE_HINT}</p>
            )}
            {otp.verifyBlock}
          </div>


          {/* Course select - required */}
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={formData.course}
              onChange={(e) => update("course", e.target.value)}
              className={`${selectCls} pl-10`}
              required
            >
              <option value="">Interested Course *</option>
              {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {formData.course === "Other" && (
            <Input
              value={formData.otherCourse}
              onChange={(e) => update("otherCourse", e.target.value)}
              placeholder="Enter your course interest"
              className="rounded-xl h-10 text-sm"
            />
          )}

          <ProgramModeToggle value={programMode} onChange={setProgramMode} />

          <details className="group rounded-2xl border border-border/70 bg-muted/25 px-3.5 py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-foreground"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Add location or email <span className="font-medium text-muted-foreground">(optional)</span></span><span className="text-primary group-open:rotate-45 transition">+</span></summary>
            <div className="mt-3 space-y-2.5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={formData.email} onChange={(e) => update("email", e.target.value)} placeholder="Email address (optional)" type="email" className="pl-10 rounded-xl h-10 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SearchableSelect options={locations?.states || []} value={formData.state} onChange={(v) => { update("state", v); update("city", ""); }} placeholder="State" />
                <SearchableSelect options={cities} value={formData.city} onChange={(v) => update("city", v)} placeholder={formData.state ? "City" : "Select state"} />
              </div>
            </div>
          </details>

          {/* Authorization checkbox */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-border text-primary accent-primary" />
            <span className="text-[11px] text-muted-foreground leading-tight">
              I authorize DekhoCampus to contact me with updates via Email, SMS, WhatsApp & Call. <a href="/terms" className="text-primary underline">T&C apply</a>
            </span>
          </label>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-xl h-11 text-sm" disabled={isLoading || !authorized}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {isLoading ? "Saving..." : "Continue with iKi"}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            Your details stay secure. No spam, ever.
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
