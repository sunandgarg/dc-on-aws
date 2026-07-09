-- Featured rank system for articles + colleges (1..4, override-shift behavior)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS featured_rank integer;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS featured_rank integer;
CREATE INDEX IF NOT EXISTS idx_articles_featured_rank ON public.articles(featured_rank) WHERE featured_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_colleges_featured_rank ON public.colleges(featured_rank) WHERE featured_rank IS NOT NULL;

-- Generic helper: set featured rank with override-shift semantics (cap = 4)
CREATE OR REPLACE FUNCTION public.set_featured_rank(_table text, _id uuid, _rank integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _table NOT IN ('articles','colleges') THEN
    RAISE EXCEPTION 'invalid table %', _table;
  END IF;

  -- Clear current rank for this row first
  v_sql := format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table);
  EXECUTE v_sql USING _id;

  IF _rank IS NULL THEN
    RETURN;
  END IF;
  IF _rank < 1 OR _rank > 4 THEN
    RAISE EXCEPTION 'rank must be 1..4';
  END IF;

  -- Shift existing rows at or below new_rank down by 1, drop anything beyond 4
  v_sql := format(
    'UPDATE public.%I SET featured_rank = CASE WHEN featured_rank + 1 > 4 THEN NULL ELSE featured_rank + 1 END WHERE featured_rank IS NOT NULL AND featured_rank >= $1',
    _table
  );
  EXECUTE v_sql USING _rank;

  -- Assign the new rank
  v_sql := format('UPDATE public.%I SET featured_rank = $1 WHERE id = $2', _table);
  EXECUTE v_sql USING _rank, _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_featured_rank(_table text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _table NOT IN ('articles','colleges') THEN
    RAISE EXCEPTION 'invalid table';
  END IF;
  v_sql := format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table);
  EXECUTE v_sql USING _id;
END;
$$;