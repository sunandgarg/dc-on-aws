CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $columns$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['colleges','courses','exams','career_profiles','scholarships','articles'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS official_website text', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS data_verified_at timestamptz', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS data_source_urls jsonb NOT NULL DEFAULT ''[]''::jsonb', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS data_quality_score integer NOT NULL DEFAULT 0', table_name);
  END LOOP;
END
$columns$;

CREATE TABLE IF NOT EXISTS public.data_cleaning_settings (
  id text PRIMARY KEY DEFAULT 'default',
  scheduler_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  worker_concurrency integer NOT NULL DEFAULT 2 CHECK (worker_concurrency BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.data_cleaning_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.data_cleaning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_types text[] NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','paused','completed','cancelled','failed')),
  apply_mode text NOT NULL DEFAULT 'review' CHECK (apply_mode IN ('review','auto_apply')),
  batch_size integer NOT NULL DEFAULT 100 CHECK (batch_size BETWEEN 1 AND 500),
  max_records integer,
  total_items integer NOT NULL DEFAULT 0,
  processed_items integer NOT NULL DEFAULT 0,
  updated_items integer NOT NULL DEFAULT 0,
  review_items integer NOT NULL DEFAULT 0,
  skipped_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  current_entity text,
  current_name text,
  message text NOT NULL DEFAULT 'Queued',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_cleaning_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.data_cleaning_jobs(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_slug text,
  entity_name text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','updated','review','skipped','failed','cancelled')),
  attempt integer NOT NULL DEFAULT 0,
  official_url text,
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric(4,3),
  before_data jsonb,
  proposed_data jsonb,
  changed_fields text[] NOT NULL DEFAULT '{}',
  warnings text[] NOT NULL DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS data_cleaning_items_queue_idx ON public.data_cleaning_items(job_id, status, id);
CREATE INDEX IF NOT EXISTS data_cleaning_items_entity_idx ON public.data_cleaning_items(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.data_cleaning_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_slug text,
  entity_name text NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

ALTER TABLE public.data_cleaning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_cleaning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_cleaning_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_cleaning_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage data cleaning settings" ON public.data_cleaning_settings;
DROP POLICY IF EXISTS "Admins manage data cleaning jobs" ON public.data_cleaning_jobs;
DROP POLICY IF EXISTS "Admins manage data cleaning items" ON public.data_cleaning_items;
DROP POLICY IF EXISTS "Admins manage data cleaning exclusions" ON public.data_cleaning_exclusions;
CREATE POLICY "Admins manage data cleaning settings" ON public.data_cleaning_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage data cleaning jobs" ON public.data_cleaning_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage data cleaning items" ON public.data_cleaning_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage data cleaning exclusions" ON public.data_cleaning_exclusions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.create_data_cleaning_job(
  _entity_types text[],
  _batch_size integer DEFAULT 100,
  _max_records integer DEFAULT NULL,
  _apply_mode text DEFAULT 'review',
  _created_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  new_job uuid;
  requested_type text;
  table_name text;
  display_column text;
  remaining integer;
  inserted_count integer;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  IF coalesce(array_length(_entity_types, 1), 0) = 0 THEN RAISE EXCEPTION 'Select at least one content type'; END IF;

  INSERT INTO public.data_cleaning_jobs(entity_types, batch_size, max_records, apply_mode, created_by)
  VALUES (_entity_types, greatest(1, least(coalesce(_batch_size, 100), 500)), _max_records,
          CASE WHEN _apply_mode = 'auto_apply' THEN 'auto_apply' ELSE 'review' END, _created_by)
  RETURNING id INTO new_job;

  remaining := coalesce(_max_records, 2147483647);
  FOREACH requested_type IN ARRAY _entity_types LOOP
    EXIT WHEN remaining <= 0;
    SELECT x.table_name, x.display_column INTO table_name, display_column
    FROM (VALUES
      ('colleges','colleges','name'), ('courses','courses','name'), ('exams','exams','name'),
      ('careers','career_profiles','name'), ('scholarships','scholarships','title'), ('articles','articles','title')
    ) AS x(entity_type, table_name, display_column)
    WHERE x.entity_type = requested_type;
    IF table_name IS NULL THEN CONTINUE; END IF;

    EXECUTE format(
      'INSERT INTO public.data_cleaning_items(job_id,entity_type,entity_id,entity_slug,entity_name)
       SELECT $1,$2,t.id::text,t.slug::text,coalesce(t.%I::text,t.slug::text)
       FROM public.%I t
       WHERE NOT EXISTS (
         SELECT 1 FROM public.data_cleaning_exclusions e
         WHERE e.entity_type=$2 AND e.entity_id=t.id::text
       )
       ORDER BY t.data_verified_at ASC NULLS FIRST, t.updated_at ASC NULLS FIRST, t.id
       LIMIT $3', display_column, table_name
    ) USING new_job, requested_type, remaining;
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    remaining := remaining - inserted_count;
  END LOOP;

  UPDATE public.data_cleaning_jobs
  SET total_items = (SELECT count(*) FROM public.data_cleaning_items WHERE job_id = new_job),
      message = 'Ready to process', updated_at = now()
  WHERE id = new_job;
  RETURN new_job;
END
$function$;

CREATE OR REPLACE FUNCTION public.claim_data_cleaning_items(_limit integer DEFAULT 2)
RETURNS SETOF public.data_cleaning_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE active_job uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  SELECT id INTO active_job FROM public.data_cleaning_jobs
  WHERE status IN ('queued','running') ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF active_job IS NULL THEN RETURN; END IF;
  UPDATE public.data_cleaning_jobs SET status='running', started_at=coalesce(started_at,now()), updated_at=now() WHERE id=active_job;
  RETURN QUERY
  UPDATE public.data_cleaning_items i
  SET status='processing', attempt=i.attempt+1, started_at=now(), updated_at=now()
  WHERE i.id IN (
    SELECT q.id FROM public.data_cleaning_items q
    WHERE q.job_id=active_job AND q.status='queued'
    ORDER BY q.id FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(_limit,5))
  ) RETURNING i.*;
END
$function$;

CREATE OR REPLACE FUNCTION public.refresh_data_cleaning_job(_job_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE counts record;
BEGIN
  SELECT
    count(*) FILTER (WHERE status IN ('updated','review','skipped','failed','cancelled')) AS processed,
    count(*) FILTER (WHERE status='updated') AS updated,
    count(*) FILTER (WHERE status='review') AS review,
    count(*) FILTER (WHERE status='skipped') AS skipped,
    count(*) FILTER (WHERE status='failed') AS failed,
    count(*) FILTER (WHERE status IN ('queued','processing')) AS remaining
  INTO counts FROM public.data_cleaning_items WHERE job_id=_job_id;

  UPDATE public.data_cleaning_jobs SET
    processed_items=counts.processed, updated_items=counts.updated, review_items=counts.review,
    skipped_items=counts.skipped, failed_items=counts.failed, updated_at=now(),
    status=CASE WHEN counts.remaining=0 AND status NOT IN ('cancelled','paused') THEN 'completed' ELSE status END,
    completed_at=CASE WHEN counts.remaining=0 AND status NOT IN ('cancelled','paused') THEN now() ELSE completed_at END,
    message=CASE WHEN counts.remaining=0 AND status NOT IN ('cancelled','paused') THEN 'Completed' ELSE message END
  WHERE id=_job_id;
END
$function$;

REVOKE ALL ON FUNCTION public.claim_data_cleaning_items(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_data_cleaning_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_data_cleaning_items(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_data_cleaning_job(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_data_cleaning_job(text[],integer,integer,text,uuid) TO service_role, authenticated;

DO $cron_setup$
DECLARE existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname='dekhocampus-data-cleaner-tick' LIMIT 1;
  IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
  PERFORM cron.schedule(
    'dekhocampus-data-cleaner-tick', '* * * * *',
    $cron$
      SELECT net.http_post(
        url := 'https://kozdctbbvrnyddlftmvf.supabase.co/functions/v1/admin-data-cleaner',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'apikey','sb_publishable_XeGGxsGIdsWpU0u3L3xSTg_I775axzd',
          'x-data-cleaner-secret',(SELECT scheduler_token FROM public.data_cleaning_settings WHERE id='default')
        ),
        body := '{"action":"tick"}'::jsonb,
        timeout_milliseconds := 10000
      );
    $cron$
  );
END
$cron_setup$;
