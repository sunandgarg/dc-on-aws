import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Menu, X, ChevronRight, Newspaper, Wrench, Globe, Laptop, Phone, Search, Bot } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Explore", href: "/colleges" },
  { icon: Bot, label: "AI Help", href: "#ai" },
  { icon: Menu, label: "More", href: "#more" },
];

const moreLinks = [
  { icon: Newspaper, label: "News & Articles", href: "/articles" },
  { icon: Wrench, label: "Tools & Calculators", href: "/tools" },
  { icon: Globe, label: "Study Abroad", href: "#" },
  { icon: Laptop, label: "Online Degrees", href: "#" },
  { icon: Phone, label: "Free Counselling", href: "#counselling" },
];

export function HomeMobileBottomNav() {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const [showCounselling, setShowCounselling] = useState(false);

  const handleNavClick = (href: string) => {
    if (href === "#more") {
      setShowMore(true);
      return;
    }
    if (href === "#counselling") {
      setShowCounselling(true);
      setShowMore(false);
      return;
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t border-border">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href) && item.href !== "#more" && item.href !== "#ai";
            const isMore = item.href === "#more";
            const isAI = item.href === "#ai";

            if (isMore) {
              return (
                <button
                  key={item.label}
                  onClick={() => setShowMore(true)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors text-muted-foreground"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            if (isAI) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    // Trigger floating bot
                    const botBtn = document.querySelector('[aria-label="Talk to AI Counselor"]') as HTMLButtonElement;
                    if (botBtn) botBtn.click();
                  }}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors text-primary"
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" />
                    <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-accent text-[7px] text-accent-foreground font-bold flex items-center justify-center">AI</span>
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <motion.div layoutId="bottomNavIndicator" className="w-4 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <Dialog open={showMore} onOpenChange={setShowMore}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Quick Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {moreLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href === "#counselling" ? "#" : link.href}
                onClick={(e) => {
                  if (link.href === "#counselling") {
                    e.preventDefault();
                    handleNavClick(link.href);
                  } else {
                    setShowMore(false);
                  }
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <link.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">{link.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCounselling} onOpenChange={setShowCounselling}>
        <DialogContent className="max-w-md mx-auto p-1">
          <LeadCaptureForm
            variant="card"
            title="Get Free Expert Counselling"
            subtitle="Our experts will call you within 30 minutes"
            source="mobile_bottom_nav_counselling"
          />
        </DialogContent>
      </Dialog>

      <div className="h-14 lg:hidden" />
    </>
  );
}
