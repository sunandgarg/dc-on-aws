DO $audit$
DECLARE latest record;
BEGIN
  SELECT status, progress, current_step, message, cardinality(created_article_ids) AS created_count
  INTO latest FROM public.blog_auto_agent_runs ORDER BY started_at DESC LIMIT 1;
  RAISE NOTICE 'BLOG_END_TO_END status=% progress=% step=% created=% message=%', latest.status, latest.progress, latest.current_step, latest.created_count, latest.message;
END
$audit$;
