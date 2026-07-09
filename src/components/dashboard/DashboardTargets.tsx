import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Sparkles, Calendar, Trophy, Share2, Download, Lock, Plus, BookOpen, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { downloadRoadmapPDF, type RoadmapData } from "@/lib/targetRoadmapPdf";

interface Row {
  id: string;
  share_token: string;
  slug: string | null;
  target_college: string;
  target_course: string | null;
  class_level: string | null;
  stream: string | null;
  board: string | null;
  current_percent: string | null;
  state: string | null;
  hours_per_day: number | null;
  roadmap: RoadmapData;
  is_primary: boolean;
  created_at: string;
}

export function DashboardTargets() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("target_roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data || []) as any);
      setLoading(false);
    })();
  }, [user]);

  const primary = rows.find((r) => r.is_primary) || rows[0];

  async function makePrimary(id: string) {
    if (!user) return;
    await supabase.from("target_roadmaps").update({ is_primary: false }).eq("user_id", user.id);
    await supabase.from("target_roadmaps").update({ is_primary: true }).eq("id", id);
    setRows((prev) => prev.map((r) => ({ ...r, is_primary: r.id === id })));
    toast.success("Primary target updated");
  }

  async function removeRow(id: string) {
    await supabase.from("target_roadmaps").delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removed");
  }

  async function copyShare(token: string, slug: string | null) {
    const url = `${window.location.origin}/lock-target${slug ? `/${slug}` : ""}?s=${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied 🔗");
  }

  async function downloadPdf(r: Row) {
    try {
      await downloadRoadmapPDF(r.roadmap, {
        targetCollege: r.target_college,
        targetCourse: r.target_course || "",
        classLevel: r.class_level || "",
        stream: r.stream || "",
      });
    } catch {
      toast.error("Couldn't download PDF.");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Target with AI
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1.5">My Target Dashboard</h1>
          <p className="text-sm text-muted-foreground">All your locked dream colleges, predicted fits and AI roadmaps in one place.</p>
        </div>
        <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shrink-0">
          <Link to="/lock-target"><Plus className="w-4 h-4 mr-1.5" /> New target</Link>
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Target className="w-8 h-8 text-orange-600 mx-auto mb-2" />
          <h2 className="text-base font-bold">No target locked yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Lock your dream college and we'll build your personalised AI roadmap.</p>
          <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl">
            <Link to="/lock-target"><Lock className="w-4 h-4 mr-1.5" /> Lock my first target</Link>
          </Button>
        </div>
      )}

      {primary && <PrimaryCard row={primary} onCopyShare={copyShare} onDownload={downloadPdf} />}

      {rows.length > 1 && (
        <div className="mt-6">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-2">Other targets</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {rows.filter((r) => r.id !== primary?.id).map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-foreground truncate">{r.target_college}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.target_course || "—"} · Class {r.class_level || "—"}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0">{new Date(r.created_at).toLocaleDateString()}</Badge>
                </div>
                {r.roadmap?.verdict && <p className="text-[12px] text-foreground/80 mt-2 line-clamp-3">{r.roadmap.verdict}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg" onClick={() => makePrimary(r.id)}>Set primary</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg" onClick={() => copyShare(r.share_token, r.slug)}>
                    <Share2 className="w-3 h-3 mr-1" /> Share
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg" onClick={() => downloadPdf(r)}>
                    <Download className="w-3 h-3 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-lg text-destructive" onClick={() => removeRow(r.id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryCard({ row, onCopyShare, onDownload }: {
  row: Row;
  onCopyShare: (t: string, s: string | null) => void;
  onDownload: (r: Row) => void;
}) {
  const r = row;
  const verdict = r.roadmap?.verdict || "";
  const fit = derivePredictedFit(verdict, r.current_percent);
  const exams = r.roadmap?.entranceExams || [];
  const milestones = r.roadmap?.milestones || [];
  const upcoming = milestones.slice(0, 3);

  return (
    <section className="rounded-3xl bg-gradient-to-br from-orange-500 to-rose-500 text-white p-5 md:p-7 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-10 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider">
          <Lock className="w-3 h-3" /> Locked target
        </div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1.5">
          {r.target_college}{r.target_course ? <span className="opacity-90 font-extrabold"> · {r.target_course}</span> : null}
        </h2>
        <p className="text-[12px] text-white/85 mt-1">Class {r.class_level || "—"} · {r.stream || "—"} · {r.board || "—"} {r.state ? `· ${r.state}` : ""}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="Predicted fit" value={`${fit}%`} icon={<Trophy className="w-3.5 h-3.5" />} />
          <Stat label="Daily hours" value={`${r.hours_per_day || 6}h`} icon={<Calendar className="w-3.5 h-3.5" />} />
          <Stat label="Phases" value={`${milestones.length || 0}`} icon={<Sparkles className="w-3.5 h-3.5" />} />
        </div>
        {verdict && (
          <div className="mt-4 rounded-2xl bg-white/15 backdrop-blur p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">AI verdict</p>
            <p className="text-[13px] leading-relaxed">{verdict}</p>
          </div>
        )}
        {exams.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5">Exams to crack</p>
            <div className="flex flex-wrap gap-1.5">
              {exams.slice(0, 4).map((e, i) => (
                <span key={i} className="text-[11px] font-semibold bg-white/20 px-2 py-1 rounded-full">
                  {e.name}{e.targetScore ? ` · ${e.targetScore}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1.5">Upcoming tasks</p>
            <ul className="space-y-1.5">
              {upcoming.map((m, i) => (
                <li key={i} className="flex gap-2 text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold">{m.phase}</span>
                    {m.focus && <span className="opacity-85"> — {m.focus}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <Button asChild variant="outline" className="h-10 rounded-xl bg-white/15 border-white/40 text-white hover:bg-white/25 text-xs font-bold">
            <Link to={`/lock-target${r.slug ? `/${r.slug}` : ""}?s=${r.share_token}`}>
              <BookOpen className="w-4 h-4 mr-1.5" /> Full roadmap
            </Link>
          </Button>
          <Button variant="outline" className="h-10 rounded-xl bg-white/15 border-white/40 text-white hover:bg-white/25 text-xs font-bold" onClick={() => onCopyShare(r.share_token, r.slug)}>
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
          <Button variant="outline" className="h-10 rounded-xl bg-white text-orange-700 border-white hover:bg-white/95 text-xs font-bold" onClick={() => onDownload(r)}>
            <Download className="w-4 h-4 mr-1.5" /> PDF
          </Button>
        </div>
        <p className="text-[10px] opacity-80 mt-3 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          AI-generated insights. Verify exam dates and cut-offs on the official college / NTA site.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur p-3">
      <div className="flex items-center gap-1.5 text-[10px] opacity-85 uppercase tracking-wider font-bold">{icon} {label}</div>
      <div className="text-xl font-black mt-0.5">{value}</div>
    </div>
  );
}

function derivePredictedFit(verdict: string, currentPercent: string | null): number {
  let base = 55;
  const v = verdict.toLowerCase();
  if (/(very strong|highly achievable|on track|realistic and)/.test(v)) base += 25;
  else if (/(achievable|possible|doable|within reach)/.test(v)) base += 15;
  else if (/(tough|challenging|stretch|ambitious)/.test(v)) base -= 5;
  else if (/(unrealistic|very difficult|extremely hard)/.test(v)) base -= 20;
  const pct = parseFloat(currentPercent || "");
  if (!isNaN(pct)) {
    if (pct >= 90) base += 10;
    else if (pct >= 80) base += 5;
    else if (pct < 60) base -= 8;
  }
  return Math.max(20, Math.min(95, Math.round(base)));
}
