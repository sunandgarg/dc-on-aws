-- Recover work that was claimed by an Edge worker which exited before it
-- could persist a terminal result. A cron tick calls this function every
-- minute, so abandoned work becomes eligible again without administrator
-- intervention.
CREATE OR REPLACE FUNCTION public.claim_data_cleaning_items(_limit integer DEFAULT 2)
RETURNS SETOF public.data_cleaning_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  active_job uuid;
  affected_job uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;

  -- Retry an interrupted item twice. On the third interrupted attempt, close
  -- it as failed so one bad record cannot hold the complete run open forever.
  FOR affected_job IN
    SELECT DISTINCT job_id
    FROM public.data_cleaning_items
    WHERE status = 'processing' AND started_at < now() - interval '15 minutes'
  LOOP
    UPDATE public.data_cleaning_items
    SET status = CASE WHEN attempt >= 3 THEN 'failed' ELSE 'queued' END,
        started_at = CASE WHEN attempt >= 3 THEN started_at ELSE NULL END,
        completed_at = CASE WHEN attempt >= 3 THEN now() ELSE NULL END,
        error_message = CASE
          WHEN attempt >= 3 THEN 'Worker was interrupted three times'
          ELSE 'Recovered after an interrupted worker'
        END,
        updated_at = now()
    WHERE job_id = affected_job
      AND status = 'processing'
      AND started_at < now() - interval '15 minutes';

    PERFORM public.refresh_data_cleaning_job(affected_job);
  END LOOP;

  SELECT id INTO active_job
  FROM public.data_cleaning_jobs
  WHERE status IN ('queued','running')
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF active_job IS NULL THEN RETURN; END IF;

  UPDATE public.data_cleaning_jobs
  SET status = 'running',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  WHERE id = active_job;

  RETURN QUERY
  UPDATE public.data_cleaning_items i
  SET status = 'processing',
      attempt = i.attempt + 1,
      started_at = now(),
      completed_at = NULL,
      error_message = NULL,
      updated_at = now()
  WHERE i.id IN (
    SELECT q.id
    FROM public.data_cleaning_items q
    WHERE q.job_id = active_job AND q.status = 'queued'
    ORDER BY q.id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(_limit, 5))
  )
  RETURNING i.*;
END
$function$;

REVOKE ALL ON FUNCTION public.claim_data_cleaning_items(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_data_cleaning_items(integer) TO service_role;
