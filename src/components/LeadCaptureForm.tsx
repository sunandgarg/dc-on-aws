import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, User, Mail, Phone, MapPin, Loader2, CheckCircle, BookOpen, GraduationCap } from "lucide-react";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useStatesAndCities } from "@/hooks/useLocations";
import { educationStatus } from "@/data/indianLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import dcLogo from "@/assets/dc-lead-logo.png";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getPrefillCookie, savePrefillCookie } from "@/components/CookieConsent";
import { UrgencyHooks } from "@/components/UrgencyHooks";
import { markLeadSubmitted } from "@/lib/leadCapture";
import { useInlineOtp, isValidIndianMobile, PHONE_HINT, sanitizeIndianMobile } from "@/components/LeadInlineOtp";
import { ProgramModeToggle, type ProgramMode } from "@/components/ProgramModeToggle";
import { detectDeviceType, inferSourceCategory } from "@/lib/leadTracking";
import { trackEvent, trackLeadConversion } from "@/lib/analytics";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LeadCaptureFormProps {
  variant?: "inline" | "card" | "banner" | "sidebar";
  title?: string;
  subtitle?: string;
  source?: string;
  interestedCollegeSlug?: string;
  interestedCourseSlug?: string;
  interestedExamSlug?: string;
  onSuccess?: () => void;
  /** Strip urgency hooks (slots/counselling pitch) and tagline. Used for high-intent Apply/Brochure CTAs. */
  simple?: boolean;
}

const LEAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-lead`;

const courseOptions = [
  "B.Tech / B.E.", "MBBS / BDS", "B.Com / BBA / MBA", "B.Sc / M.Sc",
  "B.A / M.A", "Law (LLB)", "Design / Architecture",
  "Other UG Program", "Other PG Program", "Other UG Medical", "Other PG Medical",
  "Other",
];

const stateOptions = [
  "Andhra Pradesh", "Bihar", "Delhi NCR", "Gujarat", "Haryana", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan",
  "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal", "Other",
];

export function LeadCaptureForm({ 
  variant = "card", 
  title = "Get Free Counseling",
  subtitle = "Talk to our expert counselors for personalized college recommendations",
  source = "website_form",
  interestedCollegeSlug,
  interestedCourseSlug,
  interestedExamSlug,
  onSuccess,
  simple = false,
}: LeadCaptureFormProps) {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", course: "", state: "", city: "",
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string; course?: string; state?: string; city?: string }>({});
  const [filledTracked, setFilledTracked] = useState<{ name?: boolean; email?: boolean; phone?: boolean }>({});
  const [programMode, setProgramMode] = useState<ProgramMode>("regular");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const { data: locations } = useStatesAndCities();
  const { data: profile } = useUserProfile();

  // Derive form key from source so admin per-form OTP channel override applies.
  const formKey = (() => {
    const s = (source || "").toLowerCase();
    if (s.includes("popup")) return "popup";
    if (s.includes("loan")) return "loan";
    if (s.includes("landing")) return "landing";
    if (s.includes("trending")) return "trending_program";
    if (variant === "sidebar" || s.includes("sidebar")) return "sidebar";
    return "sidebar";
  })();
  const otp = useInlineOtp(formData.phone, formKey);

  // Prefill from cookie first (instant), then from logged-in profile when ready.
  useEffect(() => {
    const c = getPrefillCookie();
    setFormData((prev) => ({
      name: prev.name || c.name || "",
      email: prev.email || c.email || "",
      phone: prev.phone || sanitizeIndianMobile(c.phone || ""),
      course: prev.course,
      state: prev.state || c.state || "",
      city: prev.city || c.city || "",
    }));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      name: prev.name || profile.name,
      email: prev.email || profile.email,
      phone: prev.phone || sanitizeIndianMobile(profile.phone || ""),
      course: prev.course,
      state: prev.state || profile.state,
      city: prev.city || profile.city,
    }));
  }, [profile]);

  const update = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "name" || field === "email") {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Track first meaningful fill per field
    if ((field === "name" || field === "email" || field === "phone") && value.trim() && !filledTracked[field as "name" | "email" | "phone"]) {
      setFilledTracked(prev => ({ ...prev, [field]: true }));
      trackEvent("lead_form_field_filled", { field, source, variant });
    }
  };

  const submitLead = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(LEAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          name: formData.name, email: formData.email || null, phone: sanitizeIndianMobile(formData.phone),
          city: formData.city || null, state: formData.state || null,
          current_situation: formData.course || null, source,
          cta: source,
          page_url: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
          interested_college_slug: interestedCollegeSlug || null,
          interested_course_slug: interestedCourseSlug || null,
          interested_exam_slug: interestedExamSlug || null,
          otp_verified: otp.verified,
          program_mode: programMode,
          device_type: detectDeviceType(),
          source_category: inferSourceCategory(source),
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success("Thank you! Our counselor will contact you soon.");
        savePrefillCookie({ name: formData.name, email: formData.email, phone: formData.phone, state: formData.state, city: formData.city });
        markLeadSubmitted();
        try { (window as any).fireGoogleAdsConversion?.({ value: 1, currency: "INR", source }); } catch {}
        trackLeadConversion({ source, variant, has_email: !!formData.email, has_phone: !!formData.phone });
        trackEvent("lead_form_submit_success", { source, variant });
        onSuccess?.();
      } else {
        trackEvent("lead_form_submit_error", { source, variant, status: response.status });
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Lead submission error:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent("lead_form_submit_attempt", { source, variant });

    const newErrors: { name?: string; email?: string; course?: string; state?: string; city?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Please enter your name";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.course?.trim()) {
      newErrors.course = "Please select an interested course";
    }
    if (!formData.state?.trim()) {
      newErrors.state = "Please select your state";
    }
    if (!formData.city?.trim()) {
      newErrors.city = "Please select your city";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      trackEvent("lead_form_validation_error", { source, variant, fields: Object.keys(newErrors).join(",") });
      toast.error(newErrors.name || newErrors.email || newErrors.course || newErrors.state || newErrors.city || "Please fix the errors");
      return;
    }
    if (!isValidIndianMobile(formData.phone)) {
      trackEvent("lead_form_validation_error", { source, variant, fields: "phone" });
      toast.error(PHONE_HINT);
      return;
    }
    setErrors({});
    // OTP rule: if user pressed Get OTP they MUST verify before save.
    // If they never pressed Get OTP, save anyway with otp_verified=false.
    if (otp.requested && !otp.verified) {
      otp.markMissing();
      trackEvent("lead_form_validation_error", { source, variant, fields: "otp" });
      return;
    }
    await submitLead();
  };

  const otpPortal: React.ReactNode = null;



  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          ${variant === "card" ? "bg-card rounded-2xl border border-border p-5 shadow-soft" : ""}
          ${variant === "banner" ? "bg-primary rounded-2xl p-5 text-primary-foreground" : ""}
          ${variant === "sidebar" ? "bg-card rounded-2xl border border-border p-4" : ""}
          ${variant === "inline" ? "bg-muted/50 rounded-xl p-4" : ""}
        `}
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-success" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${variant === "banner" ? "text-primary-foreground" : "text-foreground"}`}>
            Thank You! 🎉
          </h3>
          <p className={`text-sm ${variant === "banner" ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
            Our expert counselor will call you within 24 hours
          </p>
        </div>
        {otpPortal}
      </motion.div>
    );
  }

  const selectCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none";

  const LogoBadge = () => (
    <img src={dcLogo} alt="DekhoCampus" className="h-8 w-8 object-contain" />
  );

  // Card variant
  if (variant === "card") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-card rounded-2xl border border-border p-5 shadow-soft"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={dcLogo} alt="DekhoCampus" className="w-10 h-10 object-contain" />
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              {simple ? (
                <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
              ) : (
                <IITAlumniBadge className="mt-1" />
              )}
            </div>
          </div>
        </div>

        {!simple && <UrgencyHooks variant="full" className="mb-3" />}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="space-y-1">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={formData.name} onChange={e => update("name", e.target.value)} placeholder="Your Name *" aria-invalid={!!errors.name} className={`pl-10 rounded-xl h-10 text-sm ${errors.name ? "border-destructive" : ""}`} required />
            </div>
            {errors.name && <p className="text-xs text-destructive pl-1">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={formData.email} onChange={e => update("email", e.target.value)} placeholder="Email Address *" type="email" aria-invalid={!!errors.email} className={`pl-10 rounded-xl h-10 text-sm ${errors.email ? "border-destructive" : ""}`} required />
            </div>
            {errors.email && <p className="text-xs text-destructive pl-1">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 flex items-center gap-0 min-w-0">
                <span className="flex-shrink-0 px-3 py-2.5 bg-muted rounded-l-xl border border-r-0 border-border text-sm text-muted-foreground font-medium">+91</span>
                <Input value={formData.phone} onChange={e => update("phone", sanitizeIndianMobile(e.target.value))} placeholder="Contact Number *" type="tel" maxLength={15} className="rounded-l-none rounded-r-xl h-10 text-sm min-w-0" required />

              </div>
              {otp.getOtpButton}
            </div>
            {formData.phone.length > 0 && !isValidIndianMobile(formData.phone) && (
              <p className="text-xs text-destructive pl-1">{PHONE_HINT}</p>
            )}
          </div>
          {otp.verifyBlock}
          <ProgramModeToggle value={programMode} onChange={setProgramMode} />

          <div className="space-y-1">
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select value={formData.course} onChange={e => update("course", e.target.value)} className={`${selectCls} pl-10 ${errors.course ? "border-destructive" : ""}`} required>
                <option value="">Interested Course *</option>
                {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {errors.course && <p className="text-xs text-destructive pl-1">{errors.course}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <SearchableSelect
                options={locations?.states || []}
                value={formData.state}
                onChange={(v) => { update("state", v); update("city", ""); }}
                placeholder="State *"
              />
              {errors.state && <p className="text-xs text-destructive pl-1">{errors.state}</p>}
            </div>
            <div className="space-y-1">
              <SearchableSelect
                options={formData.state ? (locations?.citiesByState[formData.state] || []) : []}
                value={formData.city}
                onChange={(v) => update("city", v)}
                placeholder={formData.state ? "City *" : "Select state first"}
              />
              {errors.city && <p className="text-xs text-destructive pl-1">{errors.city}</p>}
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-border text-primary accent-primary" />
            <span className="text-[11px] text-muted-foreground leading-tight">
              I authorize DekhoCampus to contact me via Email, SMS, WhatsApp & Call. No spam - promise. <a href="/terms" className="text-primary underline">T&C</a> · <a href="/privacy" className="text-primary underline">Privacy</a>
            </span>
          </label>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-xl h-10 text-sm text-primary-foreground" disabled={isLoading || !authorized}>
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <>Register Now <Send className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>
        {otpPortal}
      </motion.div>
    );
  }

  // Banner variant
  if (variant === "banner") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-primary rounded-2xl p-4 md:p-6"
      >
        <div className="flex flex-col items-center gap-5 md:gap-6">
          <div className="text-center max-w-2xl flex flex-col items-center">
            <h3 className="text-xl md:text-3xl font-bold text-primary-foreground mb-2 leading-tight">{title}</h3>
            <IITAlumniBadge />
            <p className="text-primary-foreground/90 text-sm md:text-base mt-2">{subtitle}</p>
          </div>
          <UrgencyHooks variant="banner" className="!bg-none !bg-primary-foreground/20 !border-primary-foreground/40 !text-primary-foreground [&_*]:!text-primary-foreground" />
          <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Row 1: Name + Email */}
            <div className="min-w-0">
              <Input value={formData.name} onChange={e => update("name", e.target.value)} placeholder="Your Name *" aria-invalid={!!errors.name} className={`bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 rounded-xl h-11 text-sm min-w-0 w-full ${errors.name ? "!border-destructive" : ""}`} required />
              {errors.name && <p className="text-[11px] text-primary-foreground bg-destructive/80 rounded-md px-2 py-0.5 mt-1">{errors.name}</p>}
            </div>
            <div className="min-w-0">
              <Input value={formData.email} onChange={e => update("email", e.target.value)} placeholder="Email *" type="email" aria-invalid={!!errors.email} className={`bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 rounded-xl h-11 text-sm min-w-0 w-full ${errors.email ? "!border-destructive" : ""}`} required />
              {errors.email && <p className="text-[11px] text-primary-foreground bg-destructive/80 rounded-md px-2 py-0.5 mt-1">{errors.email}</p>}
            </div>
            {/* Row 2: Mobile (+ OTP) and Course */}
            <div className="flex items-stretch gap-2">
              <Input value={formData.phone} onChange={e => update("phone", sanitizeIndianMobile(e.target.value))} placeholder="Phone *" type="tel" maxLength={15} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 rounded-xl h-11 text-sm min-w-0 flex-1" required />
              <div className="[&_button]:!bg-card [&_button]:!text-foreground [&_button]:hover:!bg-card/90">
                {otp.getOtpButton}
              </div>
            </div>
            {otp.verifyBlock && (
              <div className="sm:col-span-2 bg-primary-foreground/95 rounded-xl p-2">
                {otp.verifyBlock}
              </div>
            )}
            <select value={formData.course} onChange={e => update("course", e.target.value)} className="px-3 h-11 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground text-sm focus:outline-none [&>option]:text-foreground min-w-0" required>
              <option value="">Course *</option>
              {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {formData.phone.length > 0 && !isValidIndianMobile(formData.phone) && (
              <p className="sm:col-span-2 text-xs text-primary-foreground bg-destructive/80 rounded-lg px-3 py-1.5 text-center">{PHONE_HINT}</p>
            )}
            <div className="min-w-0">
              <SearchableSelect
                options={locations?.states || []}
                value={formData.state}
                onChange={(v) => { update("state", v); update("city", ""); }}
                placeholder="State *"
              />
              {errors.state && <p className="text-[11px] text-primary-foreground bg-destructive/80 rounded-md px-2 py-0.5 mt-1">{errors.state}</p>}
            </div>
            <div className="min-w-0">
              <SearchableSelect
                options={formData.state ? (locations?.citiesByState[formData.state] || []) : []}
                value={formData.city}
                onChange={(v) => update("city", v)}
                placeholder={formData.state ? "City *" : "Select state first"}
              />
              {errors.city && <p className="text-[11px] text-primary-foreground bg-destructive/80 rounded-md px-2 py-0.5 mt-1">{errors.city}</p>}
            </div>

            <div className="sm:col-span-2 max-w-xs mx-auto w-full">
              <ProgramModeToggle value={programMode} onChange={setProgramMode} />
            </div>
            <div className="sm:col-span-2 flex justify-center">
              <Button type="submit" className="w-full sm:w-auto sm:min-w-[260px] bg-card text-foreground hover:bg-card/90 rounded-xl h-11 px-8 text-sm font-semibold whitespace-nowrap shadow-md" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Free Callback"}
              </Button>
            </div>
          </form>
        </div>
        {otpPortal}
      </motion.div>
    );
  }

  // Sidebar variant
  if (variant === "sidebar") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="bg-card rounded-2xl border border-border p-4"
      >
        <div className="text-center mb-3">
          <img src={dcLogo} alt="DekhoCampus" className="w-10 h-10 object-contain mx-auto mb-2" />
          <h4 className="font-bold text-foreground text-sm">{title}</h4>
          <IITAlumniBadge className="mt-1.5" />
        </div>

        <UrgencyHooks variant="compact" className="mb-2" />

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1">
            <Input value={formData.name} onChange={e => update("name", e.target.value)} placeholder="Name *" aria-invalid={!!errors.name} className={`rounded-xl text-sm h-9 ${errors.name ? "border-destructive" : ""}`} required />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Input value={formData.email} onChange={e => update("email", e.target.value)} placeholder="Email *" type="email" aria-invalid={!!errors.email} className={`rounded-xl text-sm h-9 ${errors.email ? "border-destructive" : ""}`} required />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <div className="flex items-stretch gap-2">
              <Input value={formData.phone} onChange={e => update("phone", sanitizeIndianMobile(e.target.value))} placeholder="Phone *" type="tel" maxLength={15} className="rounded-xl text-sm h-9 flex-1" required />

              <div className="[&_button]:!h-9 [&_button]:!px-3">{otp.getOtpButton}</div>
            </div>
            {formData.phone.length > 0 && !isValidIndianMobile(formData.phone) && (
              <p className="text-[11px] text-destructive">{PHONE_HINT}</p>
            )}
            {otp.verifyBlock}
          </div>

          <div className="space-y-1">
            <select value={formData.course} onChange={e => update("course", e.target.value)} className={`${selectCls} h-9 text-xs ${errors.course ? "border-destructive" : ""}`} required>
              <option value="">Select Course *</option>
              {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.course && <p className="text-[11px] text-destructive">{errors.course}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <SearchableSelect
                options={locations?.states || []}
                value={formData.state}
                onChange={(v) => { update("state", v); update("city", ""); }}
                placeholder="State *"
              />
              {errors.state && <p className="text-[11px] text-destructive">{errors.state}</p>}
            </div>
            <div className="space-y-1">
              <SearchableSelect
                options={formData.state ? (locations?.citiesByState[formData.state] || []) : []}
                value={formData.city}
                onChange={(v) => update("city", v)}
                placeholder={formData.state ? "City *" : "Pick state"}
              />
              {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
            </div>
          </div>

          <ProgramModeToggle value={programMode} onChange={setProgramMode} compact />
          <Button type="submit" size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl h-9 text-sm" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Free Help"}
          </Button>
        </form>
        {otpPortal}
      </motion.div>
    );
  }

  // Inline variant
  return (
    <div className="bg-muted/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <IITAlumniBadge className="mt-1" />
        </div>
        <img src={dcLogo} alt="DekhoCampus" className="h-7 w-7 object-contain" />
      </div>
      <UrgencyHooks variant="compact" className="mb-3" />
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Row 1: Name + Email - stacked on mobile, side-by-side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1 min-w-0">
            <Input value={formData.name} onChange={e => update("name", e.target.value)} placeholder="Name *" aria-invalid={!!errors.name} className={`rounded-lg text-sm h-10 w-full ${errors.name ? "border-destructive" : ""}`} required />
            {errors.name && <p className="text-[11px] text-destructive truncate">{errors.name}</p>}
          </div>
          <div className="space-y-1 min-w-0">
            <Input value={formData.email} onChange={e => update("email", e.target.value)} placeholder="Email *" type="email" aria-invalid={!!errors.email} className={`rounded-lg text-sm h-10 w-full ${errors.email ? "border-destructive" : ""}`} required />
            {errors.email && <p className="text-[11px] text-destructive truncate">{errors.email}</p>}
          </div>
        </div>

        {/* Row 2: Mobile + OTP button inline (full width on mobile) */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-stretch gap-1.5 min-w-0">
            <Input value={formData.phone} onChange={e => update("phone", sanitizeIndianMobile(e.target.value))} placeholder="Mobile *" type="tel" maxLength={15} className="rounded-lg text-sm h-10 flex-1 min-w-0" required />
            <div className="[&_button]:!h-10 [&_button]:!px-3 [&_button]:!text-xs shrink-0">{otp.getOtpButton}</div>
          </div>
          {formData.phone.length > 0 && !isValidIndianMobile(formData.phone) && (
            <p className="text-[11px] text-destructive truncate">{PHONE_HINT}</p>
          )}
          {otp.verifyBlock}
        </div>

        {/* Row 3: Course */}
        <div className="space-y-1">
          <select value={formData.course} onChange={e => update("course", e.target.value)} className={`px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none h-10 w-full min-w-0 ${errors.course ? "border-destructive" : "border-border"}`} required>
            <option value="">Course *</option>
            {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.course && <p className="text-[11px] text-destructive">{errors.course}</p>}
        </div>

        {/* Row 4: State + City */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <SearchableSelect
              options={locations?.states || []}
              value={formData.state}
              onChange={(v) => { update("state", v); update("city", ""); }}
              placeholder="State *"
            />
            {errors.state && <p className="text-[11px] text-destructive">{errors.state}</p>}
          </div>
          <div className="space-y-1">
            <SearchableSelect
              options={formData.state ? (locations?.citiesByState[formData.state] || []) : []}
              value={formData.city}
              onChange={(v) => update("city", v)}
              placeholder={formData.state ? "City *" : "Select state"}
            />
            {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
          </div>
        </div>

        {/* Regular / Online toggle */}
        <ProgramModeToggle value={programMode} onChange={setProgramMode} compact />

        {/* Submit */}
        <Button type="submit" size="sm" className="w-full bg-primary text-primary-foreground rounded-lg h-10" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
        </Button>
      </form>
      {otpPortal}
    </div>
  );
}
