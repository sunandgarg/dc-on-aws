/**
 * Runtime backend selection. Keep both flags explicit so a Vercel deployment
 * can never move traffic accidentally while the AWS API is being built.
 *
 * VITE_USE_SUPABASE=yes + VITE_USE_AWS=no  -> current production path
 * VITE_USE_SUPABASE=no  + VITE_USE_AWS=yes -> AWS API path
 */
export type BackendTarget = "supabase" | "aws";

const yes = (value: unknown) => String(value ?? "").trim().toLowerCase() === "yes";

export function backendTarget(): BackendTarget {
  const supabaseEnabled = yes(import.meta.env.VITE_USE_SUPABASE ?? "yes");
  const awsEnabled = yes(import.meta.env.VITE_USE_AWS ?? "no");

  if (!supabaseEnabled && awsEnabled) return "aws";
  if (supabaseEnabled) return "supabase";

  throw new Error("No backend is enabled. Set VITE_USE_SUPABASE=yes or VITE_USE_AWS=yes.");
}

export function isAwsBackendEnabled() {
  return backendTarget() === "aws";
}

export function functionUrl(name: string) {
  if (backendTarget() === "aws") {
    const base = String(import.meta.env.VITE_AWS_API_URL || "").replace(/\/$/, "");
    if (!base) throw new Error("VITE_AWS_API_URL is required when VITE_USE_AWS=yes.");
    return `${base}/v1/functions/${encodeURIComponent(name)}`;
  }

  return `${String(import.meta.env.VITE_SUPABASE_URL).replace(/\/$/, "")}/functions/v1/${encodeURIComponent(name)}`;
}

/** Route direct PostgREST calls through AWS whenever the AWS switch is active. */
export function backendFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (backendTarget() !== "aws") return fetch(input, init);
  const awsBase = String(import.meta.env.VITE_AWS_API_URL || "").replace(/\/$/, "");
  const supabaseBase = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  if (!awsBase) throw new Error("VITE_AWS_API_URL is required when VITE_USE_AWS=yes.");
  const original = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const url = new URL(original);
  const supabase = new URL(supabaseBase);
  if (url.origin === supabase.origin && url.pathname.startsWith("/rest/v1/")) {
    return fetch(`${awsBase}/v1/rest/${url.pathname.slice("/rest/v1/".length)}${url.search}`, init);
  }
  return fetch(input, init);
}

export async function invokeAwsFunction<T = unknown>(name: string, options: { body?: unknown; headers?: HeadersInit; method?: string } = {}) {
  try {
    const response = await fetch(functionUrl(name), {
      method: options.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data = await response.json().catch(() => null) as T | null;
    if (!response.ok) {
      return { data: null, error: new Error((data as { error?: string } | null)?.error || `AWS API returned ${response.status}`) };
    }
    return { data, error: null };
  } catch (cause) {
    return { data: null, error: cause instanceof Error ? cause : new Error("AWS API request failed") };
  }
}
