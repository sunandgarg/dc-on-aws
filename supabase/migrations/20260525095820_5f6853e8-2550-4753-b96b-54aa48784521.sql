
-- Sequence + short_id column on colleges
CREATE SEQUENCE IF NOT EXISTS public.colleges_short_id_seq START 10001;

ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS short_id bigint;

-- Backfill any nulls
UPDATE public.colleges
  SET short_id = nextval('public.colleges_short_id_seq')
  WHERE short_id IS NULL;

ALTER TABLE public.colleges
  ALTER COLUMN short_id SET DEFAULT nextval('public.colleges_short_id_seq'),
  ALTER COLUMN short_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS colleges_short_id_key ON public.colleges(short_id);
