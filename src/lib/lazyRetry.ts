import { lazy, ComponentType } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * lazyRetry - wraps React.lazy with auto-retry, structured logging, and a
 * one-time cache-busting reload to recover from stale chunk errors that occur
 * after a deploy (e.g. "Failed to fetch dynamically imported module").
 *
 * Behaviour:
 *  - On chunk failure: retries the import once after a short delay.
 *  - If still failing: clears caches + service workers, then hard-reloads
 *    with a cache-busting query string (throttled to once per 10s per chunk).
 *  - Emits a `lovable:chunk-error` CustomEvent and a `chunk_load_error`
 *    analytics event with `{ chunk, attempt, throttledMs, url, message }`
 *    so an upstream ErrorBoundary can react and product analytics can
 *    measure the failure rate per build.
 *  - Final failures re-throw so the nearest ErrorBoundary can render UI.
 */

const RELOAD_THROTTLE_MS = 10_000;
const RETRY_DELAY_MS = 400;

function isChunkError(err: unknown): boolean {
  return /Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch|ChunkLoadError/i.test(
    String((err as any)?.message || err),
  );
}

function extractChunkUrl(err: unknown): string | undefined {
  const msg = String((err as any)?.message || err || "");
  const match = msg.match(/https?:\/\/[^\s'")]+\.(?:js|css|mjs)/i);
  return match?.[0];
}

async function clearBrowserCaches() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {/* noop */}
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {/* noop */}
}

function logChunkFailure(name: string, attempt: number, err: unknown, throttledMs: number) {
  const chunkUrl = extractChunkUrl(err);
  const detail = {
    chunk: name,
    attempt,
    throttledMs,
    url: chunkUrl,
    href: typeof window !== "undefined" ? window.location.href : undefined,
    message: String((err as any)?.message || err),
  };
  // eslint-disable-next-line no-console
  console.error("[lazyRetry] chunk failure", detail);
  try {
    trackEvent("chunk_load_error", detail);
  } catch {/* noop */}
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lovable:chunk-error", { detail }));
    }
  } catch {/* noop */}
}

export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name = "chunk",
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const reloadKey = `__lazyRetry_reloaded_${name}`;
    try {
      return await factory();
    } catch (err) {
      if (!isChunkError(err)) throw err;

      logChunkFailure(name, 1, err, 0);

      // Retry once with a tiny delay
      try {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        const mod = await factory();
        // eslint-disable-next-line no-console
        console.info("[lazyRetry] recovered after retry", { chunk: name });
        try { trackEvent("chunk_load_recovered", { chunk: name, attempt: 2 }); } catch {/* noop */}
        return mod;
      } catch (err2) {
        if (typeof window === "undefined") throw err2;

        // Do NOT silently reload the page - that caused the whole site to
        // appear to "refresh itself" after a deploy or transient network blip.
        // Instead, always rethrow so ChunkErrorBoundary renders its friendly
        // "We've updated the app - Retry loading" UI and the user explicitly
        // chooses to reload.
        throw err2;
      }
    }
  });
}

/** Manually clear caches + reload. Used by the ChunkErrorBoundary "Retry loading" button. */
export async function recoverFromChunkFailure() {
  if (typeof window === "undefined") return;
  await clearBrowserCaches();
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}
