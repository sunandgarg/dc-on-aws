const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-opus-4": { input: 15, output: 75 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-5": { input: 1.25, output: 10 },
};

export function estimateAiCost(model: string, inputTokens = 0, outputTokens = 0) {
  const key = Object.keys(PRICE_PER_MILLION).find((name) => model.toLowerCase().includes(name));
  const price = key ? PRICE_PER_MILLION[key] : { input: 0, output: 0 };
  return Number(((inputTokens * price.input + outputTokens * price.output) / 1_000_000).toFixed(6));
}

export async function logAiUsage(admin: any, event: {
  provider: string; model: string; feature: string; operation?: string;
  inputTokens?: number; outputTokens?: number; imageCount?: number;
  estimatedCostUsd?: number; requestId?: string; userId?: string | null; metadata?: Record<string, unknown>;
}) {
  const input = Math.max(0, Number(event.inputTokens || 0));
  const output = Math.max(0, Number(event.outputTokens || 0));
  const cost = event.estimatedCostUsd ?? estimateAiCost(event.model, input, output);
  const { error } = await admin.from("ai_usage_events").insert({
    provider: event.provider, model: event.model, feature: event.feature, operation: event.operation || null,
    input_tokens: input, output_tokens: output, image_count: event.imageCount || 0,
    estimated_cost_usd: cost, request_id: event.requestId || null, user_id: event.userId || null,
    metadata: event.metadata || {},
  });
  if (error) console.warn("AI usage logging unavailable", error.message);
}
