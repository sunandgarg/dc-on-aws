// UTM short-link redirect: /functions/v1/lp-utm/<slug>  ->  302 to destination + ?utm_*
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const slug = url.pathname.split("/").filter(Boolean).pop() || "";
  if (!slug) return new Response("missing slug", { status: 400 });
  const { data: link } = await supabase.from("lp_utm_links").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!link) return new Response("link not found", { status: 404 });
  const target = new URL(link.destination_url);
  if (link.utm_source) target.searchParams.set("utm_source", link.utm_source);
  if (link.utm_medium) target.searchParams.set("utm_medium", link.utm_medium);
  if (link.utm_campaign) target.searchParams.set("utm_campaign", link.utm_campaign);
  if (link.utm_term) target.searchParams.set("utm_term", link.utm_term);
  if (link.utm_content) target.searchParams.set("utm_content", link.utm_content);
  // fire-and-forget click increment
  supabase.from("lp_utm_links").update({ click_count: (link.click_count || 0) + 1 }).eq("id", link.id).then(() => {});
  return new Response(null, { status: 302, headers: { Location: target.toString() } });
});
