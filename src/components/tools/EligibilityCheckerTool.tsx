import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export function EligibilityCheckerTool() {
  const [pct, setPct] = useState("");
  const [cat, setCat] = useState("General");
  const [res, setRes] = useState<string[] | null>(null);

  const check = () => {
    const p = parseFloat(pct);
    if (isNaN(p)) return;
    const r: string[] = [];
    if (p >= 75 || (cat !== "General" && p >= 65)) { r.push("IITs (via JEE Advanced)"); r.push("NITs (via JEE Main)"); }
    if (p >= 60) r.push("State Engineering Colleges");
    if (p >= 50) { r.push("NEET eligible medical colleges"); r.push("Most Private Universities"); }
    if (r.length === 0) r.push("Check specific college requirements");
    setRes(r);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">College Eligibility Checker</h3>
      <p className="text-sm text-muted-foreground">Check which colleges you're eligible for based on your academics.</p>
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" value={pct} onChange={e => setPct(e.target.value)} placeholder="12th % or CGPA×9.5" className="rounded-xl" />
        <select value={cat} onChange={e => setCat(e.target.value)} className="h-10 px-3 rounded-xl border border-border bg-card text-sm">
          {["General", "OBC", "SC", "ST", "EWS"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Button onClick={check} className="gradient-primary text-primary-foreground rounded-xl w-full">Check Eligibility</Button>
      {res && (
        <div className="bg-muted/40 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">You're eligible for:</p>
          <ul className="space-y-1.5">
            {res.map(r => (
              <li key={r} className="flex items-center gap-2 text-sm text-foreground">
                <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
