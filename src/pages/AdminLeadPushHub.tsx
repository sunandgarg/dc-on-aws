import { AdminLayout } from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Building2, Link2, Upload, Layers, Globe, Activity, History, Trash2, Zap, ArrowRight } from "lucide-react";

const modules = [
  { key: "universities", label: "Universities", desc: "Configure university APIs, manage credentials, and set up lead routing.", icon: Building2, color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400", tags: ["API Configuration", "Payload Mapping", "Rate Limits", "Export Config"], tab: "universities" },
  { key: "utm", label: "UTM Links", desc: "View and manage UTM tracking links for all configured universities.", icon: Link2, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400", tags: ["UTM Tracking", "Quick Copy", "University Mapping"], tab: "utm" },
  { key: "upload", label: "Upload Leads", desc: "Upload CSV files with leads and push them to university CRMs in real-time.", icon: Upload, color: "from-orange-500/20 to-orange-500/5", iconColor: "text-orange-400", tags: ["CSV Upload", "Column Mapping", "Validation", "Batch Processing"], tab: "bulk" },
  { key: "multi", label: "Multi-Push", desc: "Push one CSV of leads to multiple universities at once with saved presets and per-university defaults.", icon: Layers, color: "from-orange-600/20 to-orange-600/5", iconColor: "text-orange-500", tags: ["Multi-Select", "Presets (Top 5)", "Per-Uni Defaults", "Per-Lead Report"], tab: "multi" },
  { key: "landing", label: "Landing Pages", desc: "Give each landing page its own API key. Submitted leads auto-push to your chosen universities.", icon: Globe, color: "from-sky-500/20 to-sky-500/5", iconColor: "text-sky-400", tags: ["Per-Page API Key", "Direct or Preset", "Default Values", "Copy Snippet"], tab: "keys" },
  { key: "active", label: "Active Tasks", desc: "Monitor all running tasks across users. Pause, resume or stop any batch.", icon: Activity, color: "from-teal-500/20 to-teal-500/5", iconColor: "text-teal-400", tags: ["All Users", "Pause/Stop", "Progress Tracking", "Manual Refresh"], tab: "logs" },
  { key: "history", label: "Upload History", desc: "View past upload batches and track success rates.", icon: History, color: "from-purple-500/20 to-purple-500/5", iconColor: "text-purple-400", tags: ["Batch History", "Status Tracking", "Filters", "Analytics"], tab: "logs" },
  { key: "purge", label: "Purge Uni Cache", desc: "Clear cached lead push data (logs, leads, batches) for a chosen university or all.", icon: Trash2, color: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-400", tags: ["Per-University", "All Universities", "0/1/2/30 Days", "Instant"], tab: "logs" },
];

export default function AdminLeadPushHub() {
  const { data: stats } = useQuery({
    queryKey: ["lp_hub_stats"],
    queryFn: async () => {
      const [u, today, ok, pend] = await Promise.all([
        supabase.from("lp_universities" as any).select("id", { count: "exact", head: true }),
        supabase.from("lp_push_logs" as any).select("id", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("lp_push_logs" as any).select("id", { count: "exact", head: true }).eq("status", "success"),
        supabase.from("lp_push_logs" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const okC = ok.count || 0;
      const todayC = today.count || 0;
      return { universities: u.count || 0, today: todayC, rate: todayC ? Math.round((okC / Math.max(1, todayC)) * 100) : 0, pending: pend.count || 0 };
    },
  });

  return (
    <AdminLayout title="Lead Push">
      <div className="space-y-8 max-w-7xl">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-500/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Lead Push</h1>
            <p className="text-muted-foreground text-sm">Push leads to university CRMs with real-time API integration</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Universities", value: stats?.universities ?? "-", icon: Building2 },
            { label: "Leads Today", value: stats?.today ?? "-", icon: Upload },
            { label: "Success Rate", value: stats ? `${stats.rate}%` : "-", icon: Activity },
            { label: "Pending", value: stats?.pending ?? "-", icon: History },
          ].map((s) => (
            <div key={s.label} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><s.icon className="w-3.5 h-3.5" />{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m) => (
              <Link
                key={m.key}
                to={`/admin/lead-push/manage?tab=${m.tab}`}
                className="group border border-border rounded-2xl p-5 bg-card hover:border-orange-500/40 hover:shadow-lg transition-all"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-3`}>
                  <m.icon className={`w-5 h-5 ${m.iconColor}`} />
                </div>
                <h3 className="font-semibold text-base mb-1">{m.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 min-h-[2.5rem]">{m.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {m.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-orange-500 group-hover:gap-2 transition-all">
                  <span>Open</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
