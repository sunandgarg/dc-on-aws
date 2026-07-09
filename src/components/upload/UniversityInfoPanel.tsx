import { useState, useEffect, useRef } from "react";
import { RefreshCw, Clock, Zap, Save, ExternalLink, KeyRound, Lock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface University {
  id: string;
  name: string;
  api_url: string;
  college_id: string;
  source: string;
  medium: string;
  campaign: string;
  leads_per_minute: number;
  api_type: string;
  publisher_panel_url?: string;
  publisher_id?: string;
}

interface UniversityInfoPanelProps {
  university: University;
  onRateLimitUpdate: (newRate: number) => void;
}

interface RateLimitConfig {
  admin_locked: boolean;
  max_leads_per_minute: number;
}

// Module-level cache to avoid re-fetching admin config on every mount
let adminConfigCache: { config: RateLimitConfig | null; timestamp: number } | null = null;
const ADMIN_CACHE_TTL = 60000; // 1 min

export function UniversityInfoPanel({ university, onRateLimitUpdate }: UniversityInfoPanelProps) {
  const [leadsPerMinute, setLeadsPerMinute] = useState(university.leads_per_minute || 5);
  const [isSaving, setIsSaving] = useState(false);
  const [adminConfig, setAdminConfig] = useState<RateLimitConfig | null>(null);
  const { toast } = useToast();
  const onRateLimitUpdateRef = useRef(onRateLimitUpdate);
  onRateLimitUpdateRef.current = onRateLimitUpdate;

  // Sync state when university prop changes
  useEffect(() => {
    const rate = university.leads_per_minute || 5;
    setLeadsPerMinute(rate);
  }, [university.id, university.leads_per_minute]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Use cache if fresh
      if (adminConfigCache && Date.now() - adminConfigCache.timestamp < ADMIN_CACHE_TTL) {
        const config = adminConfigCache.config;
        if (!cancelled && config) {
          setAdminConfig(config);
          if (config.admin_locked) {
            setLeadsPerMinute(config.max_leads_per_minute);
            onRateLimitUpdateRef.current(config.max_leads_per_minute);
          }
        }
        return;
      }

      const { data } = await supabase.from('app_settings').select('value').eq('key', 'rate_limit_config').maybeSingle();
      if (cancelled) return;
      let config: RateLimitConfig | null = null;
      if (data?.value) {
        try { config = JSON.parse(data.value); } catch { /* ignore */ }
      }
      adminConfigCache = { config, timestamp: Date.now() };
      if (config) {
        setAdminConfig(config);
        if (config.admin_locked) {
          setLeadsPerMinute(config.max_leads_per_minute);
          onRateLimitUpdateRef.current(config.max_leads_per_minute);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isLocked = adminConfig?.admin_locked === true;
  const intervalMs = Math.round(60000 / leadsPerMinute);
  const intervalSeconds = (intervalMs / 1000).toFixed(1);
  const leadsPerHour = leadsPerMinute * 60;

  const handleSaveRateLimit = async () => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("universities")
        .update({ leads_per_minute: leadsPerMinute })
        .eq("id", university.id);
      if (error) throw error;
      onRateLimitUpdate(leadsPerMinute);
      toast({ title: "Success", description: `Rate limit set to ${leadsPerMinute} leads/min` });
    } catch (error) {
      console.error("Error updating rate limit:", error);
      toast({ title: "Error", description: "Failed to update rate limit", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* University Info Card */}
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4">{university.name}</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">API Endpoint</p>
            <p className="text-sm text-foreground font-mono break-all">{university.api_url}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Source</p>
              <p className="text-sm text-foreground font-medium">{university.source}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Medium</p>
              <p className="text-sm text-foreground font-medium">{university.medium}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Publisher Panel Info */}
      {(university.publisher_panel_url || university.publisher_id) && (
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <KeyRound className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Publisher Panel</h4>
              <p className="text-xs text-muted-foreground">Access your publisher account</p>
            </div>
          </div>
          {university.publisher_id && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Publisher ID</p>
              <p className="text-sm text-foreground font-mono">{university.publisher_id}</p>
            </div>
          )}
          {university.publisher_panel_url && (
            <a href={university.publisher_panel_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium">
              <ExternalLink className="h-4 w-4" /> Open Publisher Panel
            </a>
          )}
        </div>
      )}

      {/* Rate Limiting Card */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {isLocked ? <Lock className="h-5 w-5 text-amber-500" /> : <RefreshCw className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <h4 className="font-medium text-foreground">Rate Limiting</h4>
            <p className="text-xs text-muted-foreground">
              {isLocked
                ? `Set by admin: ${adminConfig!.max_leads_per_minute} leads/min (locked)`
                : 'Control lead processing speed (1-100 leads/min)'}
            </p>
          </div>
        </div>

        {isLocked && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-foreground">
              Rate limit is <strong>locked by admin</strong> at <strong className="text-primary">{adminConfig!.max_leads_per_minute} leads/min</strong>. Contact admin to change.
            </p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-foreground">Leads per Minute</label>
            <span className="font-display text-2xl font-bold text-primary">{leadsPerMinute}</span>
          </div>
          <Slider
            value={[leadsPerMinute]}
            onValueChange={(val) => !isLocked && setLeadsPerMinute(val[0])}
            min={1}
            max={isLocked ? adminConfig!.max_leads_per_minute : 100}
            step={1}
            className="w-full"
            disabled={isLocked}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1 (slowest)</span><span>25</span><span>50</span><span>75</span><span>100 (fastest)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Interval</p>
              <p className="font-medium text-foreground">{intervalSeconds}s</p>
              <p className="text-xs text-muted-foreground">between leads</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50">
            <Zap className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Throughput</p>
              <p className="font-medium text-foreground">{leadsPerHour.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">leads/hour</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
          <p className="text-xs text-foreground">
            <span className="font-medium">How it works:</span> At{" "}
            <span className="font-bold text-primary">{leadsPerMinute} leads/min</span>, 200 leads complete in ~
            <span className="font-bold text-primary">{Math.ceil(200 / leadsPerMinute)} min</span>. Rate is enforced both
            in live processing and background queue.
          </p>
        </div>

        {!isLocked && leadsPerMinute !== university.leads_per_minute && (
          <button onClick={handleSaveRateLimit} disabled={isSaving} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : `Save Rate Limit (${leadsPerMinute}/min)`}
          </button>
        )}
      </div>
    </div>
  );
}
