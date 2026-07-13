CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.blog_auto_agent_settings
  ADD COLUMN IF NOT EXISTS scheduler_token text;

UPDATE public.blog_auto_agent_settings
SET scheduler_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE id = 'default' AND COALESCE(scheduler_token, '') = '';

-- The public key identifies the Supabase project at the Edge gateway. Actual
-- authorization uses the private scheduler_token read inside the SQL command
-- and checked by the Edge Function against the admin-only settings row.
DO $block$
DECLARE
  existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname = 'dekhocampus-blog-agent-tick' LIMIT 1;
  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;

  PERFORM cron.schedule(
    'dekhocampus-blog-agent-tick',
    '*/30 * * * *',
    $cron$
      SELECT net.http_post(
        url := 'https://kozdctbbvrnyddlftmvf.supabase.co/functions/v1/admin-blog-agent',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', 'sb_publishable_XeGGxsGIdsWpU0u3L3xSTg_I775axzd',
          'x-blog-agent-secret', (SELECT scheduler_token FROM public.blog_auto_agent_settings WHERE id = 'default')
        ),
        body := '{"trigger_type":"schedule"}'::jsonb,
        timeout_milliseconds := 300000
      );
    $cron$
  );
END
$block$;
