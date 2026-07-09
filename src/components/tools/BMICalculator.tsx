import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BMICalculator() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState<"cm" | "ft">("cm");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    let h: number;
    if (unit === "cm") {
      h = parseFloat(height) / 100;
    } else {
      const ft = parseFloat(feet) || 0;
      const inc = parseFloat(inches) || 0;
      h = (ft * 12 + inc) * 0.0254;
    }
    if (isNaN(w) || isNaN(h) || h === 0 || w <= 0) return;
    setBmi(Math.round((w / (h * h)) * 10) / 10);
  };

  const getCategory = (val: number) => {
    if (val < 18.5) return { label: "Underweight", color: "text-warning" };
    if (val < 25) return { label: "Normal Weight", color: "text-success" };
    if (val < 30) return { label: "Overweight", color: "text-primary" };
    return { label: "Obese", color: "text-destructive" };
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">BMI Calculator</h3>
      <p className="text-sm text-muted-foreground">Calculate your Body Mass Index to check if you're at a healthy weight.</p>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Weight (kg)</label>
        <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g., 65" className="rounded-xl" />
      </div>

      <div className="flex gap-2">
        {(["cm", "ft"] as const).map(u => (
          <button key={u} onClick={() => setUnit(u)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${unit === u ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}>
            {u === "cm" ? "Centimeters" : "Feet & Inches"}
          </button>
        ))}
      </div>

      {unit === "cm" ? (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Height (cm)</label>
          <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g., 170" className="rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Feet</label>
            <Input type="number" value={feet} onChange={e => setFeet(e.target.value)} placeholder="5" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Inches</label>
            <Input type="number" value={inches} onChange={e => setInches(e.target.value)} placeholder="8" className="rounded-xl" />
          </div>
        </div>
      )}

      <Button onClick={calculate} className="gradient-primary text-primary-foreground rounded-xl w-full">Calculate BMI</Button>

      {bmi !== null && (
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">Your BMI</p>
          <p className="text-3xl font-bold text-foreground">{bmi}</p>
          <p className={`text-sm font-semibold ${getCategory(bmi).color}`}>{getCategory(bmi).label}</p>
          <div className="w-full bg-muted rounded-full h-2 mt-3">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min((bmi / 40) * 100, 100)}%`,
                background: bmi < 18.5 ? "hsl(var(--warning))" : bmi < 25 ? "hsl(var(--success))" : bmi < 30 ? "hsl(var(--primary))" : "hsl(var(--destructive))",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            <span>Under 18.5</span><span>18.5–25</span><span>25–30</span><span>30+</span>
          </div>
        </div>
      )}
    </div>
  );
}
