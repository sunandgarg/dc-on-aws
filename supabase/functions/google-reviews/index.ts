// Fetches Google Places reviews and falls back to seeded reviews
// Reads API key from secret GOOGLE_PLACES_API_KEY OR site_integrations row 'google_places_api_key'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const placeId = url.searchParams.get("placeId");
    const entityType = url.searchParams.get("entityType") || "site";
    const entitySlug = url.searchParams.get("entitySlug") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve API key
    let apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY") || "";
    if (!apiKey) {
      const { data } = await supabase.from("site_integrations")
        .select("value, enabled").eq("key", "google_places_api_key").maybeSingle();
      if (data?.enabled && data?.value) apiKey = data.value;
    }

    let reviews: any[] = [];
    let rating: number | null = null;
    let total: number | null = null;

    if (apiKey && placeId) {
      const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&key=${apiKey}`);
      const j = await r.json();
      if (j.result) {
        rating = j.result.rating ?? null;
        total = j.result.user_ratings_total ?? null;
        reviews = (j.result.reviews ?? []).map((rv: any) => ({
          author_name: rv.author_name,
          avatar_url: rv.profile_photo_url || "",
          rating: rv.rating,
          body: rv.text,
          posted_at: new Date((rv.time ?? 0) * 1000).toISOString(),
        }));
      }
    }

    // Fallback to seed
    if (!reviews.length) {
      const { data } = await supabase.from("google_reviews_seed")
        .select("author_name, avatar_url, rating, body, posted_at")
        .eq("entity_type", entityType).eq("entity_slug", entitySlug).eq("is_active", true)
        .order("display_order").limit(8);
      reviews = data ?? [];
    }

    return new Response(JSON.stringify({ reviews, rating, total, source: apiKey && placeId ? "google" : "seed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), reviews: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
