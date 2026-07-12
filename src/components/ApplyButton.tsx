import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, CheckCircle2, User, Mail, MessageSquare } from "lucide-react";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useStatesAndCities } from "@/hooks/useLocations";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getPrefillCookie, savePrefillCookie } from "@/components/CookieConsent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hasPrefillIdentity, isWithinSilentWindow, silentSaveLead, markLeadSubmitted } from "@/lib/leadCapture";
import { trackEvent } from "@/lib/analytics";
import { normalizeIndianMobile } from "@/lib/phone";

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>{children}</span>
);

interface ApplyButtonProps {
  collegeSlug: string;
  collegeName: string;
  courseSlug?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
  /** "lead" → open lead form (default). "link" → redirect to applyUrl. "lead_then_link" → capture lead, then redirect. */
  applyMode?: "lead" | "link" | "lead_then_link" | string | null;
  applyUrl?: string | null;
  /** Optional action to run after a successful lead submit (e.g. trigger a PDF download). */
  onSuccessAction?: () => void | Promise<void>;
  /** Optional icon override. */
  icon?: React.ReactNode;
  /** Optional override for the dialog heading (e.g. "Download Brochure"). */
  formTitle?: string;
  /** Optional override for the dialog subheading. */
  formSubtitle?: string;
  /** Optional override for the submit button label. */
  submitLabel?: string;
}

export function ApplyButton({ collegeSlug, collegeName, courseSlug = "", className = "", variant = "default", size = "default", label = "Apply Now", applyMode, applyUrl, onSuccessAction, icon, formTitle, formSubtitle, submitLabel }: ApplyButtonProps) {
  // Normalize admin-entered URLs: if no protocol, prepend https:// so the
  // browser doesn't treat "university.edu/apply" as a relative path (which
  // would 404 inside our SPA, e.g. /colleges/iit-delhi-10002/university.edu/apply).
  const normalizeUrl = (u?: string | null): string | null => {
    if (!u) return null;
    const t = u.trim();
    if (!t || t === "#") return null;
    if (/^(https?:|mailto:|tel:|\/)/i.test(t)) return t;
    return `https://${t}`;
  };
  const normalizedApplyUrl = normalizeUrl(applyUrl);

  const isLeadThenLink = applyMode === "lead_then_link" && !!normalizedApplyUrl;


  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: locations } = useStatesAndCities();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", state: "", city: "", course_interest: "", message: "",
  });
  const [collegeCourses, setCollegeCourses] = useState<string[]>([]);

  useEffect(() => {
    const c = getPrefillCookie();
    setForm((p) => ({
      name: p.name || c.name || "",
      email: p.email || c.email || "",
      phone: p.phone || c.phone || "",
      state: p.state || c.state || "",
      city: p.city || c.city || "",
      course_interest: p.course_interest,
      message: p.message,
    }));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm((p) => ({
      name: p.name || profile.name,
      email: p.email || profile.email,
      phone: p.phone || profile.phone,
      state: p.state || profile.state,
      city: p.city || profile.city,
      course_interest: p.course_interest,
      message: p.message,
    }));
  }, [profile]);

  // Load courses offered by this college (from course_fees admin entries) so the
  // form shows real choices instead of a free-text field.
  useEffect(() => {
    if (!open || !collegeSlug) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("course_fees")
        .select("course_name")
        .eq("college_slug", collegeSlug);
      if (cancelled) return;
      const names = Array.from(new Set((data || []).map((r: any) => (r.course_name || "").trim()).filter(Boolean))) as string[];
      names.sort((a, b) => a.localeCompare(b));
      setCollegeCourses(names);
    })();
    return () => { cancelled = true; };
  }, [open, collegeSlug]);

  // Keep this return after every hook. `applyMode` can change when an admin
  // edits a college, and returning before hooks violates React's hook order.
  if (applyMode === "link" && normalizedApplyUrl) {
    return (
      <a href={normalizedApplyUrl} target="_blank" rel="noopener noreferrer" className={className.includes("w-full") ? "w-full" : undefined}>
        <Button variant={variant} size={size} className={className}>
          <GraduationCap className="w-4 h-4 mr-2" /> {label}
        </Button>
      </a>
    );
  }

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // 2026 UX: never block CTA behind login. If we already know the user
  // (auth, prefill cookie, or submitted in the last 30 min), silently
  // capture this college-specific intent and run the action immediately.
  const handleClick = async () => {
    try { trackEvent("cta_click", { page: courseSlug ? "course" : "college", cta: label, college_slug: collegeSlug, course_slug: courseSlug || null, apply_mode: applyMode || "lead" }); } catch { /* noop */ }
    const knownByCookie = hasPrefillIdentity();
    const knownByRecent = isWithinSilentWindow();
    const knownByAuth = !!(user && profile?.phone);
    if (knownByAuth || knownByCookie || knownByRecent) {
      // Use prefill / profile identity
      const c = getPrefillCookie();
      const name = profile?.name || c.name || form.name || "Returning user";
      const phone = normalizeIndianMobile(profile?.phone || c.phone || form.phone || "");
      const email = profile?.email || c.email || form.email || null;
      const city = profile?.city || c.city || form.city || null;
      const state = profile?.state || c.state || form.state || null;

      if (phone.length === 10) {
        // 1. Save as a lead row tagged with this college (so college filter works)
        await silentSaveLead({
          source: isLeadThenLink ? "brochure_download_silent" : "apply_button_silent",
          cta: label,
          interested_college_slug: collegeSlug,
          interested_course_slug: courseSlug || null,
          name, email, phone, city, state,
        });
        // 2. Also insert a college_applications row (legacy table powers dashboard)
        try {
          await supabase.from("college_applications").insert({
            user_id: user?.id,
            name, email, phone, city: city || "", state: state || "",
            college_slug: collegeSlug, college_name: collegeName,
            course_slug: courseSlug, course_interest: form.course_interest || "",
            message: "", status: "submitted",
          });
        } catch { /* non-fatal */ }
        markLeadSubmitted();
        toast.success(isLeadThenLink ? "Starting your download…" : "Request saved - counselor will call you");
        if (isLeadThenLink && normalizedApplyUrl) {
          try { window.location.href = normalizedApplyUrl; } catch { window.open(normalizedApplyUrl, "_blank", "noopener,noreferrer"); }

        }
        if (onSuccessAction) { try { await onSuccessAction(); } catch (err) { console.error(err); } }
        return;
      }
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.phone.length !== 10) {
      toast.error("Please enter your name and a valid 10-digit phone");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("college_applications").insert({
        user_id: user?.id,
        name: form.name,
        email: form.email || null,
        phone: form.phone,
        city: form.city,
        state: form.state,
        college_slug: collegeSlug,
        college_name: collegeName,
        course_slug: courseSlug,
        course_interest: form.course_interest,
        message: form.message,
        status: "submitted",
      });
      if (error) throw error;
      savePrefillCookie({ name: form.name, email: form.email, phone: form.phone, state: form.state, city: form.city });
      markLeadSubmitted();
      // Also drop a tagged lead row so this college shows in admin filter
      silentSaveLead({
        source: isLeadThenLink ? "brochure_download" : "apply_button",
        cta: label,
        interested_college_slug: collegeSlug,
        interested_course_slug: courseSlug || null,
        name: form.name, email: form.email, phone: form.phone, city: form.city, state: form.state,
      });
      setSubmitted(true);
      toast.success("Details saved! 🎉");
      if (isLeadThenLink && normalizedApplyUrl) {
        // Use same-tab navigation so popup blockers don't kill the brochure download
        // after the async lead submit (window.open after await is often blocked).
        try { window.location.href = normalizedApplyUrl; } catch { window.open(normalizedApplyUrl, "_blank", "noopener,noreferrer"); }

      }
      if (onSuccessAction) {
        try { await onSuccessAction(); } catch (err) { console.error("onSuccessAction failed", err); }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  const cities = form.state ? (locations?.citiesByState[form.state] || []) : [];

  return (
    <>
      <Button onClick={handleClick} variant={variant} size={size} className={className}>
        {icon ?? <GraduationCap className="w-4 h-4 mr-2" />} {label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSubmitted(false); }}>
        <DialogContent
          className="max-w-md w-[calc(100vw-1.5rem)] p-0 gap-0 overflow-hidden sm:max-h-[85vh] max-h-[calc(100dvh-2rem)] grid grid-rows-[auto,1fr]"
          aria-describedby={undefined}
          onPointerDownOutside={(e) => { if ((e.target as HTMLElement)?.closest?.('#searchable-select-portal-active')) e.preventDefault(); }}
          onInteractOutside={(e) => { if ((e.target as HTMLElement)?.closest?.('#searchable-select-portal-active')) e.preventDefault(); }}
        >
          <VisuallyHidden><DialogTitle>{formTitle || `Apply to ${collegeName}`}</DialogTitle></VisuallyHidden>
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 text-center row-span-2">
              <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Details Saved! 🎉</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Your request for <b>{collegeName}</b> is in. Our counselor will call you within 24 hours.
              </p>
              <Button onClick={() => { setOpen(false); navigate("/dashboard"); }} className="w-full rounded-xl">
                View My Dashboard
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="bg-primary px-5 py-4 pr-12 text-primary-foreground">
                <h3 className="font-bold text-base">{formTitle || `Apply to ${collegeName}`}</h3>
                <div className="my-1"><IITAlumniBadge showTagline={false} /></div>
                <p className="text-xs text-primary-foreground/85 mt-0.5">{formSubtitle || "Helping you find the right college & course - quick form, expert guidance."}</p>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto overscroll-contain">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your Name *" className="pl-10 rounded-xl h-10" required />
                </div>
                <div className="flex items-stretch w-full min-w-0">
                  <span className="flex-shrink-0 px-3 h-10 inline-flex items-center bg-muted rounded-l-xl border border-r-0 border-border text-sm font-medium text-muted-foreground whitespace-nowrap">+91</span>
                  <Input value={form.phone} onChange={(e) => {
                    update("phone", normalizeIndianMobile(e.target.value));
                  }} placeholder="Mobile *" type="tel" maxLength={10} className="flex-1 min-w-0 rounded-l-none rounded-r-xl h-10" required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Email" type="email" className="pl-10 rounded-xl h-10" />
                </div>
                <SearchableSelect
                  options={[...collegeCourses, "Other UG Course", "Other PG Course"]}
                  value={form.course_interest}
                  onChange={(v) => update("course_interest", v)}
                  placeholder={collegeCourses.length ? "Select Course Interest" : "Course Interest (optional)"}
                />
                <div className="grid grid-cols-2 gap-2">
                  <SearchableSelect options={locations?.states || []} value={form.state} onChange={(v) => { update("state", v); update("city", ""); }} placeholder="State" />
                  <SearchableSelect options={cities} value={form.city} onChange={(v) => update("city", v)} placeholder={form.state ? "City" : "Pick state"} />
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Any questions? (optional)" className="pl-10 rounded-xl min-h-[60px] text-sm" />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl h-11 gradient-primary text-primary-foreground">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (submitLabel || "Submit")}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">By submitting you agree to be contacted by our counselors</p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
