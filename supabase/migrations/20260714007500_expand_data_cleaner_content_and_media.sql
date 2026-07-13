-- Expand the official-source cleaning queue to every major content library.
ALTER TABLE public.study_subjects ADD COLUMN IF NOT EXISTS official_website text;
ALTER TABLE public.study_subjects ADD COLUMN IF NOT EXISTS data_verified_at timestamptz;
ALTER TABLE public.study_subjects ADD COLUMN IF NOT EXISTS data_source_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.study_subjects ADD COLUMN IF NOT EXISTS data_quality_score integer;

ALTER TABLE public.college_universities ADD COLUMN IF NOT EXISTS official_website text;
ALTER TABLE public.college_universities ADD COLUMN IF NOT EXISTS data_verified_at timestamptz;
ALTER TABLE public.college_universities ADD COLUMN IF NOT EXISTS data_source_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.college_universities ADD COLUMN IF NOT EXISTS data_quality_score integer;

ALTER TABLE public.cat_universe_modules ADD COLUMN IF NOT EXISTS official_website text;
ALTER TABLE public.cat_universe_modules ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '';
ALTER TABLE public.cat_universe_modules ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '';
ALTER TABLE public.cat_universe_modules ADD COLUMN IF NOT EXISTS data_verified_at timestamptz;
ALTER TABLE public.cat_universe_modules ADD COLUMN IF NOT EXISTS data_source_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.cat_universe_modules ADD COLUMN IF NOT EXISTS data_quality_score integer;

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
      ('careers','career_profiles','name'), ('scholarships','scholarships','title'), ('articles','articles','title'),
      ('study_material','study_subjects','name'), ('college_study','college_universities','name'),
      ('cat_universe','cat_universe_modules','title')
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

GRANT EXECUTE ON FUNCTION public.create_data_cleaning_job(text[],integer,integer,text,uuid) TO service_role, authenticated;
