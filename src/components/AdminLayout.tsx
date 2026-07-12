import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Megaphone, Star, Users, ChevronLeft, GraduationCap, BookOpen, FileText, HelpCircle, Newspaper, Lightbulb, Image, Handshake, Bot, Phone, Database, Scale, Map, Briefcase, ClipboardList, UserCircle, UserCheck, Building2, Award, Sparkles, MapPin, IndianRupee, Library, BarChart3, ChevronDown, Settings, FolderTree, RefreshCw, Network, ExternalLink, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Module } from "@/lib/rbac";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface NavItem { label: string; href: string; icon: any; module?: Module; }
interface NavGroup { label: string; icon: any; items: NavItem[]; }

const groups: NavGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Users & Roles", href: "/admin/users", icon: UserCircle, module: "users" },
      { label: "All Leads", href: "/admin/leads", icon: Users, module: "leads" },
      { label: "Lead Intelligence", href: "/admin/lead-intelligence", icon: Sparkles },
      { label: "Intent Analytics", href: "/admin/lead-intelligence/analytics", icon: BarChart3 },
      { label: "Intent Config", href: "/admin/lead-intelligence/config", icon: Settings },
      { label: "Lead Push Flow", href: "/admin/lead-push", icon: Network },
      { label: "Marketing Automation", href: "/admin/marketing-automation", icon: Megaphone },
      { label: "User Analytics", href: "/admin/user-analytics", icon: BarChart3 },
      { label: "Funnel", href: "/admin/funnel", icon: BarChart3 },
      { label: "Heatmap", href: "/admin/heatmap", icon: BarChart3 },
      { label: "Applications", href: "/admin/applications", icon: ClipboardList, module: "applications" },
      { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
      { label: "Reviews Moderation", href: "/admin/reviews", icon: Star },
      { label: "AI Content Reports", href: "/admin/ai-reports", icon: Star },
      { label: "Referrals", href: "/admin/referrals", icon: Star, module: "referrals" },
    ],
  },
  {
    label: "Content",
    icon: FolderTree,
    items: [
      { label: "Authors / Team", href: "/admin/authors", icon: UserCheck, module: "users" },
      { label: "Colleges", href: "/admin/colleges", icon: GraduationCap, module: "colleges" },
      { label: "Courses", href: "/admin/courses", icon: BookOpen, module: "courses" },
      { label: "Exams", href: "/admin/exams", icon: FileText, module: "exams" },
      { label: "Articles", href: "/admin/articles", icon: Newspaper, module: "articles" },
      { label: "Article Tags", href: "/admin/tags", icon: Sparkles, module: "articles" },
      { label: "Article Categories", href: "/admin/article-categories", icon: Sparkles, module: "articles" },
      { label: "Scholarships", href: "/admin/scholarships", icon: Award },
      { label: "Careers", href: "/admin/careers", icon: Briefcase, module: "careers" },
      { label: "Vacancies", href: "/admin/vacancies", icon: Briefcase },
      { label: "Vacancy Applications", href: "/admin/vacancy-applications", icon: Briefcase },
      { label: "Study Material", href: "/admin/study-material", icon: Library, module: "study_material" },
      { label: "College Study Material", href: "/admin/college-study", icon: Library, module: "study_material" },
      { label: "Board Toppers", href: "/admin/toppers", icon: Award, module: "study_material" },
      { label: "Board Quick Links", href: "/admin/board-links", icon: FileText, module: "study_material" },
      { label: "FAQs / Places", href: "/admin/content", icon: HelpCircle, module: "content" },
      { label: "Popular Programs", href: "/admin/promoted-programs", icon: Star, module: "promoted_programs" },
      { label: "Popular Program Category", href: "/admin/program-categories", icon: Star, module: "promoted_programs" },
      { label: "Legal Pages", href: "/admin/legal", icon: Scale, module: "legal" },
      { label: "About Us", href: "/admin/about", icon: Lightbulb },
      { label: "Hero Banners & Images", href: "/admin/banners", icon: Image, module: "banners" },
      { label: "Hero / Search Background", href: "/admin/hero", icon: Image },
      { label: "Hero Bar Categories", href: "/admin/hero-categories", icon: Image },
    ],
  },
  {
    label: "CAT Universe",
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
    label: "Marketing",
    icon: Megaphone,
    items: [
      { label: "Ads Manager (Internal)", href: "/admin/ads", icon: Megaphone, module: "ads" },
      { label: "Listing Priority", href: "/admin/priority", icon: Star },
      { label: "Bulk Inline Edit", href: "/admin/bulk", icon: Star },
      { label: "Featured Colleges", href: "/admin/featured", icon: Star, module: "featured" },
      { label: "Popup Analytics", href: "/admin/popup-analytics", icon: BarChart3 },
      { label: "CTA Conversions", href: "/admin/cta-conversions", icon: BarChart3 },
      { label: "Landing Pages (/lp)", href: "/admin/landing-pages", icon: Megaphone },
      { label: "Partners", href: "/admin/partners", icon: Handshake, module: "partners" },
    ],
  },
  {
    label: "Google Ads",
    icon: Megaphone,
    items: [
      { label: "Google Ads", href: "/admin/adsense", icon: Megaphone, module: "ads" },
      { label: "Ad Diagnostics", href: "/admin/ads/diagnostics", icon: BarChart3, module: "ads" },
    ],
  },

  {
    label: "System",
    icon: Settings,
    items: [
      { label: "Explain System", href: "/admin/explain-system", icon: Lightbulb },
      { label: "AI Providers", href: "/admin/ai-providers", icon: Bot, module: "ai_providers" },
      { label: "OTP Providers", href: "/admin/otp-providers", icon: Phone, module: "otp_providers" },
      { label: "System Logs", href: "/admin/logs", icon: FileText },
      { label: "Email (AWS SES)", href: "/admin/email-providers", icon: Phone, module: "otp_providers" },
      { label: "Integrations", href: "/admin/integrations", icon: BarChart3, module: "integrations" },
      { label: "Also Check Modules", href: "/admin/also-check", icon: Sparkles },
      { label: "Lead Push (Legacy Hub)", href: "/admin/lead-push-legacy", icon: Network },
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
  // Lead-Push-Only teammates see only Lead Push + All Leads (no other nav items).
  const isLeadPushOnly = !isAdmin && roles.includes("lead_push") && roles.length === 1;
  const visible = (it: NavItem) => {
    if (isLeadPushOnly) {
      return it.href === "/admin/leads" || it.href.startsWith("/admin/lead-push") || it.href === "/admin";
    }
    return !it.module || isAdmin || canAccess(it.module);
  };
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: "active" });
      toast.success("Content refreshed");
    } catch (e: any) {
      toast.error(e?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const initialOpen = () => {
    const o: Record<string, boolean> = {};
    groups.forEach((g) => { o[g.label] = g.items.some((i) => location.pathname === i.href); });
    if (!Object.values(o).some(Boolean)) o["Overview"] = true;
    return o;
  };
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="w-60 bg-card border-r border-border flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
          <p className="text-xs text-muted-foreground">DekhoCampus Management</p>
          <Link to="/" className="mt-3 flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-muted hover:bg-muted/70 text-xs font-medium text-foreground transition-colors">
            <Home className="w-3.5 h-3.5" /> Back to Site
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {groups.map((g) => {
            const items = g.items.filter(visible);
            if (!items.length) return null;
            const isOpen = open[g.label];
            return (
              <div key={g.label}>
                <button
                  onClick={() => setOpen((s) => ({ ...s, [g.label]: !s[g.label] }))}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted"
                >
                  <span className="flex items-center gap-2"><g.icon className="w-3.5 h-3.5" />{g.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="mt-0.5 mb-2 space-y-0.5">
                    {items.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`flex items-center gap-3 pl-7 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified header (mobile + desktop) */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-3 md:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-bold text-foreground truncate text-sm md:text-base">{title}</h1>
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

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
        <CommandPalette />
      </div>
    </div>
  );
}
