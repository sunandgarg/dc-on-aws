
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS priority_updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_college_priority_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.priority_updated_at := now();
  ELSIF NEW.priority IS DISTINCT FROM OLD.priority THEN
    NEW.priority_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colleges_priority_touch ON public.colleges;
CREATE TRIGGER trg_colleges_priority_touch
BEFORE INSERT OR UPDATE OF priority ON public.colleges
FOR EACH ROW EXECUTE FUNCTION public.touch_college_priority_updated_at();

CREATE INDEX IF NOT EXISTS idx_colleges_priority_recency
  ON public.colleges (priority DESC, priority_updated_at DESC);
