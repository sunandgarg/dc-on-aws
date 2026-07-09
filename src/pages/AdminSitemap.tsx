import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, RefreshCw, Copy } from "lucide-react";

export default function AdminSitemap() {
  const [origin, setOrigin] = useState(typeof window !== "undefined" ? window.location.origin : "https://dekhocampus.com");
  const [xml, setXml] = useState("");
  const [building, setBuilding] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const build = async () => {
    setBuilding(true);
    const today = new Date().toISOString().split("T")[0];
    const urls: { loc: string; pri: number; cf: string }[] = [];

    // static
    [
      ["/", 1.0, "daily"], ["/colleges", 0.9, "daily"], ["/courses", 0.9, "daily"],
      ["/exams", 0.9, "daily"], ["/articles", 0.8, "weekly"], ["/news", 0.8, "daily"],
      ["/careers", 0.8, "weekly"], ["/tools", 0.8, "weekly"],
      ["/legal/privacy-policy", 0.3, "monthly"], ["/legal/terms-of-service", 0.3, "monthly"],
      ["/legal/refund-policy", 0.3, "monthly"], ["/legal/cookie-policy", 0.3, "monthly"],
      ["/legal/about-us", 0.4, "monthly"],
    ].forEach(([loc, pri, cf]) => urls.push({ loc: loc as string, pri: pri as number, cf: cf as string }));

    // Helpful tools (single source of truth)
    const { TOOL_SLUGS } = await import("@/lib/toolsRegistry");
    TOOL_SLUGS.forEach((s) => urls.push({ loc: `/tools/${s}`, pri: 0.7, cf: "monthly" }));

    const tally: Record<string, number> = { static: 13, tools: TOOL_SLUGS.length };

    const fetchSlugs = async (table: string, prefix: string, pri: number, withTabs?: string[]) => {
      const { data } = await supabase.from(table as any).select("slug").eq("is_active", true);
      (data || []).forEach((r: any) => {
        urls.push({ loc: `${prefix}/${r.slug}`, pri, cf: "weekly" });
        // Tab anchors for sub-page indexing
        (withTabs || []).forEach((t) => urls.push({ loc: `${prefix}/${r.slug}/${t}`, pri: pri - 0.1, cf: "weekly" }));
      });
      tally[table] = data?.length || 0;
    };
    await fetchSlugs("colleges", "/colleges", 0.7, [
      "overview", "highlights", "courses-fees", "placements", "faculty", "facilities", "admission", "cutoff", "rankings", "scholarship", "hostel", "gallery", "faq",
    ]);
    await fetchSlugs("courses", "/courses", 0.7, [
      "overview", "highlights", "eligibility", "syllabus", "fees", "admission", "career", "placements", "specializations", "top-exams", "top-colleges", "cutoff", "faq",
    ]);
    // Exams: include all strategy sub-slugs for long-tail SEO ranking
    const { STRATEGY_SLUGS } = await import("@/lib/examStrategies");
    await fetchSlugs("exams", "/exams", 0.7, [
      "overview", "dates", "eligibility", "pattern", "syllabus", "application", "admit-card", "result", "counselling", "cutoff", "preparation", "faq",
      ...STRATEGY_SLUGS,
    ]);
    tally["exam_strategies"] = STRATEGY_SLUGS.length;
    await fetchSlugs("articles", "/articles", 0.6);
    await fetchSlugs("career_profiles", "/careers", 0.6);

    // Programmatic SEO landing pages: city × course-group / stream / type combos
    const cities = ["delhi", "mumbai", "bangalore", "chennai", "hyderabad", "pune", "kolkata", "jaipur", "lucknow", "ahmedabad"];
    const states = ["maharashtra", "karnataka", "tamil-nadu", "uttar-pradesh", "rajasthan", "gujarat", "west-bengal", "telangana", "kerala", "madhya-pradesh", "andhra-pradesh", "bihar", "punjab"];
    const groups = ["btech", "mba", "mbbs", "bba", "bcom", "bsc", "msc", "mca", "bca", "mtech", "llb", "phd"];
    const streams = ["engineering", "medical", "management", "law", "science", "arts", "commerce", "design", "pharmacy"];
    const types = ["", "private", "government"];

    let progCount = 0;
    const allLocs = [...cities, ...states];
    for (const loc of allLocs) {
      for (const grp of groups) {
        for (const t of types) {
          const slugParts = ["top", t, grp, "colleges", "in", loc].filter(Boolean);
          urls.push({ loc: `/colleges/${slugParts.join("-")}`, pri: 0.6, cf: "weekly" });
          progCount++;
        }
      }
      for (const st of streams) {
        urls.push({ loc: `/colleges/top-${st}-colleges-in-${loc}`, pri: 0.55, cf: "weekly" });
        progCount++;
      }
      // Course landing pages
      for (const grp of groups) {
        urls.push({ loc: `/courses/top-${grp}-courses-in-${loc}`, pri: 0.55, cf: "weekly" });
        progCount++;
      }
    }
    // Exam combos
    for (const st of streams) {
      ["national", "state", "university"].forEach((lvl) => {
        urls.push({ loc: `/exams/top-${st}-${lvl}-entrance-exams-in-india`, pri: 0.55, cf: "weekly" });
        progCount++;
      });
    }
    tally["programmatic_seo"] = progCount;

    const xmlOut = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${origin}${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.cf}</changefreq>\n    <priority>${u.pri.toFixed(1)}</priority>\n  </url>`).join("\n")}\n</urlset>`;
    setXml(xmlOut);
    setCounts(tally);
    setBuilding(false);
    toast.success(`Built sitemap with ${urls.length} URLs`);
  };

  const download = () => {
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sitemap.xml"; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => { navigator.clipboard.writeText(xml); toast.success("Copied"); };

  return (
    <AdminLayout title="Sitemap">
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div><Label>Site origin (no trailing slash)</Label><Input value={origin} onChange={e => setOrigin(e.target.value)} /></div>
          <Button onClick={build} disabled={building}><RefreshCw className={`w-4 h-4 mr-1 ${building ? "animate-spin" : ""}`} />{building ? "Building..." : "Build sitemap"}</Button>
        </div>

        {Object.keys(counts).length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(counts).map(([k, v]) => (
              <span key={k} className="px-3 py-1 rounded-full bg-muted">{k}: <b>{v}</b></span>
            ))}
          </div>
        )}

        {xml && (
          <>
            <div className="flex gap-2">
              <Button onClick={download}><Download className="w-4 h-4 mr-1" />Download sitemap.xml</Button>
              <Button variant="outline" onClick={copy}><Copy className="w-4 h-4 mr-1" />Copy</Button>
            </div>
            <Textarea value={xml} readOnly className="font-mono text-xs min-h-[400px]" />
            <p className="text-xs text-muted-foreground">After downloading, place <code>sitemap.xml</code> at your site root and submit it in Google Search Console.</p>
          </>
        )}
      </Card>
    </AdminLayout>
  );
}
