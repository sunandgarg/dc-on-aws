import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encryptBlogSecret } from "../_shared/blog-ai.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const DEFAULT_CLAUDE_TEXT_MODEL = "claude-sonnet-5";
const LEGACY_CLAUDE_MODEL_IDS = new Set(["claude-3-5-sonnet-20241022", "claude-3-5-sonnet-latest", "claude-3-5-sonnet"]);

function normalizeClaudeTextModel(value: unknown) {
  const model = String(value || "").trim();
  if (!model) return DEFAULT_CLAUDE_TEXT_MODEL;
  return LEGACY_CLAUDE_MODEL_IDS.has(model) ? DEFAULT_CLAUDE_TEXT_MODEL : model;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Authentication required");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) throw new Error("Invalid session");
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Admin permission required");

    if (req.method === "GET") {
      const { data, error } = await admin.from("blog_ai_provider_settings").select("text_model,image_model,image_quality,claude_api_key_ciphertext,openai_api_key_ciphertext,updated_at").eq("id", "default").maybeSingle();
      if (error) throw error;
      return json({ text_model: normalizeClaudeTextModel(data?.text_model), image_model: data?.image_model, image_quality: data?.image_quality, claude_key_set: Boolean(data?.claude_api_key_ciphertext), openai_key_set: Boolean(data?.openai_api_key_ciphertext), updated_at: data?.updated_at });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: userData.user.id };
    if (String(body.claude_api_key || "").trim()) updates.claude_api_key_ciphertext = await encryptBlogSecret(String(body.claude_api_key).trim(), service);
    if (String(body.openai_api_key || "").trim()) updates.openai_api_key_ciphertext = await encryptBlogSecret(String(body.openai_api_key).trim(), service);
    if (body.text_model) updates.text_model = normalizeClaudeTextModel(body.text_model);
    if (body.image_model) updates.image_model = String(body.image_model).trim();
    if (["low", "medium", "high"].includes(body.image_quality)) updates.image_quality = body.image_quality;
    const { error } = await admin.from("blog_ai_provider_settings").upsert({ id: "default", ...updates });
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
