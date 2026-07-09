
-- Make short_id NOT NULL everywhere (auto-assigned via existing sequences)
UPDATE public.courses SET short_id = nextval('public.courses_short_id_seq') WHERE short_id IS NULL;
UPDATE public.exams SET short_id = nextval('public.exams_short_id_seq') WHERE short_id IS NULL;
ALTER TABLE public.courses ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE public.exams ALTER COLUMN short_id SET NOT NULL;

-- Immutability trigger: short_id can NEVER be changed after insert
CREATE OR REPLACE FUNCTION public.prevent_short_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.short_id IS DISTINCT FROM OLD.short_id THEN
    RAISE EXCEPTION 'short_id is immutable and cannot be modified (table: %, id: %)', TG_TABLE_NAME, OLD.short_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_short_id ON public.colleges;
CREATE TRIGGER lock_short_id BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.prevent_short_id_change();

DROP TRIGGER IF EXISTS lock_short_id ON public.courses;
CREATE TRIGGER lock_short_id BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_short_id_change();

DROP TRIGGER IF EXISTS lock_short_id ON public.exams;
CREATE TRIGGER lock_short_id BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.prevent_short_id_change();
