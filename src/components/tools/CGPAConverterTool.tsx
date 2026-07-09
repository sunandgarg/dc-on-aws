import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CT = "sgpa-percentage" | "cgpa-percentage" | "sgpa-cgpa";

export function CGPAConverterTool() {
  const [type, setType] = useState<CT>("sgpa-percentage");
  const [val, setVal] = useState("");
  const [res, setRes] = useState<number | null>(null);
  const convert = () => { const v = parseFloat(val); if (isNaN(v)) return; setRes(Math.round((type === "sgpa-cgpa" ? v : (v - 0.75) * 10) * 100) / 100); };
  const labels: Record<CT, [string, string]> = { "sgpa-percentage": ["SGPA (0-10)", "Percentage"], "cgpa-percentage": ["CGPA (0-10)", "Percentage"], "sgpa-cgpa": ["SGPA (0-10)", "CGPA"] };
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">Academic Score Converter</h3>
      <div className="flex flex-wrap gap-2">
        {(["sgpa-percentage", "cgpa-percentage", "sgpa-cgpa"] as CT[]).map(t => (
          <button key={t} onClick={() => { setType(t); setRes(null); setVal(""); }} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${type === t ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}>
            {t === "sgpa-percentage" ? "SGPA → %" : t === "cgpa-percentage" ? "CGPA → %" : "SGPA → CGPA"}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <Input type="number" step="0.01" min="0" max="10" value={val} onChange={e => setVal(e.target.value)} placeholder={labels[type][0]} className="flex-1 rounded-xl" />
        <Button onClick={convert} className="gradient-primary text-primary-foreground rounded-xl">Convert</Button>
      </div>
      <div className="bg-muted/40 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">{labels[type][1]}</p>
        <p className="text-3xl font-bold text-foreground">{res !== null ? `${res}${type.includes("percentage") ? "%" : ""}` : "--"}</p>
      </div>
    </div>
  );
}
