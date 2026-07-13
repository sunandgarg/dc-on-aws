/**
 * Cloudflare Pages replacement for the legacy Vercel cron endpoint.
 * Configure CRON_SECRET, BLOG_AGENT_SECRET, and SUPABASE_URL as encrypted
 * Cloudflare Pages variables. This is an authenticated manual endpoint; the
 * actual 30-minute schedule is handled by workers/blog-agent-scheduler.
 */
type Env = {
  SUPABASE_URL?: string;
  CRON_SECRET?: string;
  BLOG_AGENT_SECRET?: string;
};

type PagesContext = { request: Request; env: Env };

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405, headers: { Allow: "GET, POST" } });
  }

  if (env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!env.SUPABASE_URL || !env.BLOG_AGENT_SECRET) {
    return Response.json({ error: "SUPABASE_URL or BLOG_AGENT_SECRET is not configured" }, { status: 500 });
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/admin-blog-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-blog-agent-secret": env.BLOG_AGENT_SECRET,
    },
    body: JSON.stringify({ trigger_type: "schedule" }),
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
  });
};
