export type AiRuntimeControl = {
  feature: string;
  is_enabled: boolean;
  provider: string | null;
  model: string | null;
  stop_reason: string | null;
};

export async function getAiRuntimeControl(admin: any, feature: string): Promise<AiRuntimeControl> {
  const { data, error } = await admin.from("ai_runtime_controls")
    .select("feature,is_enabled,provider,model,stop_reason")
    .in("feature", ["global", feature]);
  if (error) {
    if (String(error.message || "").includes("ai_runtime_controls")) {
      return { feature, is_enabled: true, provider: null, model: null, stop_reason: null };
    }
    throw error;
  }
  const global = (data || []).find((row: any) => row.feature === "global");
  const control = (data || []).find((row: any) => row.feature === feature);
  if (global?.is_enabled === false) {
    throw new Error(`AI_STOPPED: ${global.stop_reason || "All AI calls are paused by an administrator"}`);
  }
  if (control?.is_enabled === false) {
    throw new Error(`AI_STOPPED: ${control.stop_reason || `${feature} is paused by an administrator`}`);
  }
  return control || { feature, is_enabled: true, provider: null, model: null, stop_reason: null };
}

export async function applyClaudeRuntimeControl(admin: any, feature: string, config: { textModel: string }) {
  const control = await getAiRuntimeControl(admin, feature);
  if (control.provider && control.provider !== "anthropic") {
    throw new Error(`${feature} currently supports Claude text models only`);
  }
  if (control.model) config.textModel = control.model;
  return control;
}

export async function applyImageRuntimeControl(admin: any, config: { imageModel: string }) {
  const control = await getAiRuntimeControl(admin, "blog-image");
  if (control.provider && control.provider !== "openai") throw new Error("Blog cover generation currently supports OpenAI image models only");
  if (control.model) config.imageModel = control.model;
  return control;
}
