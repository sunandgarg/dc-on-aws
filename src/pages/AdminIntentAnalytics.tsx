import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, GitCompare, TrendingUp, DollarSign, GraduationCap, Megaphone, Link2 } from "lucide-react";

type Row = { key: string; count: number };

export default function AdminIntentAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, Row[]>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const agg = async (filter: Record<string, string>, field: string): Promise<Row[]> => {
        let q: any = supabase.from("intent_events").select(field).not(field, "is", null).limit(5000);
        for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
        const { data } = await q;
        const map = new Map<string, number>();
        for (const r of (data as any[]) || []) {
          const k = (r as any)[field];
          if (k) map.set(k, (map.get(k) || 0) + 1);
        }
        return Array.from(map.entries()).map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count).slice(0, 10);
      };

      const aggScore = async (col: string): Promise<Row[]> => {
        const { data } = await supabase.from("intent_lead_scores").select(col)
          .gte("score", 71).not(col, "is", null).limit(5000);
        const map = new Map<string, number>();
        for (const r of (data as any[]) || []) {
          const k = (r as any)[col];
          if (k) map.set(k, (map.get(k) || 0) + 1);
        }
        return Array.from(map.entries()).map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count).slice(0, 10);
      };

      const [viewed, compared, courses, feeSens, admReady, sources, campaigns] = await Promise.all([
        agg({ event_type: "college_viewed" }, "college_slug"),
        agg({ event_type: "compare_colleges" }, "college_slug"),
        aggScore("top_course_slug"),
        agg({ event_type: "fee_viewed" }, "college_slug"),
        (async () => {
          const { data } = await supabase.from("intent_lead_scores").select("top_college_slug")
            .eq("category", "admission_ready").not("top_college_slug", "is", null).limit(2000);
          const map = new Map<string, number>();
          for (const r of (data as any[]) || []) {
            const k = r.top_college_slug; if (k) map.set(k, (map.get(k) || 0) + 1);
          }
          return Array.from(map.entries()).map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count).slice(0, 10);
        })(),
        agg({}, "utm_source"),
        agg({}, "utm_campaign"),
      ]);

      setData({ viewed, compared, courses, feeSens, admReady, sources, campaigns });
      setLoading(false);
    })();
  }, []);

  const Panel = ({ title, icon: Icon, rows, empty }: { title: string; icon: any; rows: Row[]; empty: string }) => (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {loading ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="flex items-center justify-between text-sm border-b pb-1.5">
              <div className="flex items-center gap-2 truncate">
                <span className="text-muted-foreground w-5">#{i + 1}</span>
                <span className="font-mono truncate">{r.key}</span>
              </div>
              <Badge variant="secondary">{r.count}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <AdminLayout title="Intent Analytics">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Intent Analytics</h1>
          <p className="text-muted-foreground">Behavioral insights derived from tracked events and lead scores.</p>
        </div>

        <Tabs defaultValue="colleges">
          <TabsList>
            <TabsTrigger value="colleges">Colleges & Courses</TabsTrigger>
            <TabsTrigger value="segments">Lead Segments</TabsTrigger>
            <TabsTrigger value="attribution">Source & Campaign</TabsTrigger>
          </TabsList>

          <TabsContent value="colleges" className="grid md:grid-cols-2 gap-4">
            <Panel title="Most Viewed Colleges" icon={Eye} rows={data.viewed || []} empty="No college views yet" />
            <Panel title="Most Compared Colleges" icon={GitCompare} rows={data.compared || []} empty="No compare events yet" />
            <Panel title="Highest Converting Courses (warm+)" icon={TrendingUp} rows={data.courses || []} empty="No course conversions yet" />
          </TabsContent>

          <TabsContent value="segments" className="grid md:grid-cols-2 gap-4">
            <Panel title="Fee-Sensitive Students (fee_viewed)" icon={DollarSign} rows={data.feeSens || []} empty="No fee views yet" />
            <Panel title="Admission Ready Students by College" icon={GraduationCap} rows={data.admReady || []} empty="No admission-ready leads yet" />
          </TabsContent>

          <TabsContent value="attribution" className="grid md:grid-cols-2 gap-4">
            <Panel title="Source-wise Activity" icon={Link2} rows={data.sources || []} empty="No tracked sources yet" />
            <Panel title="Campaign-wise Activity" icon={Megaphone} rows={data.campaigns || []} empty="No tracked campaigns yet" />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
