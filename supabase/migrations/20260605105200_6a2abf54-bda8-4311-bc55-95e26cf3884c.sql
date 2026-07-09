CREATE OR REPLACE FUNCTION public.set_featured_rank(_table text, _id uuid, _rank int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max int;
BEGIN
  IF _table NOT IN ('articles','colleges') THEN
    RAISE EXCEPTION 'Invalid table';
  END IF;
  _max := CASE WHEN _table = 'articles' THEN 5 ELSE 5 END;
  IF _rank IS NULL THEN
    EXECUTE format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table) USING _id;
    RETURN;
  END IF;
  IF _rank < 1 OR _rank > _max THEN
    RAISE EXCEPTION 'Rank out of range';
  END IF;
  EXECUTE format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table) USING _id;
  EXECUTE format('UPDATE public.%I SET featured_rank = featured_rank + 1 WHERE featured_rank >= $1 AND featured_rank < $2', _table) USING _rank, _max;
  EXECUTE format('UPDATE public.%I SET featured_rank = NULL WHERE featured_rank >= $1', _table) USING _max + 1;
  EXECUTE format('UPDATE public.%I SET featured_rank = $1 WHERE id = $2', _table) USING _rank, _id;
END;
$$;