const encoder = new TextEncoder();

export type BlogAiConfig = {
  claudeKey: string;
  openaiKey: string;
  textModel: string;
  imageModel: string;
  imageQuality: "low" | "medium" | "high";
};

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
  if (error) throw error;
  return {
    claudeKey: await decryptBlogSecret(data?.claude_api_key_ciphertext || "", serviceRoleKey),
    openaiKey: await decryptBlogSecret(data?.openai_api_key_ciphertext || "", serviceRoleKey),
    textModel: data?.text_model || "claude-3-5-sonnet-20241022",
    imageModel: data?.image_model || "gpt-image-2",
    imageQuality: data?.image_quality || "medium",
  };
}

export async function generateBlogJson(config: BlogAiConfig, prompt: string) {
  if (!config.claudeKey) throw new Error("Claude blog API key is not configured in Admin - AI Providers");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": config.claudeKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.textModel,
      max_tokens: 8192,
      system: "Return valid JSON only. Never use an em dash. Use a normal hyphen when punctuation is needed.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Claude blog generation failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const data = await response.json();
  return (data.content || []).map((block: any) => block.type === "text" ? block.text : "").join("");
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function generateAndUploadBlogCover(admin: any, config: BlogAiConfig, slug: string, hook: string) {
  if (!config.openaiKey) throw new Error("OpenAI blog image API key is not configured in Admin - AI Providers");
  const safeHook = String(hook || "DekhoCampus education update").replace(/[\u2013\u2014]/g, "-").slice(0, 90);
  const prompt = `Create a clean 16:9 editorial blog cover for DekhoCampus. Follow this fixed brand template exactly: white subtle square-grid paper background, layered translucent orange wave shapes only in all four corners, large clean white central space, DekhoCampus wordmark centered near the top with black Dekho and orange Campus plus a black graduation cap. Directly below the logo, typeset this exact hero hook in bold dark charcoal, centered and highly legible: "${safeHook}". Do not add any other text, photographs, icons, people, watermarks or logos. Keep wide safe margins and a consistent professional Indian education-news identity.`;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.imageModel, prompt, size: "1536x1024", quality: config.imageQuality, output_format: "webp", n: 1 }),
  });
  if (!response.ok) throw new Error(`OpenAI blog image generation failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const data = await response.json();
  const image = data.data?.[0]?.b64_json;
  if (!image) throw new Error("OpenAI returned no blog image data");
  const path = `blog-covers/${slug}-${Date.now()}.webp`;
  const { error } = await admin.storage.from("admin-uploads").upload(path, decodeBase64(image), { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return admin.storage.from("admin-uploads").getPublicUrl(path).data.publicUrl;
}

