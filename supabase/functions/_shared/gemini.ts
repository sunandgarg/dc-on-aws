// Shared Google Gemini (Generative Language API) client.
// Uses the GEMINI_API_KEY secret and the current stable free-tier Flash model.
// Google no longer exposes the 2.5 Flash family to this project's account cohort.
// No Lovable AI Gateway. No admin provider rows. Single source of truth.

export const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function getKey(): string {
  const k = Deno.env.get("GEMINI_API_KEY");
  if (!k) throw new Error("GEMINI_API_KEY is not configured");
  return k;
}

async function assertGlobalAiEnabled() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return;
  const response = await fetch(`${url}/rest/v1/ai_runtime_controls?feature=eq.global&select=is_enabled,stop_reason`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) return;
  const rows = await response.json().catch(() => []);
  if (rows?.[0]?.is_enabled === false) {
    throw new Error(`AI_STOPPED: ${rows[0].stop_reason || "All AI calls are paused by an administrator"}`);
  }
}

// Convert OpenAI-style messages -> Gemini contents + systemInstruction
function toGeminiBody(opts: {
  system?: string;
  messages?: ChatMessage[];
  prompt?: string;
  json?: boolean;
}) {
  const sysParts: string[] = [];
  if (opts.system) sysParts.push(opts.system);

  const contents: any[] = [];
  if (opts.messages?.length) {
    for (const m of opts.messages) {
      if (m.role === "system") { sysParts.push(m.content); continue; }
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }
  } else if (opts.prompt) {
    contents.push({ role: "user", parts: [{ text: opts.prompt }] });
  }

  const body: any = { contents };
  if (sysParts.length) body.systemInstruction = { parts: [{ text: sysParts.join("\n\n") }] };
  if (opts.json) {
    body.generationConfig = { responseMimeType: "application/json" };
  }
  return body;
}

// One-shot text generation. Returns plain string from the first candidate.
export async function geminiGenerate(opts: {
  system?: string;
  messages?: ChatMessage[];
  prompt?: string;
  json?: boolean;
  model?: string;
}): Promise<string> {
  await assertGlobalAiEnabled();
  const model = opts.model || GEMINI_MODEL;
  const url = `${GEMINI_BASE}/models/${model}:generateContent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": getKey(),
    },
    body: JSON.stringify(toGeminiBody(opts)),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p: any) => p?.text || "").join("");
}

// Streaming generation translated to OpenAI-style SSE chunks
// (`data: {choices:[{delta:{content}}]}`) so existing clients keep working.
export async function geminiStreamSSE(opts: {
  system?: string;
  messages?: ChatMessage[];
  prompt?: string;
  model?: string;
}): Promise<Response> {
  await assertGlobalAiEnabled();
  const model = opts.model || GEMINI_MODEL;
  const url = `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": getKey(),
    },
    body: JSON.stringify(toGeminiBody(opts)),
  });
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => "");
    throw new Error(`Gemini stream ${upstream.status}: ${t}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        // SSE events end on blank line
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const evt = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          // Each line starts with "data: "
          const dataLines = evt
            .split("\n")
            .filter((l) => l.startsWith("data: "))
            .map((l) => l.slice(6));
          if (!dataLines.length) continue;
          const payload = dataLines.join("");
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const parts = json?.candidates?.[0]?.content?.parts || [];
            const text = parts.map((p: any) => p?.text || "").join("");
            if (text) {
              const openaiChunk = {
                choices: [{ delta: { content: text }, index: 0 }],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`),
              );
            }
          } catch {
            // ignore malformed
          }
        }
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
