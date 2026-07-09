import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RankPredictorTool() {
  const [examName, setExamName] = useState("JEE Main");
  const [score, setScore] = useState("");
  const [rank, setRank] = useState<string | null>(null);

  const predict = () => {
    const s = parseFloat(score);
    if (isNaN(s)) return;
    const r: Record<string, (s: number) => string> = {
      "JEE Main": (s) => s >= 250 ? "Under 1,000" : s >= 200 ? "1,000 - 5,000" : s >= 150 ? "5,000 - 25,000" : s >= 100 ? "25,000 - 1,00,000" : "Above 1,00,000",
      "NEET": (s) => s >= 650 ? "Under 1,000" : s >= 550 ? "1,000 - 10,000" : s >= 450 ? "10,000 - 50,000" : s >= 350 ? "50,000 - 2,00,000" : "Above 2,00,000",
      "CAT": (s) => s >= 99 ? "Under 100" : s >= 95 ? "100 - 500" : s >= 90 ? "500 - 2,000" : s >= 80 ? "2,000 - 10,000" : "Above 10,000",
    };
    setRank(r[examName]?.(s) ?? "N/A");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground">Exam Rank Predictor</h3>
      <p className="text-sm text-muted-foreground">Get an estimated rank based on your score.</p>
      <div className="flex gap-2">
        {["JEE Main", "NEET", "CAT"].map(e => (
          <button key={e} onClick={() => { setExamName(e); setRank(null); }} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${examName === e ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{e}</button>
        ))}
      </div>
      <div className="flex gap-3">
        <Input type="number" value={score} onChange={e => setScore(e.target.value)} placeholder={examName === "CAT" ? "Percentile (0-100)" : "Expected Score"} className="flex-1 rounded-xl" />
        <Button onClick={predict} className="gradient-primary text-primary-foreground rounded-xl">Predict</Button>
      </div>
      {rank && (
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Predicted Rank Range</p>
          <p className="text-2xl font-bold text-foreground">{rank}</p>
          <p className="text-xs text-muted-foreground">*Based on previous year trends</p>
        </div>
      )}
    </div>
  );
}
