import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EMICalculatorTool() {
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [emi, setEmi] = useState<number | null>(null);

  const calc = () => {
    const P = parseFloat(loanAmount);
    const r = parseFloat(interestRate) / 12 / 100;
    const n = parseFloat(tenure) * 12;
    if (isNaN(P) || isNaN(r) || isNaN(n) || n === 0) return;
    setEmi(Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">Education Loan EMI Calculator</h3>
      <p className="text-sm text-muted-foreground">Plan your education loan repayment.</p>
      <div className="grid grid-cols-3 gap-3">
        <Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="Loan (₹)" className="rounded-xl" />
        <Input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="Rate (%)" className="rounded-xl" />
        <Input type="number" value={tenure} onChange={e => setTenure(e.target.value)} placeholder="Years" className="rounded-xl" />
      </div>
      <Button onClick={calc} className="gradient-primary text-primary-foreground rounded-xl w-full">Calculate EMI</Button>
      {emi !== null && (
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Monthly EMI</p>
          <p className="text-3xl font-bold text-foreground">₹{emi.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">Total: ₹{(emi * parseFloat(tenure) * 12).toLocaleString("en-IN")}</p>
        </div>
      )}
    </div>
  );
}
