// Bootstrap edge function — returns ALL initial home/app data in ONE round-trip.
// Replaces 8–12 separate Supabase queries with a single fetch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fan-out all reads in parallel — single network round-trip from client.
    const [
      heroBanners,
      heroSettings,
      featuredColleges,
      trustedPartners,
      leadFormSettings,
      featureToggles,
      ads,
      siteIntegrations,
    ] = await Promise.all([
      supabase.from("hero_banners").select("*").eq("is_active", true).order("display_order"),
      supabase.from("hero_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("featured_colleges").select("*").eq("is_active", true).order("display_order"),
      supabase.from("trusted_partners").select("*").eq("is_active", true).order("display_order"),
      supabase.from("lead_form_settings").select("id, otp_mode, channel_preference, form_overrides, updated_at").eq("singleton", true).maybeSingle(),
      supabase.from("feature_toggles").select("feature_key, label, parent_key, is_enabled"),
      supabase.from("ads").select("*").eq("is_active", true).order("priority", { ascending: false }),
      supabase.from("site_integrations").select("key, value, enabled"),
    ]);

    const body = {
      hero_banners: heroBanners.data ?? [],
      hero_settings: heroSettings.data ?? null,
      featured_colleges: featuredColleges.data ?? [],
      trusted_partners: trustedPartners.data ?? [],
      lead_form_settings: leadFormSettings.data ?? { id: "", otp_mode: "off", channel_preference: "sms", form_overrides: {}, updated_at: "" },
      feature_toggles: featureToggles.data ?? [],
      ads: ads.data ?? [],
      site_integrations: siteIntegrations.data ?? [],
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Browser + edge caching: 60s fresh, 5min stale-while-revalidate
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
