import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  nextBirthday: number;
}

export function AgeCalculator() {
  const [dob, setDob] = useState("");
  const [result, setResult] = useState<AgeResult | null>(null);

  const calculate = () => {
    if (!dob) return;
    const birthDate = new Date(dob);
    const today = new Date();
    if (birthDate > today) return;

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalMonths = years * 12 + months;

    const nextBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBday <= today) nextBday.setFullYear(nextBday.getFullYear() + 1);
    const nextBirthday = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    setResult({ years, months, days, totalDays, totalMonths, nextBirthday });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">Age Calculator</h3>
      <p className="text-sm text-muted-foreground">Calculate your exact age in years, months, and days from your date of birth.</p>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Date of Birth</label>
        <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="rounded-xl" max={new Date().toISOString().split("T")[0]} />
      </div>

      <Button onClick={calculate} className="gradient-primary text-primary-foreground rounded-xl w-full">Calculate Age</Button>

      {result && (
        <div className="space-y-3">
          <div className="bg-muted/40 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Your Age</p>
            <p className="text-2xl font-bold text-foreground">
              {result.years} <span className="text-sm font-normal text-muted-foreground">yrs</span>{" "}
              {result.months} <span className="text-sm font-normal text-muted-foreground">mo</span>{" "}
              {result.days} <span className="text-sm font-normal text-muted-foreground">days</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{result.totalMonths.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Months</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{result.totalDays.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Days</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{result.nextBirthday}</p>
              <p className="text-[10px] text-muted-foreground">Days to B'day 🎂</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
