import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Send, Loader2 } from "lucide-react";
import dcLogo from "@/assets/dc-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { IITAlumniBadge } from "@/components/IITAlumniBadge";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";

const LEAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-lead`;

export function FixedCounsellingCTA() {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeIndianMobile(phone);
    if (!name || !isValidIndianMobile(cleanPhone)) return toast.error("Please enter your name and a valid phone number");
    setIsLoading(true);
    try {
      await fetch(LEAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ name, phone: cleanPhone, source: "fixed_cta" }),
      });
      setSubmitted(true);
      toast.success("We'll call you shortly!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (dismissed || submitted) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:bottom-4 md:left-4 md:right-auto md:w-[360px]">
      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="form"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-elevated p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img src={dcLogo} alt="DekhoCampus" className="w-9 h-9 object-contain" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Free Expert Counselling</h4>
                  <div className="my-1"><IITAlumniBadge showTagline={false} /></div>
                  <p className="text-[11px] text-muted-foreground">Get a callback in 30 minutes</p>
                </div>
              </div>
              <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="rounded-xl h-10 text-sm" required />
              <Input value={phone} onChange={(e) => setPhone(normalizeIndianMobile(e.target.value))} placeholder="Phone Number" type="tel" className="rounded-xl h-10 text-sm" required />
              <Button type="submit" className="w-full gradient-primary btn-glow rounded-xl h-10 text-sm" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get Free Counselling <Send className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.button
            key="bar"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            onClick={() => setExpanded(true)}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3.5 gradient-primary text-primary-foreground font-semibold text-sm rounded-t-2xl md:rounded-2xl shadow-glow hover:shadow-lg transition-shadow"
          >
            <Phone className="w-4 h-4" />
            Get Expert College Counselling - Free
            <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
