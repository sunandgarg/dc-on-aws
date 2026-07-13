-- One-time production verification requested during the blog-agent rollout.
-- pg_net submits after this migration commits; the durable result is recorded
-- in blog_auto_agent_runs and any successful article is treated normally.
SELECT net.http_post(
  url := 'https://kozdctbbvrnyddlftmvf.supabase.co/functions/v1/admin-blog-agent',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', 'sb_publishable_XeGGxsGIdsWpU0u3L3xSTg_I775axzd',
    'x-blog-agent-secret', (SELECT scheduler_token FROM public.blog_auto_agent_settings WHERE id = 'default')
  ),
  body := jsonb_build_object(
    'trigger_type', 'manual',
    'override', jsonb_build_object('posts_per_run', 1, 'publish_status', 'Draft')
  ),
  timeout_milliseconds := 300000
);
