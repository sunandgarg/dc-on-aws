import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Flame, Snowflake, Activity, GraduationCap } from "lucide-react";

const CAT: Record<string, { label: string; cls: string; icon: any }> = {
  cold:             { label: "Cold",            cls: "bg-slate-100 text-slate-700",   icon: Snowflake },
  warm:             { label: "Warm",            cls: "bg-amber-100 text-amber-800",   icon: Activity },
  hot:              { label: "Hot",             cls: "bg-orange-100 text-orange-800", icon: Flame },
  admission_ready:  { label: "Admission Ready", cls: "bg-green-100 text-green-800",   icon: GraduationCap },
};

interface Props {
  leadId: string | null;
  leadPhone?: string | null;
  leadName?: string | null;
  onClose: () => void;
}

export function LeadIntentDrawer({ leadId, leadPhone, leadName, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    (async () => {
      setLoading(true);
      setScore(null); setTimeline([]); setPrediction(null);
      // 1. Find intent_lead_scores row by lead_id
      const { data: s } = await supabase
        .from("intent_lead_scores").select("*").eq("lead_id", leadId).maybeSingle();
      setScore(s);
      if (s) {
        const col = s.subject_type === "user" ? "user_id" : "visitor_id";
        const { data: ev } = await supabase.from("intent_events")
          .select("occurred_at,event_type,college_slug,course_slug,page_url,city,state")
          .eq(col, s.subject_id)
          .order("occurred_at", { ascending: false })
          .limit(200);
        setTimeline(ev || []);
        runPrediction(s.id, "heuristic");
      }
      setLoading(false);
    })();
  }, [leadId]);

  const runPrediction = async (id: string, mode: "heuristic" | "ai") => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-lead-intent", { body: { lead_score_id: id, mode } });
      if (error) throw error;
      setPrediction(data);
    } catch (e: any) {
      toast({ title: "Prediction failed", description: e?.message, variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  const c = score ? (CAT[score.category] || CAT.cold) : null;
  const Icon = c?.icon;

  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lead intent analysis{leadName ? ` - ${leadName}` : ""}</SheetTitle>
        </SheetHeader>

        {loading && <div className="mt-4 space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>}

        {!loading && !score && (
          <div className="mt-6 text-sm text-muted-foreground">
            No behavioral activity has been linked to this lead yet. Tracked actions on the site (college / course / fee / brochure / apply etc.) will appear here automatically once captured.
            {leadPhone && <div className="mt-2">Phone: <span className="font-mono">+91 {leadPhone.replace(/\D/g,'').slice(-10)}</span></div>}
          </div>
        )}

        {!loading && score && c && (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-2">
              <Badge className={c.cls}><Icon className="h-3 w-3 mr-1" />{c.label}</Badge>
              <span className="text-2xl font-bold">{score.score}</span>
              <span className="text-xs text-muted-foreground">/ 150+</span>
              <span className="ml-auto text-xs text-muted-foreground">{score.event_count} events</span>
            </div>

            <Card className="p-3 text-sm space-y-1">
              <div>Top college: <b>{score.top_college_slug || "-"}</b></div>
              <div>Top course: <b>{score.top_course_slug || "-"}</b></div>
              <div>Last activity: <b>{score.last_event_type || "-"}</b> · {score.last_event_at ? new Date(score.last_event_at).toLocaleString() : ""}</div>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">AI Intent Prediction</h3>
                <Button size="sm" variant="outline" onClick={() => runPrediction(score.id, "ai")} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />{aiLoading ? "…" : "Deep analyze (AI)"}
                </Button>
              </div>
              {prediction ? (
                <Card className="p-3 text-sm space-y-1">
                  <div>Admission probability: <b>{prediction.admission_probability ?? prediction.heuristic?.admission_probability}%</b></div>
                  <div>Fee sensitivity: <b>{prediction.fee_sensitivity ?? prediction.heuristic?.fee_sensitivity}%</b></div>
                  <div>Scholarship sensitivity: <b>{prediction.scholarship_sensitivity ?? prediction.heuristic?.scholarship_sensitivity}%</b></div>
                  <div>Top colleges: {(prediction.top_colleges ?? prediction.heuristic?.top_colleges ?? []).map((t: any) => `${t.value} (${t.confidence}%)`).join(", ") || "-"}</div>
                  <div>Top courses: {(prediction.top_courses ?? prediction.heuristic?.top_courses ?? []).map((t: any) => `${t.value} (${t.confidence}%)`).join(", ") || "-"}</div>
                  <div>Location preference: {(prediction.location_preference ?? prediction.heuristic?.location_preference ?? []).map((t: any) => `${t.value} (${t.confidence}%)`).join(", ") || "-"}</div>
                  {prediction.ai && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs font-semibold text-primary mb-1">AI reasoning</div>
                      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(prediction.ai, null, 2)}</pre>
                    </div>
                  )}
                </Card>
              ) : <Skeleton className="h-24" />}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Activity timeline</h3>
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {timeline.map((e: any, i: number) => (
                  <div key={i} className="text-sm border-l-2 border-primary/40 pl-3">
                    <div className="font-medium">{e.event_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.occurred_at).toLocaleString()}
                      {e.college_slug && <> · {e.college_slug}</>}
                      {e.course_slug && <> · {e.course_slug}</>}
                      {e.city && <> · {e.city}</>}
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && <p className="text-sm text-muted-foreground">No events captured yet.</p>}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
