import { type ElementType, type ReactNode, useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Megaphone, Star, Users, GraduationCap, BookOpen, FileText, HelpCircle, Newspaper, Lightbulb, Image, Handshake, Bot, Phone, Database, Scale, Map, Briefcase, ClipboardList, UserCircle, UserCheck, Building2, Award, Sparkles, MapPin, IndianRupee, Library, BarChart3, ChevronDown, Settings, FolderTree, RefreshCw, Network, ExternalLink, Home, Search, Menu, X, Rocket, PanelTop, DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Module } from "@/lib/rbac";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CleanDataShortcut } from "@/components/admin/CleanDataShortcut";

interface NavItem { label: string; href: string; icon: ElementType; module?: Module; }
interface NavGroup { label: string; description: string; icon: ElementType; items: NavItem[]; }

const groups: NavGroup[] = [
  {
    label: "Workspace",
    description: "Daily operations",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "All Leads", href: "/admin/leads", icon: Users, module: "leads" },
      { label: "Applications", href: "/admin/applications", icon: ClipboardList, module: "applications" },
      { label: "Users & Roles", href: "/admin/users", icon: UserCircle, module: "users" },
      { label: "Reviews Moderation", href: "/admin/reviews", icon: Star },
      { label: "Referrals", href: "/admin/referrals", icon: Star, module: "referrals" },
      { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
      { label: "Vacancy Applications", href: "/admin/vacancy-applications", icon: ClipboardList },
    ],
  },
  {
    label: "CRM & Growth",
    description: "Leads and conversion",
    icon: Rocket,
    items: [
      { label: "Lead Intelligence", href: "/admin/lead-intelligence", icon: Sparkles },
      { label: "Intent Analytics", href: "/admin/lead-intelligence/analytics", icon: BarChart3 },
      { label: "Intent Configuration", href: "/admin/lead-intelligence/config", icon: Settings },
      { label: "Lead Push Flow", href: "/admin/lead-push", icon: Network },
      { label: "Marketing Automation", href: "/admin/marketing-automation", icon: Megaphone },
      { label: "User Analytics", href: "/admin/user-analytics", icon: BarChart3 },
      { label: "Conversion Funnel", href: "/admin/funnel", icon: BarChart3 },
      { label: "Heatmap", href: "/admin/heatmap", icon: BarChart3 },
      { label: "Popup Analytics", href: "/admin/popup-analytics", icon: BarChart3 },
      { label: "CTA Conversions", href: "/admin/cta-conversions", icon: BarChart3 },
    ],
  },
  {
    label: "Content Library",
    description: "Publish and organise",
    icon: FolderTree,
    items: [
      { label: "Colleges", href: "/admin/colleges", icon: GraduationCap, module: "colleges" },
      { label: "Courses", href: "/admin/courses", icon: BookOpen, module: "courses" },
      { label: "Exams", href: "/admin/exams", icon: FileText, module: "exams" },
      { label: "Clean Data", href: "/admin/clean-data", icon: DatabaseZap, module: "content" },
      { label: "Articles", href: "/admin/articles", icon: Newspaper, module: "articles" },
      { label: "Article Tags", href: "/admin/tags", icon: Sparkles, module: "articles" },
      { label: "Article Categories", href: "/admin/article-categories", icon: Sparkles, module: "articles" },
      { label: "Authors / Team", href: "/admin/authors", icon: UserCheck, module: "users" },
      { label: "Scholarships", href: "/admin/scholarships", icon: Award },
      { label: "Careers", href: "/admin/careers", icon: Briefcase, module: "careers" },
      { label: "Vacancies", href: "/admin/vacancies", icon: Briefcase },
      { label: "Study Material", href: "/admin/study-material", icon: Library, module: "study_material" },
      { label: "College Study Material", href: "/admin/college-study", icon: Library, module: "study_material" },
      { label: "Board Toppers", href: "/admin/toppers", icon: Award, module: "study_material" },
      { label: "Board Quick Links", href: "/admin/board-links", icon: FileText, module: "study_material" },
    ],
  },
  {
    label: "CAT Universe",
    description: "MBA tools and resources",
    icon: Sparkles,
    items: [
      { label: "Dashboard", href: "/admin/cat-universe", icon: Sparkles, module: "cat_universe" },
      { label: "Sections", href: "/admin/cat-universe/sections", icon: Sparkles, module: "cat_universe" },
      { label: "Modules", href: "/admin/cat-universe/modules", icon: Sparkles, module: "cat_universe" },
      { label: "Resources", href: "/admin/cat-universe/resources", icon: Library, module: "cat_universe" },
      { label: "Cut-offs", href: "/admin/cat-universe/cutoffs", icon: BarChart3, module: "cat_universe" },
    ],
  },
  {
    label: "College Data",
    description: "Structured college details",
    icon: Building2,
    items: [
      { label: "Companies", href: "/admin/companies", icon: Building2, module: "companies" },
      { label: "Placements", href: "/admin/placements", icon: Award, module: "placements" },
      { label: "Faculty", href: "/admin/faculty", icon: UserCheck, module: "faculty" },
      { label: "Facilities", href: "/admin/facilities", icon: Sparkles, module: "facilities" },
      { label: "Approval Bodies", href: "/admin/approval-bodies", icon: Award, module: "colleges" },
      { label: "Stream Categories", href: "/admin/categories", icon: Award, module: "colleges" },
      { label: "College Contacts", href: "/admin/contacts", icon: MapPin, module: "contacts" },
      { label: "Course Fees", href: "/admin/course-fees", icon: IndianRupee, module: "course_fees" },
    ],
  },
  {
    label: "Website Experience",
    description: "Homepage and presentation",
    icon: PanelTop,
    items: [
      { label: "FAQs / Places", href: "/admin/content", icon: HelpCircle, module: "content" },
      { label: "Popular Programs", href: "/admin/promoted-programs", icon: Star, module: "promoted_programs" },
      { label: "Program Categories", href: "/admin/program-categories", icon: Star, module: "promoted_programs" },
      { label: "Hero Banners & Images", href: "/admin/banners", icon: Image, module: "banners" },
      { label: "Hero Background", href: "/admin/hero", icon: Image },
      { label: "Global Discovery Bar", href: "/admin/hero-categories", icon: PanelTop },
      { label: "Landing Pages", href: "/admin/landing-pages", icon: Megaphone },
      { label: "About Us", href: "/admin/about", icon: Lightbulb },
      { label: "Legal Pages", href: "/admin/legal", icon: Scale, module: "legal" },
      { label: "Partners", href: "/admin/partners", icon: Handshake, module: "partners" },
    ],
  },
  {
    label: "Revenue & Listings",
    description: "Ads and visibility",
    icon: Megaphone,
    items: [
      { label: "Ads Manager (Internal)", href: "/admin/ads", icon: Megaphone, module: "ads" },
      { label: "Listing Priority", href: "/admin/priority", icon: Star },
      { label: "Bulk Inline Edit", href: "/admin/bulk", icon: Star },
      { label: "Featured Colleges", href: "/admin/featured", icon: Star, module: "featured" },
      { label: "Google Ads", href: "/admin/adsense", icon: Megaphone, module: "ads" },
      { label: "Ad Diagnostics", href: "/admin/ads/diagnostics", icon: BarChart3, module: "ads" },
    ],
  },

  {
    label: "System",
    description: "Providers and platform",
    icon: Settings,
    items: [
      { label: "Explain System", href: "/admin/explain-system", icon: Lightbulb },
      { label: "AI Providers", href: "/admin/ai-providers", icon: Bot, module: "ai_providers" },
      { label: "OTP Providers", href: "/admin/otp-providers", icon: Phone, module: "otp_providers" },
      { label: "System Logs", href: "/admin/logs", icon: FileText },
      { label: "AI Content Reports", href: "/admin/ai-reports", icon: Star },
      { label: "Email (AWS SES)", href: "/admin/email-providers", icon: Phone, module: "otp_providers" },
      { label: "Integrations", href: "/admin/integrations", icon: BarChart3, module: "integrations" },
      { label: "Also Check Modules", href: "/admin/also-check", icon: Sparkles },
      { label: "Lead Push Legacy", href: "/admin/lead-push-legacy", icon: Network },
      { label: "Lead Push Automation", href: "/admin/lead-push/automation", icon: Network },
      { label: "Sitemap", href: "/admin/sitemap", icon: Map, module: "sitemap" },
      { label: "Project Docs", href: "/admin/docs", icon: Lightbulb, module: "docs" },
      { label: "Backup & Restore", href: "/admin/backup", icon: Database, module: "backup" },
    ],
  },
];

interface AdminLayoutProps { children: ReactNode; title: string; }

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const location = useLocation();
  const { isAdmin, canAccess, roles } = useAuth();
  const [navSearch, setNavSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Lead-Push-Only teammates see only Lead Push + All Leads (no other nav items).
  const isLeadPushOnly = !isAdmin && roles.includes("lead_push") && roles.length === 1;
  const visible = useCallback((it: NavItem) => {
    if (isLeadPushOnly) {
      return it.href === "/admin/leads" || it.href.startsWith("/admin/lead-push") || it.href === "/admin";
    }
    return !it.module || isAdmin || canAccess(it.module);
  }, [isAdmin, isLeadPushOnly, canAccess]);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: "active" });
      toast.success("Content refreshed");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const initialOpen = () => {
    const o: Record<string, boolean> = {};
    groups.forEach((g) => { o[g.label] = g.items.some((i) => location.pathname === i.href || (i.href !== "/admin" && location.pathname.startsWith(`${i.href}/`))); });
    if (!Object.values(o).some(Boolean)) o.Workspace = true;
    return o;
  };
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  const navigationGroups = useMemo(() => {
    const query = navSearch.trim().toLowerCase();
    return groups.flatMap((group) => {
      const allowed = group.items.filter(visible);
      const groupMatches = `${group.label} ${group.description}`.toLowerCase().includes(query);
      const items = query && !groupMatches
        ? allowed.filter((item) => item.label.toLowerCase().includes(query))
        : allowed;
      return items.length ? [{ ...group, items }] : [];
    });
  }, [navSearch, visible]);

  const activeHref = useMemo(() => groups
    .flatMap((group) => group.items)
    .filter(visible)
    .map((item) => item.href)
    .filter((href) => location.pathname === href || (href !== "/admin" && location.pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0], [location.pathname, visible]);

  const activeGroup = groups.find((group) => group.items.some((item) => item.href === activeHref));

  const sidebarContent = (mobile = false) => (
    <>
      <div className="border-b border-border/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20">DC</div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-foreground">Control Centre</h2>
              <p className="truncate text-[11px] text-muted-foreground">DekhoCampus administration</p>
            </div>
          </div>
          {mobile && (
            <button type="button" onClick={() => setMobileNavOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="Close admin menu">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={navSearch}
            onChange={(event) => setNavSearch(event.target.value)}
            placeholder="Find a tool..."
            aria-label="Search admin tools"
            className="h-10 w-full rounded-xl border border-border/70 bg-muted/45 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Admin navigation">
        {navigationGroups.map((group) => {
          const isOpen = navSearch.trim() ? true : open[group.label];
          const containsActive = group.items.some((item) => item.href === activeHref);
          return (
            <section key={group.label} className="rounded-2xl">
              <button
                type="button"
                onClick={() => setOpen((state) => ({ ...state, [group.label]: !state[group.label] }))}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${containsActive ? "bg-primary/[0.06] text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <group.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold uppercase tracking-[0.08em]">{group.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium normal-case tracking-normal text-muted-foreground">{group.description}</span>
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="mb-2 mt-1 space-y-0.5 pl-3">
                  {group.items.map((item) => {
                    const isActive = item.href === activeHref;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => mobile && setMobileNavOpen(false)}
                        className={`group flex min-h-9 items-center gap-2.5 rounded-xl border-l-2 px-3 py-2 text-sm font-medium transition-all ${isActive ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-transparent text-foreground/70 hover:border-primary/25 hover:bg-muted hover:text-foreground"}`}
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {!navigationGroups.length && (
          <div className="px-4 py-10 text-center">
            <Search className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No tools found</p>
            <button type="button" onClick={() => setNavSearch("")} className="mt-1 text-xs font-medium text-primary hover:underline">Clear search</button>
          </div>
        )}
      </nav>

      <div className="border-t border-border/70 p-3">
        <Link to="/" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-muted/70 text-xs font-bold text-foreground transition-colors hover:bg-muted">
          <Home className="h-4 w-4" /> View live website
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50/80">
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-border/70 bg-card lg:flex">
        {sidebarContent()}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-label="Close admin menu overlay" />
          <aside className="relative flex h-full w-[min(88vw,320px)] flex-col border-r border-border bg-card shadow-2xl">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified header (mobile + desktop) */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-3 md:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setMobileNavOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground lg:hidden" aria-label="Open admin menu">
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:block">{activeGroup?.label ?? "Admin"}</p>
              <h1 className="truncate text-sm font-extrabold text-foreground md:text-base">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" title="Back to site" className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Site</span>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 gap-1.5 rounded-lg text-xs"
              aria-label="Refresh content"
              title="Refresh all data on this page"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Badge variant="outline" className="text-[10px] hidden md:inline-flex">⌘K / Ctrl+K</Badge>
            <Badge variant="outline" className="text-[10px] md:hidden">⌘K</Badge>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <CleanDataShortcut pathname={location.pathname} />
            {children}
          </div>
        </main>
        <CommandPalette />
      </div>
    </div>
  );
}
