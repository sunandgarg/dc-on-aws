import { randomUUID } from "node:crypto";

const yes = (value) => String(value ?? "").trim().toLowerCase() === "yes";
const backendMode = () => {
  const supabase = yes(process.env.BACKEND_USE_SUPABASE ?? "yes");
  const aws = yes(process.env.BACKEND_USE_AWS ?? "no");
  if (!supabase && aws) return "aws";
  if (supabase) return "supabase";
  throw new Error("No backend provider is enabled");
};

const corsHeaders = {
  "access-control-allow-origin": process.env.CORS_ORIGIN || "https://www.dekhocampus.in",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

function json(status, body, requestId) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json", "x-request-id": requestId } });
}

async function proxySupabaseFunction(name, request, requestId) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !publishableKey) return json(503, { error: "AWS proxy is not configured with Supabase URL and publishable key" }, requestId);

  const headers = new Headers(request.headers);
  // Preserve the caller JWT. This API boundary must not become a service-role
  // bypass around Supabase RLS or Edge Function authorization.
  headers.set("apikey", headers.get("apikey") || publishableKey);
  headers.set("x-request-id", requestId);
  const response = await fetch(`${base}/functions/v1/${encodeURIComponent(name)}`, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
  });
  const responseHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => responseHeaders.set(key, value));
  responseHeaders.set("x-request-id", requestId);
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

async function proxySupabaseRest(restPath, request, requestId) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !publishableKey) return json(503, { error: "AWS proxy is not configured with Supabase URL and publishable key" }, requestId);
  const sourceUrl = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.set("apikey", headers.get("apikey") || publishableKey);
  headers.set("x-request-id", requestId);
  const response = await fetch(`${base}/rest/v1/${restPath}${sourceUrl.search}`, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
  });
  const responseHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => responseHeaders.set(key, value));
  responseHeaders.set("x-request-id", requestId);
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

/** AWS Lambda / API Gateway v2 handler. Replace individual function names in
 * this router with native AWS services over time; the contract stays stable. */
export async function handleRequest(request) {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders, "x-request-id": requestId } });
  const url = new URL(request.url);
  if (url.pathname === "/health" || url.pathname === "/v1/status") return json(200, { ok: true, backend: "aws", upstream: backendMode(), requestId }, requestId);
  const match = url.pathname.match(/^\/v1\/functions\/([A-Za-z0-9_-]+)$/);
  const restMatch = url.pathname.match(/^\/v1\/rest\/(.+)$/);
  if (restMatch) return proxySupabaseRest(restMatch[1], request, requestId);
  if (!match) return json(404, { error: "Route not found", requestId }, requestId);

  // The initial AWS backend is a safe compatibility proxy. New native AWS
  // handlers can be registered here function-by-function without frontend edits.
  return proxySupabaseFunction(match[1], request, requestId);
}
