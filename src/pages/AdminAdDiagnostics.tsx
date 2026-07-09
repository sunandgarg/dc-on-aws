import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useAllAds } from "@/hooks/useAds";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type Slot = {
  page: string;
  position: string;
  variant: "leaderboard" | "horizontal" | "vertical" | "square";
  itemSlug?: string;
  city?: string;
};

const STANDARD_SLOTS: Slot[] = [
  { page: "homepage", position: "leaderboard", variant: "leaderboard" },
  { page: "homepage", position: "mid-page", variant: "leaderboard" },
  { page: "homepage", position: "mid-page", variant: "horizontal" },
  { page: "colleges", position: "leaderboard", variant: "leaderboard" },
  { page: "courses", position: "leaderboard", variant: "leaderboard" },
  { page: "exams", position: "leaderboard", variant: "leaderboard" },
  { page: "careers", position: "leaderboard", variant: "leaderboard" },
  { page: "news", position: "leaderboard", variant: "leaderboard" },
  { page: "college-detail", position: "sidebar", variant: "vertical" },
  { page: "college-detail", position: "sidebar", variant: "square" },
  { page: "course-detail", position: "sidebar", variant: "vertical" },
  { page: "exam-detail", position: "sidebar", variant: "vertical" },
];

function resolve(ads: any[], slot: Slot) {
  let candidates = ads.filter((a) => a.is_active);
  candidates = candidates.filter((a) => a.variant === slot.variant && a.position === slot.position);
  if (slot.itemSlug) {
    const m = candidates.find((a) => a.target_type === "item" && a.target_item_slug === slot.itemSlug);
    if (m) return { ad: m, reason: "Matched by item slug" };
  }
  if (slot.page && slot.city) {
    const m = candidates.find((a) => a.target_type === "page" && a.target_page === slot.page && a.target_city === slot.city);
    if (m) return { ad: m, reason: "Matched by page + city" };
  }
  if (slot.page) {
    const m = candidates.find((a) => a.target_type === "page" && a.target_page === slot.page && !a.target_city);
    if (m) return { ad: m, reason: "Matched by page" };
  }
  if (slot.city) {
    const m = candidates.find((a) => a.target_type === "city" && a.target_city === slot.city);
    if (m) return { ad: m, reason: "Matched by city" };
  }
  const u = candidates.find((a) => a.target_type === "universal");
  if (u) return { ad: u, reason: "Universal fallback" };
  return { ad: null, reason: `No active ad with variant=${slot.variant} & position=${slot.position}` };
}

export default function AdminAdDiagnostics() {
  const { data: ads = [], isLoading } = useAllAds();
  const [city, setCity] = useState("");
  const [itemSlug, setItemSlug] = useState("");

  const rows = useMemo(() => {
    return STANDARD_SLOTS.map((s) => {
      const slot = { ...s, city: city || undefined, itemSlug: s.page.endsWith("-detail") ? itemSlug || undefined : undefined };
      return { slot, ...resolve(ads, slot) };
    });
  }, [ads, city, itemSlug]);

  return (
    <AdminLayout title="Ad Diagnostics">
      <div className="space-y-4">
        <Card className="p-4 grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">City filter (optional)</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bangalore" />
          </div>
          <div>
            <label className="text-sm font-medium">Item slug (for *-detail pages)</label>
            <Input value={itemSlug} onChange={(e) => setItemSlug(e.target.value)} placeholder="e.g. iisc-bangalore" />
          </div>
        </Card>

        <Card className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading ads…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">Page</th>
                    <th className="py-2 pr-3">Position</th>
                    <th className="py-2 pr-3">Variant</th>
                    <th className="py-2 pr-3">Resolved Ad</th>
                    <th className="py-2 pr-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{r.slot.page}</td>
                      <td className="py-2 pr-3">{r.slot.position}</td>
                      <td className="py-2 pr-3"><Badge variant="outline">{r.slot.variant}</Badge></td>
                      <td className="py-2 pr-3">
                        {r.ad ? (
                          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" />{r.ad.title}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600"><AlertTriangle className="w-4 h-4" />Empty</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">All active ads ({ads.filter((a: any) => a.is_active).length} of {ads.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="py-1.5 pr-2">Title</th><th>Variant</th><th>Position</th><th>Target</th><th>Priority</th><th>Active</th></tr>
              </thead>
              <tbody>
                {ads.map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">{a.title}</td>
                    <td>{a.variant}</td>
                    <td>{a.position}</td>
                    <td>{a.target_type}{a.target_page ? `:${a.target_page}` : ""}{a.target_item_slug ? `:${a.target_item_slug}` : ""}{a.target_city ? `@${a.target_city}` : ""}</td>
                    <td>{a.priority}</td>
                    <td>{a.is_active ? "✓" : "✗"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
