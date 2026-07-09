import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AlsoCheckSection } from "@/components/AlsoCheckSection";
import { Button } from "@/components/ui/button";
import { GitCompareArrows, Plus, X, ArrowRight } from "lucide-react";
import { useCompare } from "@/contexts/CompareContext";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

interface Row { slug: string; name: string; short_name?: string; image?: string; city?: string; state?: string; fees?: string; placement?: string; ranking?: string; rating?: number; naac_grade?: string; type?: string; established?: number; courses_count?: number; }

const FIELDS: { key: keyof Row; label: string; format?: (v: any) => string }[] = [
  { key: "type", label: "Type" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "established", label: "Established", format: (v) => (v ? String(v) : "-") },
  { key: "ranking", label: "Ranking" },
  { key: "rating", label: "Rating", format: (v) => (v ? `${v}★` : "-") },
  { key: "fees", label: "Fees" },
  { key: "placement", label: "Avg. Placement" },
  { key: "naac_grade", label: "NAAC" },
  { key: "courses_count", label: "Courses", format: (v) => (v ? `${v}+` : "-") },
];

export default function ComparePage() {
  const { items, remove, toggle, max } = useCompare();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [allOpen, setAllOpen] = useState(false);
  const [all, setAll] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useSEO({ title: "Compare Colleges Side-by-Side | DekhoCampus", description: "Compare colleges on fees, placements, ranking, NAAC and more." });

  useEffect(() => {
    if (items.length < 2) setAllOpen(true);
  }, [items.length]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!items.length) { setRows([]); setLoading(false); return; }
      setLoading(true);
      const slugs = items.map((i) => i.slug);
      const { data } = await supabase
        .from("colleges")
        .select("slug,name,short_name,image,city,state,fees,placement,ranking,rating,naac_grade,type,established,courses_count")
        .in("slug", slugs);
      if (!mounted) return;
      const map = new Map((data || []).map((d: any) => [d.slug, d]));
      setRows(slugs.map((s) => map.get(s)).filter(Boolean) as Row[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [items]);

  useEffect(() => {
    if (!allOpen) return;
    (async () => {
      const { data } = await supabase
        .from("colleges")
        .select("slug,name,short_name,image,city,state")
        .order("rating", { ascending: false })
        .limit(300);
      setAll((data as any) || []);
    })();
  }, [allOpen]);

  const filteredAll = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all.slice(0, 50);
    return all.filter((c) => `${c.name} ${c.short_name ?? ""} ${c.city ?? ""}`.toLowerCase().includes(t)).slice(0, 50);
  }, [all, q]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6 md:py-10">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <GitCompareArrows className="w-6 h-6 text-primary" /> Compare Colleges
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Add up to {max} colleges and view them side-by-side.</p>
          </div>
          <Link to="/colleges"><Button variant="outline" className="rounded-xl">Browse Colleges <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
        </div>

        <AlsoCheckSection variant="strip" className="mb-6" />

        {!items.length ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <GitCompareArrows className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">You haven't added any colleges to compare yet.</p>
            <Button onClick={() => setAllOpen(true)}>Add a college</Button>
          </div>
        ) : loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left p-4 w-40 bg-muted/40">Attribute</th>
                  {rows.map((c) => (
                    <th key={c.slug} className="p-4 text-left align-top min-w-[200px]">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/colleges/${c.slug}`} className="block">
                          {c.image && <img src={c.image} alt={c.name} className="w-full h-24 object-cover rounded-lg mb-2" loading="lazy" />}
                          <div className="font-bold text-foreground hover:text-primary">{c.short_name || c.name}</div>
                          <div className="text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ")}</div>
                        </Link>
                        <button onClick={() => remove(c.slug)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                  {rows.length < max && (
                    <th className="p-4 align-top min-w-[160px]">
                      <button
                        onClick={() => setAllOpen(true)}
                        className="w-full h-full min-h-[120px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:border-primary transition"
                      >
                        <Plus className="w-5 h-5" /> Add college
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => (
                  <tr key={f.key as string} className="border-t border-border">
                    <td className="p-4 font-medium text-muted-foreground bg-muted/20">{f.label}</td>
                    {rows.map((c) => (
                      <td key={c.slug} className="p-4 text-foreground">
                        {f.format ? f.format(c[f.key]) : ((c[f.key] as any) || "-")}
                      </td>
                    ))}
                    {rows.length < max && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {allOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAllOpen(false)}>
            <div className="bg-card rounded-2xl border border-border w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Add a college</h3>
                <button onClick={() => setAllOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search colleges…"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm mb-3"
              />
              <div className="max-h-80 overflow-y-auto space-y-1">
                {filteredAll.map((c) => {
                  const already = items.some((i) => i.slug === c.slug);
                  return (
                    <button
                      key={c.slug}
                      onClick={() => { toggle(c); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-muted ${already ? "bg-primary/10" : ""}`}
                    >
                      <span>
                        <span className="font-medium">{c.name}</span>
                        {(c.city || c.state) && <span className="text-xs text-muted-foreground ml-2">{[c.city, c.state].filter(Boolean).join(", ")}</span>}
                      </span>
                      {already ? <X className="w-4 h-4 text-destructive" /> : <Plus className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
