import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, User, Sparkles, Shield, LogOut, Home, Gift, FileText, Settings, BookOpen } from "lucide-react";
import logo from "@/assets/dekhocampus-logo.png";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MegaMenu } from "@/components/MegaMenu";

const mobileNav = [
  { label: "Colleges", href: "/colleges" },
  { label: "Courses", href: "/courses" },
  { label: "Exams", href: "/exams" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Vacancies", href: "/vacancies" },
  { label: "News", href: "/news" },
  { label: "Study Material", href: "/study-material", children: [
    { label: "College Study Material", href: "/college-study-material" },
    { label: "Class 12", href: "/study-material/class-12" },
    { label: "Class 11", href: "/study-material/class-11" },
    { label: "Class 10", href: "/study-material/class-10" },
    { label: "Class 9",  href: "/study-material/class-9"  },
    { label: "Class 8",  href: "/study-material/class-8"  },
  ] },
  { label: "CAT Universe", href: "/cat-universe", children: [
    { label: "CAT Score Calculator", href: "/cat-universe/cat-score-calculator" },
    { label: "IIM Call Predictor", href: "/cat-universe/iim-call-predictor" },
    { label: "XAT Score Calculator", href: "/cat-universe/xat-score-calculator" },
    { label: "Previous Year CAT Papers", href: "/cat-universe/cat-previous-year-papers" },
    { label: "CAT College Cut-offs", href: "/cat-universe/cat-based-college-cutoffs" },
    { label: "Explore CAT Universe", href: "/cat-universe" },
  ] },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAdmin, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  // Sticky on every page (homepage too) per latest UX requirement.
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const userMenuItems = [
    { label: "Dashboard", icon: Home, href: "/dashboard" },
    { label: "My Profile", icon: User, href: "/dashboard" },
    { label: "Refer & Earn", icon: Gift, href: "/dashboard" },
    { label: "Documents", icon: FileText, href: "/dashboard" },
    { label: "Settings", icon: Settings, href: "/dashboard" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      <nav className="glass border-b border-border">
        <div className="container flex items-center justify-between h-14 md:h-16 lg:h-18">
          <Link to="/" className="flex items-center" aria-label="DekhoCampus Home">
            <img src={logo} alt="DekhoCampus" className="h-9 md:h-10" />
          </Link>

          <MegaMenu />

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="hidden md:flex gap-2 rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50">
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {initial}
                  </div>
                  <span className="text-sm font-medium text-foreground max-w-24 truncate">{displayName}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-50"
                    >
                      <div className="p-4 bg-muted/50 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-lg font-bold text-primary">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Hi, {displayName}!</p>
                            <Link
                              to="/dashboard"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="text-xs text-primary hover:underline"
                            >
                              Edit profile
                            </Link>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        {userMenuItems.map(item => (
                          <Link
                            key={item.label}
                            to={item.href}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <item.icon className="w-4 h-4 text-muted-foreground" />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-border py-2">
                        <button
                          onClick={() => { signOut(); setIsUserMenuOpen(false); }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 w-full transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" className="hidden md:flex gap-2 rounded-xl focus-ring">
                    <User className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="hidden md:flex gradient-primary btn-glow rounded-xl text-primary-foreground">
                    Get Started
                  </Button>
                </Link>
              </>
            )}

            {!user && (
              <Link to="/auth" className="lg:hidden">
                <Button variant="ghost" size="icon" className="focus-ring">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden focus-ring"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border"
            >
              <div className="container py-4 space-y-1 bg-card max-h-[80vh] overflow-y-auto">
                {mobileNav.map((item: any) => (
                  <MobileNavItem key={item.label} item={item} onNavigate={() => setIsMobileMenuOpen(false)} />
                ))}

                {user && (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    My Dashboard
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}

                <div className="pt-4 flex flex-col gap-2 border-t border-border">
                  {user ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl">
                          <User className="w-4 h-4 mr-2" />
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full gradient-primary text-primary-foreground rounded-xl">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}

function MobileNavItem({ item, onNavigate }: { item: any; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  if (!hasChildren) {
    return (
      <Link to={item.href} onClick={onNavigate}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors">
        <span>{item.label}</span>
      </Link>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors">
        <span>{item.label}</span>
        <ChevronDown className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pl-4 pb-2 space-y-1">
          <Link to={item.href} onClick={onNavigate}
            className="block px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg">
            View all →
          </Link>
          {item.children.map((c: any) => (
            <Link key={c.label} to={c.href} onClick={onNavigate}
              className="block px-4 py-2 text-sm text-foreground/80 hover:bg-secondary rounded-lg">
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
