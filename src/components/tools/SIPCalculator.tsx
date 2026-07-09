import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SIPResult {
  totalInvested: number;
  estimatedReturns: number;
  totalValue: number;
}

export function SIPCalculator() {
  const [monthly, setMonthly] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<SIPResult | null>(null);

  const calculate = () => {
    const P = parseFloat(monthly);
    const annualRate = parseFloat(rate);
    const n = parseFloat(years) * 12;
    if (isNaN(P) || isNaN(annualRate) || isNaN(n) || P <= 0 || n <= 0 || annualRate < 0) return;

    const i = annualRate / 12 / 100;
    const totalValue = i === 0 ? P * n : P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const totalInvested = P * n;

    setResult({
      totalInvested: Math.round(totalInvested),
      estimatedReturns: Math.round(totalValue - totalInvested),
      totalValue: Math.round(totalValue),
    });
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">SIP Calculator</h3>
      <p className="text-sm text-muted-foreground">Plan your investments with a Systematic Investment Plan calculator.</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Monthly Investment (₹)</label>
          <Input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="e.g., 5000" className="rounded-xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Expected Annual Return (%)</label>
          <Input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g., 12" className="rounded-xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Time Period (Years)</label>
          <Input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="e.g., 10" className="rounded-xl" />
        </div>
      </div>

      <Button onClick={calculate} className="gradient-primary text-primary-foreground rounded-xl w-full">Calculate Returns</Button>

      {result && (
        <div className="space-y-3">
          <div className="bg-muted/40 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Value</p>
            <p className="text-2xl font-bold text-foreground">{fmt(result.totalValue)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-foreground">{fmt(result.totalInvested)}</p>
              <p className="text-[10px] text-muted-foreground">Total Invested</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-success">{fmt(result.estimatedReturns)}</p>
              <p className="text-[10px] text-muted-foreground">Est. Returns</p>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden h-4 bg-muted flex">
            <div className="bg-primary h-full transition-all" style={{ width: `${(result.totalInvested / result.totalValue) * 100}%` }} />
            <div className="bg-success h-full transition-all" style={{ width: `${(result.estimatedReturns / result.totalValue) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Invested</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />Returns</span>
          </div>
        </div>
      )}
    </div>
  );
}
