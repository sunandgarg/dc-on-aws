DO $audit$
DECLARE
  latest record;
  college_counts record;
  course_counts record;
  exam_counts record;
BEGIN
  SELECT status, progress, current_step, message, cardinality(created_article_ids) AS created_count
  INTO latest
  FROM public.blog_auto_agent_runs
  ORDER BY started_at DESC
  LIMIT 1;

  SELECT count(*) AS total, count(*) FILTER (WHERE is_active) AS active INTO college_counts FROM public.colleges;
  SELECT count(*) AS total, count(*) FILTER (WHERE is_active) AS active INTO course_counts FROM public.courses;
  SELECT count(*) AS total, count(*) FILTER (WHERE is_active) AS active INTO exam_counts FROM public.exams;

  RAISE NOTICE 'BLOG_SMOKE status=% progress=% step=% created=% message=%', latest.status, latest.progress, latest.current_step, latest.created_count, latest.message;
  RAISE NOTICE 'ACTIVE_COUNTS colleges=%/% courses=%/% exams=%/%', college_counts.active, college_counts.total, course_counts.active, course_counts.total, exam_counts.active, exam_counts.total;
END
$audit$;
