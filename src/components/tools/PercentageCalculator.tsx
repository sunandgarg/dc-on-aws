import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CalcMode = "whatPercent" | "percentOf" | "increase" | "decrease";

const modes: { id: CalcMode; label: string }[] = [
  { id: "whatPercent", label: "A is what % of B" },
  { id: "percentOf", label: "A% of B" },
  { id: "increase", label: "% Increase" },
  { id: "decrease", label: "% Decrease" },
];

const labels: Record<CalcMode, [string, string]> = {
  whatPercent: ["Value (A)", "Total (B)"],
  percentOf: ["Percentage (A)", "Number (B)"],
  increase: ["Original Value", "New Value"],
  decrease: ["Original Value", "New Value"],
};

export function PercentageCalculator() {
  const [mode, setMode] = useState<CalcMode>("whatPercent");
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const calculate = () => {
    const a = parseFloat(val1);
    const b = parseFloat(val2);
    if (isNaN(a) || isNaN(b)) return;

    switch (mode) {
      case "whatPercent":
        if (b === 0) return;
        setResult(`${a} is ${((a / b) * 100).toFixed(2)}% of ${b}`);
        break;
      case "percentOf":
        setResult(`${a}% of ${b} = ${((a / 100) * b).toFixed(2)}`);
        break;
      case "increase":
        if (a === 0) return;
        setResult(`Increase: ${(((b - a) / a) * 100).toFixed(2)}%`);
        break;
      case "decrease":
        if (a === 0) return;
        setResult(`Decrease: ${(((a - b) / a) * 100).toFixed(2)}%`);
        break;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">Percentage Calculator</h3>
      <p className="text-sm text-muted-foreground">Calculate percentages, increases, and decreases easily.</p>

      <div className="flex flex-wrap gap-2">
        {modes.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setResult(null); setVal1(""); setVal2(""); }}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{labels[mode][0]}</label>
          <Input type="number" value={val1} onChange={e => setVal1(e.target.value)} placeholder="Enter value" className="rounded-xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{labels[mode][1]}</label>
          <Input type="number" value={val2} onChange={e => setVal2(e.target.value)} placeholder="Enter value" className="rounded-xl" />
        </div>
      </div>

      <Button onClick={calculate} className="gradient-primary text-primary-foreground rounded-xl w-full">Calculate</Button>

      {result && (
        <div className="bg-muted/40 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Result</p>
          <p className="text-xl font-bold text-foreground">{result}</p>
        </div>
      )}
    </div>
  );
}
