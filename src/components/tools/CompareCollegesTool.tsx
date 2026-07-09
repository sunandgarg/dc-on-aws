import { useEffect, useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface CollegeRow {
  slug: string;
  name: string;
  short_name?: string | null;
  city?: string | null;
  state?: string | null;
  fees?: string | null;
  placement?: string | null;
  ranking?: string | null;
  rating?: number | null;
  naac_grade?: string | null;
}

export function CompareCollegesTool() {
  const [all, setAll] = useState<CollegeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [c1, setC1] = useState<CollegeRow | null>(null);
  const [c2, setC2] = useState<CollegeRow | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("colleges")
        .select("slug,name,short_name,city,state,fees,placement,ranking,rating,naac_grade")
        .order("rating", { ascending: false })
        .limit(500);
      if (mounted) {
        setAll((data as any) || []);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">Compare Colleges Side-by-Side</h3>
      <p className="text-sm text-muted-foreground">
        Pick any two colleges from your live directory to compare fees, placements, ranking and rating.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading colleges…
        </div>
      ) : (
        <>
          <Picker
            label="First college"
            options={all.filter((c) => c.slug !== c2?.slug)}
            value={c1}
            onChange={(v) => {
              setC1(v);
              setShow(false);
            }}
          />
          <Picker
            label="Second college"
            options={all.filter((c) => c.slug !== c1?.slug)}
            value={c2}
            onChange={(v) => {
              setC2(v);
              setShow(false);
            }}
          />

          <Button
            onClick={() => setShow(true)}
            disabled={!c1 || !c2}
            className="bg-primary text-primary-foreground rounded-xl"
          >
            Compare Now <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {show && c1 && c2 && (
            <div className="grid grid-cols-3 gap-2 text-sm mt-4">
              <div className="text-center font-semibold py-2">{c1.short_name || c1.name}</div>
              <div className="text-center text-muted-foreground py-2">vs</div>
              <div className="text-center font-semibold py-2">{c2.short_name || c2.name}</div>
              {[
                { l: "Location", v1: [c1.city, c1.state].filter(Boolean).join(", ") || "-", v2: [c2.city, c2.state].filter(Boolean).join(", ") || "-" },
                { l: "Ranking", v1: c1.ranking || "-", v2: c2.ranking || "-" },
                { l: "Rating", v1: c1.rating ? `${c1.rating}★` : "-", v2: c2.rating ? `${c2.rating}★` : "-" },
                { l: "Fees", v1: c1.fees || "-", v2: c2.fees || "-" },
                { l: "Placement", v1: c1.placement || "-", v2: c2.placement || "-" },
                { l: "NAAC", v1: c1.naac_grade || "-", v2: c2.naac_grade || "-" },
              ].map((r) => (
                <div key={r.l} className="contents">
                  <div className="text-center bg-muted/50 rounded-lg py-2 text-xs">{r.v1}</div>
                  <div className="text-center text-xs text-muted-foreground py-2">{r.l}</div>
                  <div className="text-center bg-muted/50 rounded-lg py-2 text-xs">{r.v2}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Picker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: CollegeRow[];
  value: CollegeRow | null;
  onChange: (v: CollegeRow | null) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = q
    ? options
        .filter((o) =>
          [o.name, o.short_name, o.city].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
        )
        .slice(0, 30)
    : options.slice(0, 30);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 rounded-xl border border-border focus-within:border-primary/40">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={open ? q : value ? value.name : ""}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange(null);
          }}
          onFocus={() => {
            setOpen(true);
            setQ("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={`Search ${label.toLowerCase()}...`}
          className="flex-1 bg-transparent border-0 text-sm focus:outline-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((o) => (
            <button
              key={o.slug}
              onClick={() => {
                onChange(o);
                setOpen(false);
                setQ("");
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <div className="font-medium text-foreground">{o.name}</div>
              {(o.city || o.state) && (
                <div className="text-[11px] text-muted-foreground">
                  {[o.city, o.state].filter(Boolean).join(", ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
