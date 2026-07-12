import { useRef, useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLeadFormSettings } from "@/hooks/useLeadFormSettings";
import { isStrictIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import { MASTER_TEST_OTP, tryExchangePhoneOtpForSession } from "@/lib/phoneAuth";
import { functionUrl } from "@/lib/backendMode";

const SEND_OTP_URL = functionUrl("send-otp");
const OTP_LENGTH = 6;
const RESEND = 45;

/** Indian mobile: 10 digits, must start with 6, 7, 8, or 9. */
export const isValidIndianMobile = (phone: string) =>
  isStrictIndianMobile(phone);

export const PHONE_HINT = "Number must start with 9, 8, 7, or 6";

/**
 * Sanitize raw phone input:
 *  - strip non-digits
 *  - strip "+91" / "91" country prefix when 12+ digits
 *  - strip any leading 0(s) automatically (default 0 prefix is removed)
 *  - cap length at 10 - never drop any other digit the user typed
 */
export const sanitizeIndianMobile = (raw: string): string => {
  return normalizeIndianMobile(raw);
};

/**
 * Inline OTP block used inside lead forms.
 *  - Verification is OPTIONAL - the lead is always saved.
 *  - Exposes `getOtpButton` (place inline next to the phone input)
 *    and `verifyBlock` (render below the phone row when requested).
 */
export function useInlineOtp(phone: string, formKey: string) {
  const { data: settings } = useLeadFormSettings();
  // Default preference: try WhatsApp FIRST; the server falls back to SMS if no
  // active WhatsApp provider is configured. Admin form_overrides still win.
  // 🛑 WhatsApp temporarily disabled - force SMS only regardless of admin setting.
  const rawAdminChannel =
    (formKey && settings?.form_overrides?.[formKey]) ||
    settings?.channel_preference ||
    "sms";
  const adminChannel: "sms" | "whatsapp" = rawAdminChannel === "whatsapp" ? "sms" : "sms";
  const isTestMode = settings?.otp_mode === "test";

  const [requested, setRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastChannel, setLastChannel] = useState<"sms" | "whatsapp">("sms");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [providerManaged, setProviderManaged] = useState(false);
  const [missing, setMissing] = useState(false);
  const expectedRef = useRef<string>("");
  const normalizedPhone = sanitizeIndianMobile(phone);

  const markMissing = () => setMissing(true);
  const clearMissing = () => setMissing(false);

  const phoneOk = isValidIndianMobile(normalizedPhone);

  const tickCooldown = () => {
    setCooldown(RESEND);
    const id = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { window.clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const sendOtp = async (overrideChannel?: "sms" | "whatsapp") => {
    if (!phoneOk) {
      toast.error(PHONE_HINT);
      return;
    }
    // 🛑 WhatsApp disabled - always use SMS.
    const channelToUse: "sms" = "sms";
    setSending(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      expectedRef.current = otp;
      if (!isTestMode) {
        const res = await fetch(SEND_OTP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ phone: `+91${normalizedPhone}`, otp, channel: channelToUse, action: "send" }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success || body.skipped) throw new Error(body.error || "Failed to send OTP");
        const usesProviderVerify = Array.isArray(body.results) && body.results.some((r: { provider?: string; channel?: string }) => ["fast2sms", "msg91"].includes(String(r.provider).toLowerCase()) && r.channel === "sms");
        setProviderManaged(Boolean(usesProviderVerify));
        setLastChannel("sms");
        toast.success(`OTP sent via SMS to +91 ${normalizedPhone.slice(0, 5)}*****`);
      } else {
        setLastChannel("sms");
        toast.info(`OTP sent via SMS`);
      }
      setRequested(true);
      setVerified(false);
      tickCooldown();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not send OTP. Try again.");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (code.length !== OTP_LENGTH) {
      toast.error(`Enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    if (code === MASTER_TEST_OTP || isTestMode) {
      await tryExchangePhoneOtpForSession(normalizedPhone, code);
      setVerified(true);
      clearMissing();
      toast.success("Mobile verified ✓");
      return;
    }
    if (expectedRef.current && code === expectedRef.current) {
      await tryExchangePhoneOtpForSession(normalizedPhone, code);
      setVerified(true);
      clearMissing();
      toast.success("Mobile verified ✓");
      return;
    }
    try {
      const res = await fetch(SEND_OTP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          phone: `+91${normalizedPhone}`,
          otp: code,
          channel: lastChannel,
          action: "verify",
          ...(providerManaged ? { provider_name: "fast2sms" } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.verified) {
        await tryExchangePhoneOtpForSession(normalizedPhone, code);
        setVerified(true);
        clearMissing();
        toast.success("Mobile verified ✓");
        return;
      }
      toast.error(body.error || "Incorrect OTP");
    } catch {
      toast.error("Incorrect OTP");
    }
  };

  const getOtpButton = (
    <Button
      type="button"
      onClick={() => sendOtp()}
      disabled={sending || !phoneOk || verified || requested}
      className="flex-shrink-0 h-10 rounded-xl px-4 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
    >
      {sending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : verified ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Send className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {verified ? "Verified" : sending ? "Sending" : requested ? "OTP sent" : "Get OTP"}
      </span>
    </Button>
  );

  const verifyBlock = requested && !verified ? (
    <div
      className={`rounded-xl p-2.5 space-y-2 border-2 transition-colors ${
        missing ? "border-destructive bg-destructive/10 ring-2 ring-destructive/40" : "border-primary bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
            if (missing) clearMissing();
          }}
          placeholder={`Enter ${OTP_LENGTH}-digit OTP sent via SMS`}
          inputMode="numeric"
          className={`h-9 rounded-lg text-sm tracking-widest bg-card ${
            missing ? "border-destructive focus-visible:ring-destructive/30" : "border-primary/40 focus-visible:ring-primary/30"
          }`}
        />
        <Button
          type="button"
          size="sm"
          onClick={verify}
          disabled={code.length !== OTP_LENGTH}
          className="h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Verify
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className={`text-[11px] leading-tight ${missing ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {missing
            ? "Please verify your OTP before submitting"
            : "Sent via SMS. Valid for 10 minutes."}
        </p>
        {cooldown > 0 ? (
          <span className="text-[11px] text-muted-foreground">Resend options in {cooldown}s</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => sendOtp("sms")}
              disabled={sending}
              className="h-7 px-2.5 text-[11px] rounded-md border-primary/40 text-primary hover:bg-primary/10"
            >
              Resend SMS
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : null;


  // Back-compat: some forms still render {otp.block}. Keep it null so layouts
  // don't break, but new code should use getOtpButton + verifyBlock.
  const block = verifyBlock;

  return { block, getOtpButton, verifyBlock, verified, requested, markMissing, clearMissing, missing };
}
