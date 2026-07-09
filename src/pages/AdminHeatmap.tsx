import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminHeatmap() {
  const [path, setPath] = useState("/");
  const [days, setDays] = useState(7);

  const { data: clicks = [], isLoading } = useQuery({
    queryKey: ["heatmap", path, days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await (supabase as any)
        .from("user_events")
        .select("x, y, vw, vh, event_type")
        .eq("path", path)
        .in("event_type", ["click", "tracked_click", "link_click", "button_click", "rage_click"])
        .gte("created_at", since)
        .not("x", "is", null)
        .limit(20000);
      return data || [];
    },
  });

  // Normalize to a 1200×800 canvas
  const W = 1200, H = 800;
  const points = useMemo(() => (clicks as any[]).map(c => {
    const sx = c.vw ? W / c.vw : 1;
    const sy = c.vh ? H / c.vh : 1;
    return { x: Math.round(c.x * sx), y: Math.round(c.y * sy), rage: c.event_type === "rage_click" };
  }), [clicks]);

  return (
    <AdminLayout title="Click Heatmap">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/colleges/iit-bombay" className="max-w-md h-9" />
        <Input type="number" value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 7))} className="w-24 h-9" />
        <span className="text-xs text-muted-foreground">{(clicks as any[]).length.toLocaleString()} clicks</span>
      </div>

      <Card className="p-4 overflow-auto">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        <div
          className="relative bg-muted/30 rounded-md mx-auto border border-border"
          style={{ width: W, height: H }}
        >
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: p.x - 12, top: p.y - 12, width: 24, height: 24,
                background: p.rage
                  ? "radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0) 70%)"
                  : "radial-gradient(circle, rgba(255,140,0,0.55) 0%, rgba(255,140,0,0) 70%)",
                mixBlendMode: "multiply",
              }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Orange = clicks, red = rage clicks. Coordinates normalised to a 1200×800 reference. Use the path field above to switch pages (e.g. <code>/colleges/iit-bombay</code>, <code>/courses/btech</code>).
        </p>
      </Card>
    </AdminLayout>
  );
}
