import { AdminLayout } from "@/components/AdminLayout";
import { AdminInsights } from "@/components/AdminInsights";
import { LeadOtpModeCard } from "@/components/admin/LeadOtpModeCard";
import { AIUsageDashboard } from "@/components/admin/AIUsageDashboard";
import { useAllAds } from "@/hooks/useAds";
import { useAllFeaturedColleges } from "@/hooks/useFeaturedColleges";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  PanelTop,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formatNumber = (value: number) => new Intl.NumberFormat("en-IN", { notation: value > 99_999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);

export default function AdminDashboard() {
  const { data: ads } = useAllAds();
  const { data: featured } = useAllFeaturedColleges();

  const { data: leadsCount } = useQuery({
    queryKey: ["leads-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("leads").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: referralsCount } = useQuery({
    queryKey: ["referrals-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("referrals").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Total leads", value: leadsCount ?? 0, icon: Users, tone: "bg-emerald-50 text-emerald-700", href: "/admin/leads" },
    { label: "Active ads", value: ads?.filter((ad) => ad.is_active).length ?? 0, icon: Megaphone, tone: "bg-blue-50 text-blue-700", href: "/admin/ads" },
    { label: "Featured colleges", value: featured?.length ?? 0, icon: Star, tone: "bg-amber-50 text-amber-700", href: "/admin/featured" },
    { label: "Student referrals", value: referralsCount ?? 0, icon: Sparkles, tone: "bg-violet-50 text-violet-700", href: "/admin/referrals" },
  ];

  const workspaces = [
    { title: "Leads & CRM", description: "Review leads, intent and follow-ups", href: "/admin/leads", icon: Users, tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700" },
    { title: "College Content", description: "Manage colleges, courses and exams", href: "/admin/colleges", icon: GraduationCap, tone: "from-blue-500/15 to-blue-500/5 text-blue-700" },
    { title: "Articles & SEO", description: "Create and organise editorial content", href: "/admin/articles", icon: Newspaper, tone: "from-violet-500/15 to-violet-500/5 text-violet-700" },
    { title: "Website Experience", description: "Control homepage, banners and pages", href: "/admin/hero", icon: PanelTop, tone: "from-orange-500/15 to-orange-500/5 text-orange-700" },
    { title: "Revenue & Listings", description: "Ads, featured listings and priority", href: "/admin/ads", icon: Megaphone, tone: "from-rose-500/15 to-rose-500/5 text-rose-700" },
    { title: "System & Providers", description: "AI budgets, models, OTP and integrations", href: "/admin/ai-providers", icon: Settings, tone: "from-slate-500/15 to-slate-500/5 text-slate-700" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-gradient-to-br from-slate-950 via-blue-950 to-primary p-6 text-white shadow-xl shadow-primary/10 md:p-8">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[48px] border-white/[0.04]" aria-hidden="true" />
          <div className="absolute -bottom-36 right-40 h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-100">
                <LayoutDashboard className="h-3.5 w-3.5" /> Operations overview
              </span>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Good to see you. What are we shipping today?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">Your most important tools are one click away. Use the sidebar search for everything else.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/articles" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 shadow-lg transition-transform hover:-translate-y-0.5">
                <Plus className="h-4 w-4" /> New article
              </Link>
              <Link to="/admin/colleges" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15">
                <GraduationCap className="h-4 w-4" /> Manage colleges
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="snapshot-heading">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 id="snapshot-heading" className="text-base font-extrabold text-foreground">Business snapshot</h2>
              <p className="text-xs text-muted-foreground">The numbers you need most often</p>
            </div>
            <Link to="/admin/user-analytics" className="hidden items-center gap-1 text-xs font-bold text-primary hover:underline sm:inline-flex">View analytics <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map((stat) => (
              <Link key={stat.label} to={stat.href} className="group rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}><stat.icon className="h-5 w-5" /></span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <strong className="block text-2xl font-black tracking-tight text-foreground">{formatNumber(stat.value)}</strong>
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <AIUsageDashboard compact />

        <section aria-labelledby="workspaces-heading">
          <div className="mb-3">
            <h2 id="workspaces-heading" className="text-base font-extrabold text-foreground">Workspaces</h2>
            <p className="text-xs text-muted-foreground">Choose what you want to manage</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link key={workspace.title} to={workspace.href} className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${workspace.tone}`}><workspace.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-extrabold text-foreground">{workspace.title}</strong>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{workspace.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <details className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:content-none">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BarChart3 className="h-5 w-5" /></span>
                <span>
                  <strong className="block text-sm font-extrabold text-foreground">Performance analytics</strong>
                  <span className="text-xs text-muted-foreground">Content inventory, activity and lead sources</span>
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/70 p-4 md:p-5"><AdminInsights /></div>
          </details>

          <details className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:content-none">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
                <span>
                  <strong className="block text-sm font-extrabold text-foreground">OTP and delivery controls</strong>
                  <span className="text-xs text-muted-foreground">Verification mode, channels and providers</span>
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/70 p-4 md:p-5"><LeadOtpModeCard /></div>
          </details>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BookOpen className="h-5 w-5" /></span>
            <div>
              <h2 className="text-sm font-extrabold text-foreground">Need help finding a setting?</h2>
              <p className="text-xs text-muted-foreground">Press ⌘K / Ctrl+K or search from the left sidebar.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/docs" className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground hover:bg-muted"><FileText className="h-4 w-4" /> Documentation</Link>
            <Link to="/admin/logs" className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground hover:bg-muted"><ShieldCheck className="h-4 w-4" /> System logs</Link>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
