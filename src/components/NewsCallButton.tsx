import { Phone } from "lucide-react";
import { useSiteIntegration } from "@/hooks/useSiteIntegration";

/**
 * Floating Call button - appears only on /news routes (mounted route-level).
 * Sits on the right side (mirroring WhatsApp on the left) so news readers
 * can tap-to-call counselling instantly. Number is admin-configurable via
 * site_integrations.news_call_phone.
 */
export function NewsCallButton() {
  const { data: phone } = useSiteIntegration("news_call_phone");
  const number = (phone || "919990109393").replace(/\D/g, "");
  if (!number) return null;
  return (
    <a
      href={`tel:+${number}`}
      className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95 bg-primary text-primary-foreground"
      aria-label="Call counsellor"
    >
      <Phone className="w-7 h-7" />
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background" />
      </span>
    </a>
  );
}
