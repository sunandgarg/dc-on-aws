-- Add affiliation fields to colleges
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS affiliation_kind text NOT NULL DEFAULT 'standalone',
  ADD COLUMN IF NOT EXISTS parent_university_slug text;

-- Constrain allowed kinds
ALTER TABLE public.colleges
  DROP CONSTRAINT IF EXISTS colleges_affiliation_kind_check;
ALTER TABLE public.colleges
  ADD CONSTRAINT colleges_affiliation_kind_check
  CHECK (affiliation_kind IN ('university','affiliated','standalone'));

-- Index for fast lookups of "all colleges affiliated to X"
CREATE INDEX IF NOT EXISTS idx_colleges_parent_university_slug
  ON public.colleges (parent_university_slug)
  WHERE parent_university_slug IS NOT NULL;

-- Validate the affiliation link via trigger (CHECK can't subquery)
CREATE OR REPLACE FUNCTION public.validate_college_affiliation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.affiliation_kind = 'affiliated' THEN
    IF NEW.parent_university_slug IS NULL OR NEW.parent_university_slug = '' THEN
      RAISE EXCEPTION 'parent_university_slug is required when affiliation_kind = affiliated';
    END IF;
    IF NEW.parent_university_slug = NEW.slug THEN
      RAISE EXCEPTION 'A college cannot be affiliated to itself';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.colleges
       WHERE slug = NEW.parent_university_slug
         AND affiliation_kind = 'university'
    ) THEN
      RAISE EXCEPTION 'parent_university_slug "%" must reference a college with affiliation_kind = university', NEW.parent_university_slug;
    END IF;
  ELSE
    -- Universities and standalone colleges must not carry a parent link
    NEW.parent_university_slug := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_college_affiliation ON public.colleges;
CREATE TRIGGER trg_validate_college_affiliation
  BEFORE INSERT OR UPDATE OF affiliation_kind, parent_university_slug, slug
  ON public.colleges
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_college_affiliation();