import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { trackLeadConversion, trackEvent } from "@/lib/analytics";
import { X } from "lucide-react";
import { hasPrefillIdentity, isWithinSilentWindow, silentSaveLead } from "@/lib/leadCapture";
import { getPrefillCookie } from "@/components/CookieConsent";

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>{children}</span>
);

interface LeadGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  source?: string;
  onSuccess?: () => void;
  /** When true, always show the lead form even if the user is already known (skips silent save). Use for high-intent CTAs like Apply / Brochure where we need fresh program-specific intent. */
  forceShow?: boolean;
  /** Strip counselling/slots urgency for clean Apply/Brochure forms. */
  simple?: boolean;
}



export function LeadGateDialog({
  open,
  onOpenChange,
  title = "🎯 Apply Now - Get Free Counseling!",
  subtitle = "Fill the form & get ₹999 counselling session FREE!",
  source = "lead_gate",
  onSuccess,
  forceShow = false,
  simple = false,
}: LeadGateDialogProps) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const silentRef = useRef(false);
  const lastOpenRef = useRef(false);
  const successRef = useRef(false);

  // Fire open/dismiss analytics whenever this dialog is shown anywhere on the site.
  useEffect(() => {
    if (open && !lastOpenRef.current) {
      lastOpenRef.current = true;
      successRef.current = false;
      trackEvent("lp_popup_open", { source });
    } else if (!open && lastOpenRef.current) {
      lastOpenRef.current = false;
      if (!successRef.current) trackEvent("lp_popup_dismiss", { source });
    }
  }, [open, source]);

  const handleSuccess = () => {
    successRef.current = true;
    trackEvent("lp_popup_submit", { source });
    onSuccess?.();
  };

  // UI/UX 2026: if user is already known (logged-in OR has prefill cookie OR
  // submitted a lead in the last 30 minutes), never show the form again.
  // Save the lead silently in the background and continue.
  useEffect(() => {
    if (!open) { silentRef.current = false; return; }
    if (forceShow) return; // high-intent: always show the form
    const knownByAuth = !!(user && profile?.phone);
    const knownByCookie = hasPrefillIdentity();
    const knownByRecent = isWithinSilentWindow();
    if (!knownByAuth && !knownByCookie && !knownByRecent) return;
    if (silentRef.current) return;
    silentRef.current = true;

    (async () => {
      try {
        const c = getPrefillCookie();
        await silentSaveLead({
          source: `${source}_silent`,
          cta: source,
          name: knownByAuth ? (profile?.name || user?.user_metadata?.display_name || c.name || "Returning user") : c.name,
          email: knownByAuth ? (profile?.email ?? null) : (c.email ?? null),
          phone: knownByAuth ? (profile?.phone || c.phone) : c.phone,
          city: knownByAuth ? (profile?.city ?? null) : (c.city ?? null),
          state: knownByAuth ? (profile?.state ?? null) : (c.state ?? null),
        });
        trackLeadConversion({ source: `${source}_silent`, silent: true });
      } catch {/* ignore - UX must not block */}
      onSuccess?.();
      onOpenChange(false);
    })();
  }, [open, user, profile, source, onOpenChange, onSuccess, forceShow]);

  // Don't render the dialog at all for already-known users (silent save above) - unless forceShow.
  if (!forceShow && open && (
    (user && profile?.phone) || hasPrefillIdentity() || isWithinSilentWindow()
  )) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] sm:w-full max-w-md mx-auto p-0 gap-0 rounded-2xl border-0 bg-transparent shadow-none overflow-visible"
        aria-describedby={undefined}
        onPointerDownOutside={(e) => { if ((e.target as HTMLElement)?.closest?.('#searchable-select-portal-active')) e.preventDefault(); }}
        onInteractOutside={(e) => { if ((e.target as HTMLElement)?.closest?.('#searchable-select-portal-active')) e.preventDefault(); }}
      >
        <VisuallyHidden><DialogTitle>Lead Form</DialogTitle></VisuallyHidden>
        <DialogClose className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-sm transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <LeadCaptureForm
          variant="card"
          title={title}
          subtitle={subtitle}
          source={source}
          onSuccess={handleSuccess}
          simple={simple}
        />
      </DialogContent>
    </Dialog>
  );
}
