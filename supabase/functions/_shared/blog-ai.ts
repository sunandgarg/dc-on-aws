import { logAiUsage } from "./ai-usage.ts";
const encoder = new TextEncoder();

export type BlogAiConfig = {
  claudeKey: string;
  openaiKey: string;
  textModel: string;
  imageModel: string;
  imageQuality: "low" | "medium" | "high";
};

const DEFAULT_CLAUDE_TEXT_MODEL = "auto-sonnet";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";
const LEGACY_CLAUDE_MODEL_IDS = new Set([
  "claude-sonnet-5",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet",
]);

function normalizeClaudeTextModel(value: string | null | undefined) {
  const model = String(value || "").trim();
  if (!model) return DEFAULT_CLAUDE_TEXT_MODEL;
  return LEGACY_CLAUDE_MODEL_IDS.has(model) ? DEFAULT_CLAUDE_TEXT_MODEL : model;
}

let resolvedClaudeModel = "";

export async function resolveClaudeTextModel(config: BlogAiConfig) {
  if (resolvedClaudeModel) return resolvedClaudeModel;
  const response = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": config.claudeKey, "anthropic-version": "2023-06-01" },
  });
  if (!response.ok) {
    if (config.textModel !== "auto-sonnet") return config.textModel;
    throw new Error(`Could not discover an available Claude model (${response.status}): ${(await response.text()).slice(0, 400)}`);
  }
  const payload = await response.json();
  const models = Array.isArray(payload?.data) ? payload.data : [];
  const requested = models.find((model: any) => model.id === config.textModel);
  const sonnet = models
    .filter((model: any) => String(model.id || "").toLowerCase().includes("sonnet"))
    .sort((a: any, b: any) => String(b.created_at || b.id).localeCompare(String(a.created_at || a.id)))[0];
  const selected = requested || sonnet || models[0];
  if (!selected?.id) throw new Error("This Anthropic API key has no Claude models available. Check its workspace access and billing in Anthropic Console.");
  resolvedClaudeModel = selected.id;
  return resolvedClaudeModel;
}

async function cryptoKey(serviceRoleKey: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`dekhocampus-blog-ai:${serviceRoleKey}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptBlogSecret(value: string, serviceRoleKey: string) {
  if (!value) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(serviceRoleKey), encoder.encode(value)));
  return `v1.${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...encrypted))}`;
}

export async function decryptBlogSecret(value: string, serviceRoleKey: string) {
  if (!value) return "";
  const [version, iv64, data64] = value.split(".");
  if (version !== "v1" || !iv64 || !data64) return "";
  const iv = Uint8Array.from(atob(iv64), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(data64), c => c.charCodeAt(0));
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await cryptoKey(serviceRoleKey), data));
}

export async function loadBlogAiConfig(admin: any, serviceRoleKey: string): Promise<BlogAiConfig> {
  const { data, error } = await admin.from("blog_ai_provider_settings").select("*").eq("id", "default").maybeSingle();
  if (error) {
    if (String(error.message || "").includes("relation") && String(error.message || "").includes("blog_ai_provider_settings")) {
      throw new Error("Blog AI settings table is missing in Supabase. Run the latest Supabase database migrations, then open Admin - AI Providers and save the blog keys again.");
    }
    throw error;
  }
  return {
    claudeKey: await decryptBlogSecret(data?.claude_api_key_ciphertext || "", serviceRoleKey),
    openaiKey: await decryptBlogSecret(data?.openai_api_key_ciphertext || "", serviceRoleKey),
    textModel: normalizeClaudeTextModel(data?.text_model),
    imageModel: ["gpt-image-2", ""].includes(String(data?.image_model || "")) ? DEFAULT_OPENAI_IMAGE_MODEL : data.image_model,
    imageQuality: data?.image_quality || "medium",
  };
}

export async function generateBlogJson(config: BlogAiConfig, prompt: string, telemetry?: { admin: any; feature: string; operation?: string; userId?: string | null }) {
  if (!config.claudeKey) throw new Error("Claude blog API key is not configured in Admin - AI Providers");
  const model = await resolveClaudeTextModel(config);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": config.claudeKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: "Return valid JSON only. Never use an em dash. Use a normal hyphen when punctuation is needed.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Claude blog generation failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const data = await response.json();
  if (telemetry?.admin) await logAiUsage(telemetry.admin, { provider: "anthropic", model, feature: telemetry.feature, operation: telemetry.operation || "text-generation", inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens, userId: telemetry.userId });
  return (data.content || []).map((block: any) => block.type === "text" ? block.text : "").join("");
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeHook(value: string) {
  return String(value || "DekhoCampus education update")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function wrapCoverTitle(hook: string) {
  const words = normalizeHook(hook).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const maxChars = words.length > 11 ? 24 : 28;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);

  const compact = lines.slice(0, 4);
  if (lines.length > 4) compact[3] = `${compact[3].replace(/[.,;:!?-]+$/, "")}...`;
  return compact;
}

async function maybeGenerateBackdrop(config: BlogAiConfig, hook: string) {
  if (!config.openaiKey) return null;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.imageModel,
      prompt: `Create a premium abstract editorial background for an Indian education-news cover. Use a 16:9 composition with a calm ivory paper texture, elegant orange energy waves in the corners, subtle blue depth, and a very clean bright center. No text, no logos, no people, no icons, no watermarks. The mood should feel sharp, trustworthy and modern for this topic: "${normalizeHook(hook)}".`,
      size: "1536x1024",
      quality: config.imageQuality,
      output_format: "webp",
      n: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI backdrop generation failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }

  const data = await response.json();
  const image = data.data?.[0]?.b64_json;
  return image ? `data:image/webp;base64,${image}` : null;
}

function buildBlogCoverSvg(hook: string, backdropHref: string | null) {
  const lines = wrapCoverTitle(hook);
  const titleSize = lines.length >= 4 ? 56 : lines.length === 3 ? 64 : 74;
  const lineHeight = titleSize + 12;
  const titleStartY = 510 - ((lines.length - 1) * lineHeight) / 2;
  const safeLines = lines.map((line) => escapeXml(line));
  const safeHook = escapeXml(normalizeHook(hook));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="${safeHook}">
      <defs>
        <linearGradient id="paperGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
        <linearGradient id="orangeWave" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff8a3d"/>
          <stop offset="100%" stop-color="#ff6b1a"/>
        </linearGradient>
        <linearGradient id="inkFade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#e7edf6" stroke-width="1"/>
        </pattern>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="28" stdDeviation="34" flood-color="#0f172a" flood-opacity="0.16"/>
        </filter>
      </defs>

      <rect width="1600" height="900" fill="#fbfbfd"/>
      ${backdropHref ? `<image href="${backdropHref}" x="-28" y="-18" width="1656" height="936" preserveAspectRatio="xMidYMid slice" opacity="0.96"/>` : ""}
      <rect width="1600" height="900" fill="url(#grid)" opacity="0.58"/>

      <g opacity="0.18">
        <path d="M0 112C78 10 190 -28 344 24c66 22 115 56 146 102H0Z" fill="url(#orangeWave)"/>
        <path d="M1600 0v156c-88-12-164-48-228-108C1325 4 1266-14 1195 0Z" fill="url(#orangeWave)"/>
        <path d="M0 900v-148c88 9 163 45 226 108 52 51 112 71 181 40H0Z" fill="url(#orangeWave)"/>
        <path d="M1600 900H1149c40-39 77-79 112-120 64-73 144-109 339-116Z" fill="url(#orangeWave)"/>
      </g>

      <rect x="128" y="92" width="1344" height="716" rx="44" fill="url(#paperGlow)" fill-opacity="0.94" filter="url(#softShadow)"/>
      <rect x="160" y="124" width="1280" height="652" rx="34" fill="#ffffff" fill-opacity="0.84" stroke="#e7edf4"/>

      <g transform="translate(800 208)">
        <g transform="translate(-272 -12)">
          <path d="M20 84 123 36l114 40-36 32L86 73 38 117Z" fill="#111827"/>
          <path d="m47 116c-12 39-10 74 8 103" fill="none" stroke="#f28b43" stroke-width="9" stroke-linecap="round"/>
          <circle cx="56" cy="224" r="9" fill="#f28b43"/>
          <text x="92" y="142" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="94" font-weight="800" letter-spacing="-2.4" fill="url(#inkFade)">Dekho</text>
          <text x="449" y="142" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="94" font-weight="800" letter-spacing="-2.4" fill="#f28b43">Campus</text>
        </g>
      </g>

      <g transform="translate(800 334)">
        <rect x="-112" y="-26" width="224" height="48" rx="24" fill="#fff4ec" stroke="#ffd8be"/>
        <text x="0" y="6" text-anchor="middle" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2.8" fill="#f28b43">EDUCATION NEWS</text>
      </g>

      <g transform="translate(800 0)">
        <text x="0" y="${titleStartY}" text-anchor="middle" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="800" fill="#111827" letter-spacing="-1.4">
          ${safeLines.map((line, index) => `<tspan x="0" dy="${index === 0 ? 0 : lineHeight}">${line}</tspan>`).join("")}
        </text>
      </g>

      <path d="M530 650h540" stroke="#f28b43" stroke-width="6" stroke-linecap="round" opacity="0.92"/>
      <text x="800" y="712" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="28" font-weight="700" fill="#475569">DekhoCampus editorial brief for students, parents and aspirants</text>
    </svg>
  `.trim();
}

export async function generateAndUploadBlogCover(admin: any, config: BlogAiConfig, slug: string, hook: string) {
  const safeHook = normalizeHook(hook);
  let backdropHref: string | null = null;

  if (config.openaiKey) {
    try {
      backdropHref = await maybeGenerateBackdrop(config, safeHook);
      if (backdropHref) await logAiUsage(admin, { provider: "openai", model: config.imageModel, feature: "blog-cover", operation: "image-generation", imageCount: 1, estimatedCostUsd: config.imageQuality === "high" ? 0.12 : config.imageQuality === "medium" ? 0.06 : 0.03, metadata: { quality: config.imageQuality, slug } });
    } catch (error) {
      console.warn("Blog cover backdrop generation failed, using deterministic brand template instead.", error);
    }
  }

  const svg = buildBlogCoverSvg(safeHook, backdropHref);
  const path = `blog-covers/${slug}-${Date.now()}.svg`;
  const { error } = await admin.storage.from("admin-uploads").upload(path, encoder.encode(svg), { contentType: "image/svg+xml", cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return admin.storage.from("admin-uploads").getPublicUrl(path).data.publicUrl;
}
