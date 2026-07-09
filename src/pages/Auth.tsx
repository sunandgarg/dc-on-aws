import { useState, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { ArrowRight, Loader2, ShieldCheck, Sparkles, GraduationCap, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import dcLogo from "@/assets/dc-logo.png";
import { normalizeIndianMobile } from "@/lib/phone";

const TEST_OTP = "123456";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveSentOtp(phone: string, code: string) {
  try { sessionStorage.setItem(`dc_otp_${phone}`, JSON.stringify({ code, ts: Date.now() })); } catch { /* ignore */ }
}
function readSentOtp(phone: string): string {
  try {
    const raw = sessionStorage.getItem(`dc_otp_${phone}`);
    if (!raw) return "";
    const { code, ts } = JSON.parse(raw);
    if (!code || Date.now() - ts > OTP_TTL_MS) {
      sessionStorage.removeItem(`dc_otp_${phone}`);
      return "";
    }
    return String(code);
  } catch { return ""; }
}

export default function Auth() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [step, setStep] = useState<"input" | "otp">("input");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const sentOtpRef = useRef("");

  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  if (!isLoading && user) {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect") || (location.state as any)?.from?.pathname || "/dashboard";
    return <Navigate to={redirect} replace />;
  }

  const cleanPhone = () => normalizeIndianMobile(phone);
  const syntheticEmail = () => `phone${cleanPhone()}@dekhocampus.local`;
  const syntheticPassword = () => `dc!${cleanPhone()}!secure2026`;

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (cleanPhone().length !== 10) {
      toast({ title: "Invalid number", description: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Generate locally + persist so verification works even if the gateway
      // verification API is delayed, but wait for SMS delivery confirmation.
      const code = generateOtp();
      sentOtpRef.current = code;
      const phoneDigits = cleanPhone();
      saveSentOtp(phoneDigits, code);

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          phone: `+91${phoneDigits}`,
          otp: code,
          channel: "sms",
          action: "send",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success || body.skipped) {
        throw new Error(body.error || "SMS gateway did not confirm delivery. Please try again.");
      }

      toast({ title: "OTP Sent", description: `SMS sent to +91 ${phoneDigits}` });
      setStep("otp");
      setTimer(30);
    } catch (err: any) {
      toast({ title: "OTP failed", description: err?.message || "Could not send OTP. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    try {
      // Accept master test OTP OR provider-verified OTP.
      const stored = readSentOtp(cleanPhone());
      let verified = otp === TEST_OTP || (sentOtpRef.current.length === 6 && otp === sentOtpRef.current) || (stored.length === 6 && otp === stored);
      if (!verified) {
        try {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ phone: `+91${cleanPhone()}`, otp, channel: "sms", action: "verify" }),
          });
          const body = await res.json().catch(() => ({}));
          verified = !!(res.ok && body.verified);
        } catch { /* fallthrough */ }
      }
      if (!verified) {
        toast({ title: "Invalid OTP", description: "Please check the code and try again.", variant: "destructive" });
        return;
      }

      const email = syntheticEmail();
      const password = syntheticPassword();
      // Try sign-up first (idempotent if exists)
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { phone: cleanPhone(), display_name: cleanPhone() },
        },
      });
      // If signup failed because user exists OR succeeded - sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        // If signup also genuinely failed (network etc.), surface that
        if (signUpErr && !/already|registered|exists/i.test(signUpErr.message)) {
          throw signUpErr;
        }
        throw signInErr;
      }
      toast({ title: "Welcome! 🎉", description: "Signed in successfully." });
    } catch (err: any) {
      console.error("Auth error:", err);
      toast({
        title: "Login Failed",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) {
        toast({ title: "Google Sign-in Failed", description: result.error.message || "Try again", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Google Sign-in Failed", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* LEFT - value prop */}
          <div className="hidden lg:block space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> India's #1 Career Counselling Platform
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight text-foreground">
              Your dream college is <span className="text-primary">just one login</span> away
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Get personalised counselling, apply to colleges in 1 click, track applications, and unlock exclusive scholarship offers - all in one place.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { icon: GraduationCap, n: "10,000+", l: "Colleges" },
                { icon: Users, n: "5L+", l: "Students" },
                { icon: Trophy, n: "₹50Cr+", l: "Scholarships" },
              ].map((s) => (
                <div key={s.l} className="bg-card border border-border rounded-2xl p-4 text-center">
                  <s.icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                  <div className="font-bold text-foreground text-lg">{s.n}</div>
                  <div className="text-[11px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>


          {/* RIGHT - form */}
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-6">
              <img src={dcLogo} alt="DekhoCampus" className="h-12 object-contain mx-auto mb-3" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {step === "input" ? "Welcome back" : "Verify OTP"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "input"
                  ? "Login or signup to apply, save & track"
                  : `Enter the 6-digit code for +91 ${phone}`}
              </p>
            </div>

            <div className="bg-card rounded-3xl border border-border p-6 md:p-7 shadow-2xl shadow-primary/5 min-h-[440px]">
              {step === "input" ? (
                <div key="input">
                    {/* Google button */}
                    <Button
                      type="button"
                      onClick={handleGoogle}
                      disabled={googleLoading}
                      variant="outline"
                      className="w-full h-12 rounded-xl text-base font-semibold border-2 hover:bg-muted/50"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <span className="flex items-center justify-center gap-3">
                          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.3 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
                          Continue with Google
                        </span>
                      )}
                    </Button>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                        <span className="bg-card px-3 text-muted-foreground font-semibold">or with mobile</span>
                      </div>
                    </div>

                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Mobile Number</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r border-border pr-2.5 z-10 pointer-events-none">
                            <span className="text-sm font-medium text-foreground">+91</span>
                          </div>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            value={phone}
                            onChange={(e) => setPhone(normalizeIndianMobile(e.target.value))}
                            placeholder="9876543210"
                            className="pl-16 h-12 rounded-xl text-base"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full rounded-xl gradient-primary text-primary-foreground h-12 text-base font-semibold shadow-lg shadow-primary/20"
                        disabled={loading || phone.length < 10}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <span className="flex items-center gap-2">Get OTP <ArrowRight className="w-5 h-5" /></span>
                        )}
                      </Button>

                      <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                        By continuing, you agree to our <a href="/legal/terms" className="text-primary hover:underline">Terms</a> &{" "}
                        <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>
                      </p>
                    </form>
                </div>
              ) : (
                <form
                  key="otp"
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                    <div className="space-y-2 text-center">
                      <Label className="text-sm font-medium">Verification Code</Label>
                      <div className="flex justify-center mt-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          className="h-14 text-center text-3xl font-bold tracking-[0.5em] rounded-xl max-w-[220px]"
                          placeholder="••••••"
                          autoFocus
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full rounded-xl gradient-primary text-primary-foreground h-12 text-base font-semibold shadow-lg shadow-primary/20"
                      disabled={loading || otp.length < 6}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={timer > 0 || loading}
                        className="text-sm font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                      >
                        {timer > 0 ? `Resend code in ${timer}s` : "Resend verification code"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setStep("input"); setOtp(""); }}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Change number
                    </button>
                    <div className="pt-4 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-4 h-4" /> 100% Secure & Private
                    </div>
                </form>
              )}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
