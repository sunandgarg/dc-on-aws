import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Mail, Globe, Lock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { useAuth } from "@/hooks/useAuth";

interface Contact {
  address: string;
  phone: string;
  email: string;
  website: string;
  map_link: string;
  map_embed: string;
}
const STORAGE_PREFIX = "contact_unlocked_";

/**
 * Compact, GenZ-style contact card. Matches the look of other detail sections
 * (no oversized iframe). Uses a single Google Maps button instead of an
 * embedded map.
 */
export function CollegeContactSection({ collegeSlug, collegeName }: { collegeSlug: string; collegeName?: string }) {
  const { user } = useAuth();
  const [c, setC] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(STORAGE_PREFIX + collegeSlug);
  });

  useEffect(() => {
    (supabase as any)
      .from("college_contacts")
      .select("*")
      .eq("college_slug", collegeSlug)
      .maybeSingle()
      .then(({ data }: any) => setC(data));
  }, [collegeSlug]);

  useEffect(() => {
    if (user) setUnlocked(true);
  }, [user]);

  if (!c) return null;

  const handleUnlock = () => {
    localStorage.setItem(STORAGE_PREFIX + collegeSlug, "1");
    setUnlocked(true);
    setOpen(false);
  };

  const mapUrl =
    c.map_link?.trim() ||
    (c.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}` : "");

  const Item = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 break-words leading-relaxed pt-1">{children}</div>
    </div>
  );

  return (
    <section
      id="contact"
      className="bg-card rounded-2xl border border-border p-5 md:p-6 scroll-mt-32 relative"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl md:text-[22px] font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> Contact
        </h2>
        {mapUrl && unlocked && (
          <a href={mapUrl} target="_blank" rel="noreferrer" data-track="contact_open_maps">
            <Button size="sm" variant="outline" className="rounded-full h-9 gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> Google Maps
            </Button>
          </a>
        )}
      </div>

      <div
        className={`grid gap-3 sm:grid-cols-2 transition-all ${
          unlocked ? "" : "blur-md select-none pointer-events-none"
        }`}
      >
        {c.address && <Item icon={MapPin}>{c.address}</Item>}
        {c.phone && (
          <Item icon={Phone}>
            <span className="text-foreground">{c.phone}</span>
          </Item>
        )}
        {c.email && (
          <Item icon={Mail}>
            <span className="text-foreground break-all">{c.email}</span>
          </Item>
        )}
        {c.website && (
          <Item icon={Globe}>
            <span className="text-foreground break-all">{c.website.replace(/^https?:\/\//, "")}</span>
          </Item>
        )}
      </div>

      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-2xl">
          <div className="text-center bg-card border border-border rounded-2xl p-5 shadow-xl max-w-sm mx-4">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2.5">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">Contact details are locked</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Share your details to view phone, email & address.
            </p>
            <Button onClick={() => setOpen(true)} size="sm" className="w-full rounded-full">
              Unlock Contact
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md mx-auto p-0 gap-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="text-base">
              Get contact details for {collegeName || "this college"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <LeadCaptureForm
              variant="card"
              title="Free Counselling"
              subtitle="We'll unlock contact details right after."
              source={`college_contact_unlock_${collegeSlug}`}
              interestedCollegeSlug={collegeSlug}
              onSuccess={handleUnlock}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
