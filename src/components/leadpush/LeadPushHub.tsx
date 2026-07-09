import { memo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Upload, History, ArrowRight, Zap, CheckCircle2, Clock, Link2, Activity,
  Layers, Trash2, Globe, Network, Copy, RefreshCw, Shield, Workflow,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DataRetentionNotice } from "@/components/ui/DataRetentionNotice";

const LEAD_PUSH_MODULES = [
  { id: "universities", name: "Universities", description: "Configure university APIs, manage credentials, and set up lead routing.", icon: Building2, bgColor: "bg-blue-500/10", textColor: "text-blue-500", route: "/admin/lead-push/universities", features: ["API Configuration", "Payload Mapping", "Rate Limits", "Export Config"] },
  { id: "utm", name: "UTM Links", description: "View and manage UTM tracking links for all configured universities.", icon: Link2, bgColor: "bg-teal-500/10", textColor: "text-teal-500", route: "/admin/lead-push/utm", features: ["UTM Tracking", "Quick Copy", "University Mapping"] },
  { id: "upload", name: "Upload Leads", description: "Upload CSV files with leads and push them to university CRMs in real-time.", icon: Upload, bgColor: "bg-green-500/10", textColor: "text-green-500", route: "/admin/lead-push/upload", features: ["CSV Upload", "Column Mapping", "Validation", "Batch Processing"] },
  { id: "multi-push", name: "Multi-Push", description: "Push one CSV of leads to multiple universities at once with saved presets and per-university defaults.", icon: Layers, bgColor: "bg-orange-500/10", textColor: "text-orange-500", route: "/admin/lead-push/multi-push", features: ["Multi-Select", "Presets (Top 5)", "Per-Uni Defaults", "Per-Lead Report"] },
  { id: "landing-pages", name: "Landing Pages", description: "Give each landing page its own API key. Submitted leads auto-push to your chosen universities.", icon: Globe, bgColor: "bg-indigo-500/10", textColor: "text-indigo-500", route: "/admin/lead-push/landing-pages", features: ["Per-Page API Key", "Direct or Preset", "Default Values", "Copy Snippet"] },
  { id: "active-tasks", name: "Active Tasks", description: "Monitor all running tasks across users. Pause, resume or stop any batch.", icon: Activity, bgColor: "bg-cyan-500/10", textColor: "text-cyan-500", route: "/admin/lead-push/active-tasks", features: ["All Users", "Pause/Stop", "Progress Tracking", "Manual Refresh"] },
  { id: "history", name: "Upload History", description: "View past upload batches and track success rates.", icon: History, bgColor: "bg-purple-500/10", textColor: "text-purple-500", route: "/admin/lead-push/history", features: ["Batch History", "Status Tracking", "Filters", "Analytics"] },
  { id: "automation", name: "Lead Push Automation", description: "Auto-route every incoming lead to the right universities by course, city, state & source with pre-filled values.", icon: Workflow, bgColor: "bg-pink-500/10", textColor: "text-pink-500", route: "/admin/lead-push/automation", features: ["Routing Rules", "Per College×Course", "Auto-Push", "Pre-filled Values"] },
  { id: "purge-cache", name: "Purge Uni Cache", description: "Clear cached lead push data (logs, leads, batches) for a chosen university or all.", icon: Trash2, bgColor: "bg-red-500/10", textColor: "text-red-500", route: "/admin/lead-push/purge-cache", features: ["Per-University", "All Universities", "0/1/2/30 Days", "Instant"] },
];

interface LeadPushHubProps {
  stats?: { totalUniversities: number; totalLeadsToday: number; successRate: number; pendingLeads: number };
}

const ModuleCard = memo(({ module, onSelect }: { module: (typeof LEAD_PUSH_MODULES)[0]; onSelect: () => void }) => {
  const Icon = module.icon;
  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:-translate-y-1" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-xl", module.bgColor)}><Icon className={cn("h-6 w-6", module.textColor)} /></div>
        </div>
        <CardTitle className="text-lg font-bold mt-3 group-hover:text-primary transition-colors">{module.name}</CardTitle>
        <CardDescription className="text-sm">{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {module.features.map((feature, idx) => (
            <span key={idx} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{feature}</span>
          ))}
        </div>
        <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/5">
          <span>Open</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
});
ModuleCard.displayName = "ModuleCard";

const EGRESS_STORAGE_KEY = "lp_egress_ips_v2";
const STATIC_IPS_KEY = "lp_static_server_ips_v1";

type Sample = {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  asn?: string;
  org?: string;
  hostname?: string;
  deployment_id?: string | null;
  runtime_region?: string | null;
  worker_host?: string | null;
  request_host?: string | null;
  seen_at: string;
};

const EgressIpCard = memo(() => {
  const [samples, setSamples] = useState<Sample[]>(() => {
    try {
      const raw = localStorage.getItem(EGRESS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [staticIps, setStaticIps] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STATIC_IPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [staticInput, setStaticInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [myIp, setMyIp] = useState<{ v4?: string; v6?: string; meta?: any; loading: boolean }>({ loading: true });

  const fetchMyIp = useCallback(async () => {
    setMyIp((p) => ({ ...p, loading: true }));
    try {
      const [v4Res, v6Res, metaRes] = await Promise.allSettled([
        fetch("https://api.ipify.org?format=json").then((r) => r.json()),
        fetch("https://api64.ipify.org?format=json").then((r) => r.json()),
        fetch("https://ipapi.co/json/").then((r) => r.json()).catch(() => null),
      ]);
      const v4 = v4Res.status === "fulfilled" ? v4Res.value?.ip : undefined;
      const v6 = v6Res.status === "fulfilled" ? v6Res.value?.ip : undefined;
      const meta = metaRes.status === "fulfilled" ? metaRes.value : null;
      setMyIp({ v4, v6: v6 && v6 !== v4 ? v6 : undefined, meta, loading: false });
    } catch {
      setMyIp({ loading: false });
    }
  }, []);

  // Auto-load user's public IP on mount
  useEffect(() => { fetchMyIp(); }, [fetchMyIp]);

  const persist = (list: Sample[]) => {
    try { localStorage.setItem(EGRESS_STORAGE_KEY, JSON.stringify(list)); } catch {}
  };
  const persistStatic = (list: string[]) => {
    try { localStorage.setItem(STATIC_IPS_KEY, JSON.stringify(list)); } catch {}
  };

  const addStaticIps = () => {
    const parts = staticInput.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    const v4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    const v6 = /^[0-9a-fA-F:]+$/;
    const valid = parts.filter((p) => v4.test(p) || (v6.test(p) && p.includes(":")));
    if (!valid.length) { toast.error("Enter a valid IPv4 or IPv6"); return; }
    const merged = Array.from(new Set([...staticIps, ...valid]));
    setStaticIps(merged); persistStatic(merged); setStaticInput("");
    toast.success(`Added ${valid.length} static IP(s)`);
  };
  const removeStatic = (ip: string) => {
    const next = staticIps.filter((x) => x !== ip);
    setStaticIps(next); persistStatic(next);
  };


  const ips = samples.map((s) => s.ip);

  const fetchIp = useCallback(async (rounds = 8) => {
    setLoading(true);
    setProgress({ done: 0, total: rounds });
    const map = new Map<string, Sample>(samples.map((s) => [s.ip, s]));
    try {
      for (let i = 0; i < rounds; i++) {
        const { data, error } = await supabase.functions.invoke("get-egress-ip", { body: { nonce: Math.random() } });
        if (!error && Array.isArray(data?.ips)) {
          const meta = data.meta || {};
          const runtime = data.runtime || {};
          for (const ip of data.ips) {
            map.set(ip, {
              ip,
              country: meta.country || meta.country_iso,
              region: meta.region,
              city: meta.city,
              asn: meta.asn,
              org: meta.asn_org || meta.org,
              hostname: meta.hostname,
              deployment_id: runtime.deployment_id,
              runtime_region: runtime.region,
              worker_host: runtime.hostname,
              request_host: runtime.request_host,
              seen_at: data.checked_at || new Date().toISOString(),
            });
          }
        }
        setProgress({ done: i + 1, total: rounds });
      }
      const list = Array.from(map.values()).sort((a, b) => a.ip.localeCompare(b.ip));
      setSamples(list);
      persist(list);
      setCheckedAt(new Date().toISOString());
      if (!list.length) toast.error("Could not determine egress IPs");
      else toast.success(`Found ${list.length} unique IP(s)`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to fetch IPs");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [samples]);

  const clearList = () => { setSamples([]); persist([]); setCheckedAt(null); toast.success("Cleared"); };
  const copy = (text: string, label?: string) => { navigator.clipboard.writeText(text); toast.success(`Copied ${label || text}`); };
  const copyAll = () => { navigator.clipboard.writeText(ips.join(", ")); toast.success("Copied all IPs"); };

  const v4 = samples.filter((s) => !s.ip.includes(":"));
  const v6 = samples.filter((s) => s.ip.includes(":"));

  return (
    <Card className="mt-8 border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-rose-500/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/15"><Network className="h-5 w-5 text-orange-500" /></div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                Server / Egress IPs
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1">
                  <Shield className="h-3 w-3" /> For API Whitelisting
                </Badge>
                {samples.length > 0 && (
                  <Badge variant="outline" className="bg-background">{samples.length} unique</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Live network info from whichever Supabase Edge worker handles each request - IP, AWS region, ASN, datacenter & deployment ID.
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {samples.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearList} disabled={loading}>Clear</Button>
            )}
            <Button onClick={() => fetchIp(8)} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              {loading && progress ? `Probing ${progress.done}/${progress.total}` : samples.length ? "Refresh (scan 8x)" : "Discover IPs"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your current public IP - give this to partners for whitelisting */}
        <div className="rounded-lg border-2 border-blue-500/40 bg-blue-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
              <Network className="h-4 w-4" /> Your Current Public IP
              <Badge variant="outline" className="text-[10px]">Give this to partners</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMyIp} disabled={myIp.loading}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", myIp.loading && "animate-spin")} /> Refresh
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This is the public IP your device/network is using right now. Share it with the partner so they can whitelist it - then leads sent from your system will be accepted.
          </p>
          {myIp.loading ? (
            <div className="text-xs text-muted-foreground italic">Detecting your IP…</div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {myIp.v4 && (
                <button
                  onClick={() => { navigator.clipboard.writeText(myIp.v4!); toast.success(`Copied ${myIp.v4}`); }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border-2 border-blue-500/40 hover:border-blue-500 font-mono text-sm font-semibold"
                >
                  <Network className="h-4 w-4 text-blue-600" />
                  {myIp.v4}
                  <Badge variant="secondary" className="h-5 text-[10px]">IPv4</Badge>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              {myIp.v6 && (
                <button
                  onClick={() => { navigator.clipboard.writeText(myIp.v6!); toast.success("Copied IPv6"); }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border-2 border-blue-500/40 hover:border-blue-500 font-mono text-xs"
                >
                  <Network className="h-3.5 w-3.5 text-blue-600" />
                  <span className="truncate max-w-[260px]">{myIp.v6}</span>
                  <Badge variant="secondary" className="h-5 text-[10px]">IPv6</Badge>
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
              {myIp.meta && (
                <div className="text-xs text-muted-foreground">
                  {[myIp.meta.city, myIp.meta.region, myIp.meta.country_name].filter(Boolean).join(", ")}
                  {myIp.meta.org && <> · <span className="font-medium">{myIp.meta.org}</span></>}
                  {myIp.meta.asn && <> · {myIp.meta.asn}</>}
                </div>
              )}
              {!myIp.v4 && !myIp.v6 && (
                <div className="text-xs text-red-600">Could not detect IP. Disable ad-blocker and retry.</div>
              )}
            </div>
          )}
          <p className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5">
            ⚠️ Note: If you push leads through this admin panel, the partner actually sees the <strong>Supabase edge server IP</strong> (shown below), not this IP. This IP only works if you send leads directly from this network using your own script / Postman / curl.
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs space-y-1.5">
          <div className="font-semibold text-amber-700 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> No fixed IP list exists
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Server: <strong>Supabase Edge Functions → Deno Deploy → AWS</strong>. Each call lands on a different AWS worker, returning a different egress IP from a pool of hundreds across multiple regions.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Recommended:</strong> whitelist by API key / secret header (already sent). For strict IP whitelisting, route via a static-IP proxy (Fixie, QuotaGuard, or NAT EC2).
          </p>
        </div>

        {/* Static server IPs (DigitalOcean droplet, NAT, proxy, etc.) */}
        <div className="rounded-lg border-2 border-green-500/40 bg-green-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Your Static Server IPs
              <Badge variant="outline" className="text-[10px]">DigitalOcean / Proxy / NAT</Badge>
            </div>
            {staticIps.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(staticIps.join(", ")); toast.success("Copied"); }}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy all ({staticIps.length})
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            If you route lead pushes through your own server (e.g. a DigitalOcean droplet with a fixed IP), add it here. Give these IPs to partners to whitelist.
          </p>
          <div className="flex gap-2">
            <input
              value={staticInput}
              onChange={(e) => setStaticInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addStaticIps(); }}
              placeholder="e.g. 167.99.12.34, 142.93.55.10"
              className="flex-1 px-3 py-2 text-sm rounded-md border bg-background font-mono"
            />
            <Button onClick={addStaticIps} className="bg-green-600 hover:bg-green-700 text-white">Add</Button>
          </div>
          {staticIps.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {staticIps.map((ip) => (
                <div key={ip} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border-2 border-green-500/40 font-mono text-xs">
                  <Network className="h-3.5 w-3.5 text-green-600" />
                  <span className="font-semibold">{ip}</span>
                  <button onClick={() => { navigator.clipboard.writeText(ip); toast.success(`Copied ${ip}`); }} className="text-muted-foreground hover:text-green-600">
                    <Copy className="h-3 w-3" />
                  </button>
                  <button onClick={() => removeStatic(ip)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {samples.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">
            Click <span className="font-medium text-orange-600">Discover IPs</span> to sample the edge runtime. 8 probes per click, accumulates unique servers.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick copyable IP chips */}
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.ip}
                  onClick={() => copy(s.ip)}
                  className="group inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border-2 border-orange-500/40 hover:border-orange-500 transition-colors font-mono text-xs"
                  title={`${s.country || ""} ${s.region || ""} ${s.org || ""}`}
                >
                  <Network className="h-3.5 w-3.5 text-orange-500" />
                  <span className="font-semibold">{s.ip}</span>
                  {s.country && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{s.country}</Badge>}
                  <Copy className="h-3 w-3 text-muted-foreground group-hover:text-orange-500" />
                </button>
              ))}
              {samples.length > 1 && (
                <Button variant="outline" size="sm" onClick={copyAll}><Copy className="h-3.5 w-3.5 mr-1" /> Copy all ({samples.length})</Button>
              )}
            </div>

            {/* Detailed table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">IP</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Country</th>
                      <th className="px-3 py-2 font-medium">Region / City</th>
                      <th className="px-3 py-2 font-medium">ASN / Org</th>
                      <th className="px-3 py-2 font-medium">Hostname</th>
                      <th className="px-3 py-2 font-medium">Edge Worker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((s) => (
                      <tr key={s.ip} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono font-semibold">{s.ip}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{s.ip.includes(":") ? "IPv6" : "IPv4"}</Badge></td>
                        <td className="px-3 py-2">{s.country || "-"}</td>
                        <td className="px-3 py-2">{[s.region, s.city].filter(Boolean).join(", ") || "-"}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={`${s.asn || ""} ${s.org || ""}`}>{s.asn ? `${s.asn} ` : ""}{s.org || "-"}</td>
                        <td className="px-3 py-2 font-mono text-[10px] max-w-[180px] truncate" title={s.hostname}>{s.hostname || "-"}</td>
                        <td className="px-3 py-2 font-mono text-[10px] max-w-[180px] truncate" title={`${s.runtime_region || ""} ${s.deployment_id || ""}`}>
                          {s.runtime_region || s.worker_host || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-2.5 bg-background">
                <div className="text-muted-foreground mb-1">IPv4 ({v4.length})</div>
                <code className="font-mono text-[11px] break-all">{v4.map((s) => s.ip).join(", ") || "-"}</code>
              </div>
              <div className="rounded-lg border p-2.5 bg-background">
                <div className="text-muted-foreground mb-1">IPv6 ({v6.length})</div>
                <code className="font-mono text-[11px] break-all">{v6.map((s) => s.ip).join(", ") || "-"}</code>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              Sampled set, not exhaustive. {checkedAt && <>Last refreshed {new Date(checkedAt).toLocaleString()}.</>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
EgressIpCard.displayName = "EgressIpCard";

const QuickStats = memo(({ stats }: { stats?: LeadPushHubProps["stats"] }) => {
  const defaultStats = { totalUniversities: 0, totalLeadsToday: 0, successRate: 0, pendingLeads: 0, ...stats };
  const statItems = [
    { label: "Universities", value: defaultStats.totalUniversities, icon: Building2 },
    { label: "Leads Today", value: defaultStats.totalLeadsToday, icon: Upload },
    { label: "Success Rate", value: `${defaultStats.successRate}%`, icon: CheckCircle2, isGreen: defaultStats.successRate >= 80 },
    { label: "Pending", value: defaultStats.pendingLeads, icon: Clock, isWarning: defaultStats.pendingLeads > 0 },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statItems.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", stat.isGreen ? "text-green-500" : stat.isWarning ? "text-orange-500" : "text-muted-foreground")} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});
QuickStats.displayName = "QuickStats";

export function LeadPushHub({ stats }: LeadPushHubProps) {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-6">
      <DataRetentionNotice variant="banner" className="mb-6" />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lead Push</h1>
            <p className="text-muted-foreground">Push leads to university CRMs with real-time API integration</p>
          </div>
        </div>
      </div>

      <QuickStats stats={stats} />

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Modules</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LEAD_PUSH_MODULES.map((module) => (
            <ModuleCard key={module.id} module={module} onSelect={() => navigate(module.route)} />
          ))}
        </div>
      </div>

      <EgressIpCard />

      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Add University", icon: Building2, action: () => navigate("/admin/lead-push/universities/add") },
              { label: "Upload Leads", icon: Upload, action: () => navigate("/admin/lead-push/upload") },
              { label: "Active Tasks", icon: Activity, action: () => navigate("/admin/lead-push/active-tasks") },
              { label: "View History", icon: History, action: () => navigate("/admin/lead-push/history") },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Button key={idx} variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-primary/5" onClick={item.action}>
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(LeadPushHub);
