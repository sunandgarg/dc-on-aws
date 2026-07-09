// Single edge-function call that replaces ~8 separate Supabase queries on
// first paint. Kicked off at module-import time so the network round-trip
// happens IN PARALLEL with React's first render, not after.
import { QueryClient } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const BOOTSTRAP_TTL = 60_000; // match edge Cache-Control max-age

export interface BootstrapPayload {
  hero_banners?: unknown[];
  hero_settings?: unknown;
  featured_colleges?: unknown[];
  trusted_partners?: unknown[];
  lead_form_settings?: unknown;
  feature_toggles?: unknown[];
  ads?: unknown[];
  site_integrations?: Array<{ key: string; value: string | null; enabled: boolean }>;
}

let payloadPromise: Promise<BootstrapPayload | null> | null = null;
let fetchedAt = 0;

/** Start (or reuse) the bootstrap fetch. Resolves with the payload. */
export function ensureBootstrap(): Promise<BootstrapPayload | null> {
  if (payloadPromise && Date.now() - fetchedAt < BOOTSTRAP_TTL) return payloadPromise;
  fetchedAt = Date.now();
  payloadPromise = (async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bootstrap`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as BootstrapPayload;
    } catch {
      return null;
    }
  })();
  return payloadPromise;
}

/** Force the next ensureBootstrap() call to re-fetch (used after admin writes). */
export function resetBootstrap() {
  payloadPromise = null;
  fetchedAt = 0;
}

/** Seed every cache key the existing hooks expect from a single payload. */
export function seedQueryCache(qc: QueryClient, data: BootstrapPayload) {
  if (data.hero_banners !== undefined) qc.setQueryData(["hero-banners"], data.hero_banners);
  if (data.hero_settings !== undefined) qc.setQueryData(["hero_settings"], data.hero_settings);
  if (data.featured_colleges !== undefined) {
    qc.setQueryData(["featured-colleges", undefined, undefined], data.featured_colleges);
  }
  if (data.trusted_partners !== undefined) qc.setQueryData(["trusted-partners"], data.trusted_partners);
  if (data.lead_form_settings !== undefined) qc.setQueryData(["lead-form-settings"], data.lead_form_settings);
  if (data.feature_toggles !== undefined) qc.setQueryData(["feature-toggles"], data.feature_toggles);
  if (data.ads !== undefined) qc.setQueryData(["ads", "all-active"], data.ads);
  for (const row of data.site_integrations ?? []) {
    const value = row?.enabled ? (row.value ?? "") : "";
    qc.setQueryData(["site-integration", row.key], value);
  }
}

/** Compatibility shim: kick off + seed cache. */
export async function hydrateBootstrap(qc: QueryClient) {
  const data = await ensureBootstrap();
  if (data) seedQueryCache(qc, data);
}

// 🔑 Kick off the network round-trip at module import - BEFORE any component
// mounts. This way React Query hooks that `await` this promise inside their
// queryFn will get the seeded data instead of issuing duplicate requests.
ensureBootstrap();
