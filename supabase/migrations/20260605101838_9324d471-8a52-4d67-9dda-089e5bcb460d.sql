
CREATE OR REPLACE FUNCTION public.set_featured_rank(_table text, _id uuid, _rank integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sql text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _table NOT IN ('articles','colleges') THEN
    RAISE EXCEPTION 'invalid table %', _table;
  END IF;

  v_sql := format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table);
  EXECUTE v_sql USING _id;

  IF _rank IS NULL THEN RETURN; END IF;
  IF _rank < 1 OR _rank > 4 THEN
    RAISE EXCEPTION 'rank must be 1..4';
  END IF;

  v_sql := format(
    'UPDATE public.%I SET featured_rank = CASE WHEN featured_rank + 1 > 4 THEN NULL ELSE featured_rank + 1 END WHERE featured_rank IS NOT NULL AND featured_rank >= $1',
    _table
  );
  EXECUTE v_sql USING _rank;

  v_sql := format('UPDATE public.%I SET featured_rank = $1 WHERE id = $2', _table);
  EXECUTE v_sql USING _rank, _id;
END;
$function$;

UPDATE public.articles SET featured_rank = NULL WHERE featured_rank = 5;
UPDATE public.colleges SET featured_rank = NULL WHERE featured_rank = 5;
