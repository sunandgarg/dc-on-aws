import { AdminLayout } from "@/components/AdminLayout";
import { AdminInsights } from "@/components/AdminInsights";
import { LeadOtpModeCard } from "@/components/admin/LeadOtpModeCard";
import { useAllAds } from "@/hooks/useAds";
import { useAllFeaturedColleges } from "@/hooks/useFeaturedColleges";
import { Megaphone, Star, Users, TrendingUp, HelpCircle, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const { data: ads } = useAllAds();
  const { data: featured } = useAllFeaturedColleges();
  const { data: leadsCount } = useQuery({
    queryKey: ["leads-count"],
    queryFn: async () => {
      const { count } = await supabase.from("leads").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: referralsCount } = useQuery({
    queryKey: ["referrals-count"],
    queryFn: async () => {
      const { count } = await supabase.from("referrals").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const stats = [
    {
      label: "Active Ads",
      value: ads?.filter((a) => a.is_active).length ?? 0,
      icon: Megaphone,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/ads",
    },
    {
      label: "Student Referrals",
      value: referralsCount ?? 0,
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-50",
      href: "/admin/referrals",
    },
    {
      label: "Total Leads",
      value: leadsCount ?? 0,
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      href: "/admin/leads",
    },
    {
      label: "Featured Colleges",
      value: featured?.length ?? 0,
      icon: Star,
      color: "text-violet-500",
      bg: "bg-violet-50",
      href: "/admin/featured",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <AdminInsights />
      <LeadOtpModeCard />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.href} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/admin/ads" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
              <Megaphone className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm font-medium text-foreground">Manage Ads</div>
                <div className="text-xs text-muted-foreground">Create, edit, target ads</div>
              </div>
            </Link>
            <Link to="/admin/featured" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-sm font-medium text-foreground">Featured Colleges</div>
                <div className="text-xs text-muted-foreground">Set priority ordering</div>
              </div>
            </Link>
            <Link to="/admin/leads" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
              <Users className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="text-sm font-medium text-foreground">View Leads</div>
                <div className="text-xs text-muted-foreground">See captured leads</div>
              </div>
            </Link>
            <Link to="/admin/content" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
              <HelpCircle className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm font-medium text-foreground">FAQs & Places</div>
                <div className="text-xs text-muted-foreground">Manage homepage content</div>
              </div>
            </Link>
            <Link to="/admin/referrals" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-sm font-medium text-foreground">Manage Referrals</div>
                <div className="text-xs text-muted-foreground">Track payouts & friend leads</div>
              </div>
            </Link>
            <Link to="/admin/docs" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
              <Lightbulb className="w-5 h-5 text-violet-500" />
              <div>
                <div className="text-sm font-medium text-foreground">Project Docs</div>
                <div className="text-xs text-muted-foreground">Technical & admin guide</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3">Ad Targeting Guide</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="p-3 bg-muted rounded-xl">
              <strong className="text-foreground">Universal</strong> - Shows everywhere as fallback
            </div>
            <div className="p-3 bg-muted rounded-xl">
              <strong className="text-foreground">Page-specific</strong> - Shows on colleges/courses/exams/articles pages
            </div>
            <div className="p-3 bg-muted rounded-xl">
              <strong className="text-foreground">Item-specific</strong> - Shows on a specific college/course detail page
            </div>
            <div className="p-3 bg-muted rounded-xl">
              <strong className="text-foreground">City-specific</strong> - Shows to users in a specific city
            </div>
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
              <strong className="text-primary">Priority:</strong> Item → Page+City → Page → City → Universal
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
