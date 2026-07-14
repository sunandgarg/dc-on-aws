import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, CalendarDays, Coins, Image, MessageSquareText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = { compact?: boolean };
const PROVIDER_LABELS: Record<string, string> = { anthropic: "Claude", openai: "ChatGPT / OpenAI", gemini: "Gemini" };
const PROVIDER_TONES: Record<string, string> = { anthropic: "bg-orange-50 text-orange-700", openai: "bg-emerald-50 text-emerald-700", gemini: "bg-blue-50 text-blue-700" };

export function AIUsageDashboard({ compact = false }: Props) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ai-usage-dashboard"],
    queryFn: async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [events, budgets] = await Promise.all([
        (supabase as any).from("ai_usage_events").select("provider,model,feature,input_tokens,output_tokens,image_count,estimated_cost_usd,created_at").gte("created_at", monthStart.toISOString()).order("created_at", { ascending: false }).limit(10000),
        (supabase as any).from("ai_budget_settings").select("provider,monthly_budget_usd,baseline_spend_usd"),
      ]);
      if (events.error) throw events.error;
      if (budgets.error) throw budgets.error;
      return { events: events.data || [], budgets: budgets.data || [] };
    },
    staleTime: 30_000,
  });
  const saveBudget = useMutation({ mutationFn: async ({ provider, field, value }: { provider: string; field: "monthly_budget_usd" | "baseline_spend_usd"; value: number }) => { const { error } = await (supabase as any).from("ai_budget_settings").update({ [field]: Math.max(0, value), updated_at: new Date().toISOString() }).eq("provider", provider); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-usage-dashboard"] }); toast.success("AI budget updated"); }, onError: (error: Error) => toast.error(error.message) });

  const summary = useMemo(() => {
    const rows = new Map<string, any>();
    for (const budget of query.data?.budgets || []) rows.set(budget.provider, { ...budget, tracked: 0, tokens: 0, requests: 0, images: 0, features: new Map<string, number>(), models: new Map<string, number>() });
    for (const event of query.data?.events || []) {
      const row = rows.get(event.provider) || { provider: event.provider, monthly_budget_usd: 0, baseline_spend_usd: 0, tracked: 0, tokens: 0, requests: 0, images: 0, features: new Map(), models: new Map() };
      row.tracked += Number(event.estimated_cost_usd || 0); row.tokens += Number(event.input_tokens || 0) + Number(event.output_tokens || 0); row.requests += 1; row.images += Number(event.image_count || 0);
      row.features.set(event.feature, (row.features.get(event.feature) || 0) + 1); row.models.set(event.model, (row.models.get(event.model) || 0) + 1); rows.set(event.provider, row);
    }
    return [...rows.values()].map((row) => ({ ...row, total: Number(row.baseline_spend_usd || 0) + row.tracked })).sort((a, b) => b.total - a.total);
  }, [query.data]);

  if (query.isError) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">AI usage tracking is ready in code. Apply the latest database migration to activate this dashboard.</div>;
  const total = summary.reduce((sum, row) => sum + row.total, 0);

  return <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm md:p-5" aria-labelledby="ai-usage-heading">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="ai-usage-heading" className="flex items-center gap-2 text-base font-extrabold"><BrainCircuit className="h-5 w-5 text-primary" /> AI usage and credit control</h2><p className="mt-1 text-xs text-muted-foreground">Current month - tracked API usage plus any historical baseline entered in provider settings</p></div>
      <div className="rounded-2xl bg-slate-950 px-4 py-2 text-white"><span className="block text-[10px] uppercase tracking-wider text-slate-300">Consumed</span><strong className="text-xl">${total.toFixed(4)}</strong></div>
    </div>
    <div className={`grid gap-3 ${compact ? "lg:grid-cols-3" : "xl:grid-cols-3"}`}>
      {summary.map((row) => {
        const budget = Number(row.monthly_budget_usd || 0); const percent = budget ? Math.min(100, (row.total / budget) * 100) : 0;
        const topModel = [...row.models.entries()].sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "No tracked calls";
        const features = [...row.features.entries()].sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);
        return <article key={row.provider} className="rounded-2xl border border-border/70 p-4">
          <div className="flex items-center justify-between"><Badge className={`${PROVIDER_TONES[row.provider] || "bg-muted text-foreground"} border-0`}>{PROVIDER_LABELS[row.provider] || row.provider}</Badge><strong className="text-sm">${row.total.toFixed(4)} / ${budget.toFixed(0)}</strong></div>
          <Progress value={percent} className="mt-3 h-2" /><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{percent.toFixed(2)}% used</span><span>${Math.max(0, budget - row.total).toFixed(2)} left</span></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-muted/60 p-2"><MessageSquareText className="mx-auto h-3.5 w-3.5" /><strong className="mt-1 block text-sm">{row.requests}</strong><span className="text-[9px] text-muted-foreground">calls</span></div><div className="rounded-xl bg-muted/60 p-2"><Coins className="mx-auto h-3.5 w-3.5" /><strong className="mt-1 block text-sm">{row.tokens.toLocaleString()}</strong><span className="text-[9px] text-muted-foreground">tokens</span></div><div className="rounded-xl bg-muted/60 p-2"><Image className="mx-auto h-3.5 w-3.5" /><strong className="mt-1 block text-sm">{row.images}</strong><span className="text-[9px] text-muted-foreground">images</span></div></div>
          <p className="mt-3 truncate text-xs font-semibold" title={topModel}>{topModel}</p>
          <div className="mt-2 flex flex-wrap gap-1">{features.length ? features.map(([name, count]: any) => <Badge key={name} variant="outline" className="text-[9px]">{name} - {count}</Badge>) : <span className="text-[10px] text-muted-foreground">Tracking begins after deployment</span>}</div>
        </article>;
      })}
    </div>
    {!compact && <div className="mt-4 rounded-2xl border border-dashed p-4"><h3 className="text-sm font-extrabold">Budget and historical baseline</h3><p className="mb-3 text-[11px] text-muted-foreground">Baseline is the spend shown in the provider console before DekhoCampus tracking was deployed. Enter it once - future usage is added automatically.</p><div className="grid gap-3 md:grid-cols-3">{summary.map((row) => <div key={row.provider} className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3"><label className="text-[10px] font-bold uppercase">{PROVIDER_LABELS[row.provider] || row.provider} budget<Input type="number" min={0} step="1" defaultValue={row.monthly_budget_usd} onBlur={(event) => saveBudget.mutate({ provider: row.provider, field: "monthly_budget_usd", value: Number(event.target.value) })} className="mt-1 h-8 bg-background text-xs" /></label><label className="text-[10px] font-bold uppercase">Past spend<Input type="number" min={0} step="0.01" defaultValue={row.baseline_spend_usd} onBlur={(event) => saveBudget.mutate({ provider: row.provider, field: "baseline_spend_usd", value: Number(event.target.value) })} className="mt-1 h-8 bg-background text-xs" /></label></div>)}</div></div>}
    <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground"><CalendarDays className="h-3 w-3" /> Costs are estimates based on logged tokens. Provider invoices remain the billing source of truth.</p>
  </section>;
}
