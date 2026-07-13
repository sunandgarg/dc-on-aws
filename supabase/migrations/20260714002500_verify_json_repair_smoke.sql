DO $audit$
DECLARE
  latest record;
  created record;
BEGIN
  SELECT id, status, progress, current_step, message, created_article_ids,
         cardinality(created_article_ids) AS created_count
  INTO latest
  FROM public.blog_auto_agent_runs
  ORDER BY started_at DESC
  LIMIT 1;

  RAISE NOTICE 'BLOG_JSON_REPAIR status=% progress=% step=% created=% message=%',
    latest.status, latest.progress, latest.current_step,
    latest.created_count, latest.message;

  IF latest.created_count > 0 THEN
    SELECT title, slug, status, author_id,
           coalesce(featured_image, '') <> '' AS has_cover
    INTO created
    FROM public.articles
    WHERE id = latest.created_article_ids[1];

    RAISE NOTICE 'BLOG_CREATED title=% slug=% status=% author_id=% has_cover=%',
      created.title, created.slug, created.status, created.author_id,
      created.has_cover;
  END IF;
END
$audit$;
