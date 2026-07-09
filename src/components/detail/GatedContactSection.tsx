import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Mail, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { useAuth } from "@/hooks/useAuth";

interface Contact { address: string; phone: string; email: string; website: string; map_embed: string; }
const STORAGE_PREFIX = "contact_unlocked_";

/** Contact section with blur overlay until the user submits a lead form. */
export function GatedContactSection({ collegeSlug, collegeName }: { collegeSlug: string; collegeName?: string }) {
  const { user } = useAuth();
  const [c, setC] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(STORAGE_PREFIX + collegeSlug);
  });

  useEffect(() => {
    (supabase as any).from("college_contacts").select("*").eq("college_slug", collegeSlug).maybeSingle().then(({ data }: any) => setC(data));
  }, [collegeSlug]);

  useEffect(() => { if (user) setUnlocked(true); }, [user]);
  if (!c) return null;

  const handleUnlock = () => {
    localStorage.setItem(STORAGE_PREFIX + collegeSlug, "1");
    setUnlocked(true);
    setOpen(false);
  };

  return (
    <section id="contact" className="bg-card rounded-2xl border border-border p-5 scroll-mt-32 relative overflow-hidden">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Contact Details</h2>
      <div className={`space-y-2 text-sm transition-all ${unlocked ? "" : "blur-md select-none pointer-events-none"}`}>
        {c.address && <div className="flex gap-2 text-muted-foreground"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /> {c.address}</div>}
        {c.phone && <div className="flex gap-2 text-muted-foreground"><Phone className="w-4 h-4 mt-0.5 flex-shrink-0" /> <a href={`tel:${c.phone}`} className="hover:text-primary">{c.phone}</a></div>}
        {c.email && <div className="flex gap-2 text-muted-foreground"><Mail className="w-4 h-4 mt-0.5 flex-shrink-0" /> <a href={`mailto:${c.email}`} className="hover:text-primary">{c.email}</a></div>}
        {c.website && <div className="flex gap-2 text-muted-foreground"><Globe className="w-4 h-4 mt-0.5 flex-shrink-0" /> <a href={c.website} target="_blank" rel="noopener" className="hover:text-primary">{c.website}</a></div>}
        {c.map_embed && <iframe src={c.map_embed} className="w-full h-64 rounded-xl border-0 mt-3" loading="lazy" />}
      </div>

      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
          <div className="text-center bg-card border border-border rounded-2xl p-5 shadow-xl max-w-sm">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Contact details are locked</h3>
            <p className="text-xs text-muted-foreground mb-3">Share your details to view phone, email & address.</p>
            <Button onClick={() => setOpen(true)} className="w-full">Open Contact Details</Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md mx-auto p-0 gap-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="text-base">Get contact details for {collegeName || "this college"}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {/* Use the full vertical "card" form (with state/city, course, +91, etc.)
                instead of the cramped single-row inline strip. */}
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
