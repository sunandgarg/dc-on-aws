import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, FileDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useStatesAndCities } from "@/hooks/useLocations";
import { useLeadFormSettings } from "@/hooks/useLeadFormSettings";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getPrefillCookie, savePrefillCookie } from "@/components/CookieConsent";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";
import { normalizeIndianMobile } from "@/lib/phone";
import { tryExchangePhoneOtpForSession } from "@/lib/phoneAuth";

const LEAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-lead`;
const OTP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-otp`;

// NOTE: Free-skip bypass intentionally removed. Every download MUST pass through OTP.
// Do NOT reintroduce a "first one free" pattern - project rule.

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  source: string; // e.g. "study_pyq_class10_cbse_math_2024"
  meta?: Record<string, any>;
  onDownloaded?: () => void;
}

export function DownloadGate({ open, onOpenChange, fileUrl, fileName, source, meta, onDownloaded }: Props) {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", class: "", state: "", city: "" });
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { data: locations } = useStatesAndCities();
  const { data: profile } = useUserProfile();
  const { data: leadSettings } = useLeadFormSettings();
  const otpChannel = leadSettings?.form_overrides?.study_material_download || leadSettings?.channel_preference || "sms";

  // Prefill from profile + cookie when dialog opens
  useEffect(() => {
    if (!open) return;
    const cookie = getPrefillCookie();
    setForm(f => ({
      name: f.name || profile?.name || cookie.name || "",
      phone: f.phone || normalizeIndianMobile(profile?.phone || cookie.phone || ""),
      email: f.email || profile?.email || cookie.email || "",
      class: f.class || cookie.className || "",
      state: f.state || profile?.state || cookie.state || "",
      city: f.city || profile?.city || cookie.city || "",
    }));
  }, [open, profile?.name, profile?.phone, profile?.email, profile?.state, profile?.city]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const triggerDownload = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
    onDownloaded?.();
    onOpenChange(false);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.phone.length !== 10 || !form.state || !form.city) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    savePrefillCookie({ name: form.name, phone: form.phone, email: form.email, state: form.state, city: form.city, className: form.class });
    try {
      const res = await fetch(OTP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ phone: form.phone, action: "send", channel: otpChannel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to send OTP");
      setOtpToken(json.token);
      if (json.otp) setSentOtp(json.otp); // dev mode (no provider configured)
      toast.success(json.sent ? "OTP sent to your mobile" : "OTP generated (dev mode)");
      setResendCooldown(30);
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const resendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(OTP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ phone: form.phone, action: "resend", channel: otpChannel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to resend OTP");
      toast.success("OTP resent to your mobile");
      setResendCooldown(30);
    } catch (err: any) {
      toast.error(err.message || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    if (!otpToken) { toast.error("Please request OTP again"); setStep("form"); return; }
    setLoading(true);
    try {
      const res = await fetch(OTP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ phone: form.phone, otp, token: otpToken, action: "verify", channel: otpChannel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || "Invalid OTP");
      await tryExchangePhoneOtpForSession(form.phone, otp);

      // Save lead with otp_verified=true
      await fetch(LEAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          state: form.state,
          city: form.city,
          current_situation: form.class || "Class 8-12",
          source,
          otp_verified: true,
          initial_query: meta ? JSON.stringify(meta) : `Downloaded: ${fileName}`,
        }),
      }).catch(() => {});

      // Increment download count (best effort)
      if (meta?.resource_id) {
        supabase.rpc as any; // noop placeholder
      }

      toast.success("Verified! Starting download…");
      triggerDownload();
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-visible"
        onPointerDownOutside={(e) => { if ((e.target as HTMLElement)?.closest?.('#searchable-select-portal-active')) e.preventDefault(); }}
        onInteractOutside={(e) => { if ((e.target as HTMLElement)?.closest?.('#searchable-select-portal-active')) e.preventDefault(); }}
      >
        <div className="bg-primary text-primary-foreground p-4 rounded-t-lg">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileDown className="w-5 h-5" /> Unlock Free Download
          </DialogTitle>
          <div className="my-1"><IITAlumniBadge showTagline={false} /></div>
          <p className="text-[11px] text-primary-foreground/85">Helping students access free study material instantly.</p>
        </div>

        {step === "form" ? (
          <form onSubmit={submitForm} className="p-4 space-y-2.5">
            <Input placeholder="Your Name *" value={form.name} onChange={e => set("name", e.target.value)} required className="rounded-xl h-10" />
            <div className="flex items-center gap-0">
              <span className="px-3 py-2.5 bg-muted rounded-l-xl border border-r-0 border-border text-sm text-muted-foreground font-medium">+91</span>
              <Input
                placeholder="10-digit Mobile *"
                value={form.phone}
                onChange={e => {
                  set("phone", normalizeIndianMobile(e.target.value));
                }}
                maxLength={15}
                type="tel"
                required
                className="rounded-l-none rounded-r-xl h-10"
              />
            </div>
            <Input placeholder="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} className="rounded-xl h-10" />
            <select value={form.class} onChange={e => set("class", e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm h-10">
              <option value="">Your Class</option>
              {[8, 9, 10, 11, 12].map(c => <option key={c} value={`Class ${c}`}>Class {c}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <SearchableSelect options={locations?.states || []} value={form.state} onChange={v => { set("state", v); set("city", ""); }} placeholder="State *" />
              <SearchableSelect options={form.state ? (locations?.citiesByState[form.state] || []) : []} value={form.city} onChange={v => set("city", v)} placeholder={form.state ? "City *" : "Pick state"} />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-xl h-10 bg-primary text-primary-foreground">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending OTP…</> : <>Send OTP & Continue</>}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">By continuing you agree to our T&C and authorize calls/SMS.</p>
          </form>
        ) : (
          <form onSubmit={verifyAndDownload} className="p-4 space-y-3">
            <div className="text-center">
              <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-1" />
              <p className="text-sm font-semibold">Enter the 6-digit OTP</p>
              <p className="text-xs text-muted-foreground">Sent to +91 {form.phone}</p>
              {sentOtp && <p className="text-[10px] text-amber-600 mt-1">Dev OTP: {sentOtp}</p>}
            </div>
            <Input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="------" inputMode="numeric" maxLength={6} className="text-center tracking-[0.5em] text-lg h-12 rounded-xl" />
            <Button type="submit" disabled={loading} className="w-full rounded-xl h-10 bg-primary text-primary-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Download"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setStep("form")} className="text-muted-foreground hover:text-foreground">
                ← Change number
              </button>
              <button type="button" onClick={resendOtp} disabled={loading || resendCooldown > 0} className="inline-flex items-center gap-1 text-primary font-medium disabled:text-muted-foreground">
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
