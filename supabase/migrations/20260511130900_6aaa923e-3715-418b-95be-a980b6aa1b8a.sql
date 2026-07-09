-- 1. Enforce priority range 1..100 across all rankable tables
ALTER TABLE public.colleges
  ADD CONSTRAINT colleges_priority_range_chk CHECK (priority BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE public.colleges VALIDATE CONSTRAINT colleges_priority_range_chk;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_priority_range_chk CHECK (priority BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE public.courses VALIDATE CONSTRAINT courses_priority_range_chk;

ALTER TABLE public.exams
  ADD CONSTRAINT exams_priority_range_chk CHECK (priority BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE public.exams VALIDATE CONSTRAINT exams_priority_range_chk;

-- 2. Enforce featured_rank slot range 1..4 (NULL allowed = not featured)
ALTER TABLE public.colleges
  ADD CONSTRAINT colleges_featured_rank_range_chk CHECK (featured_rank IS NULL OR featured_rank BETWEEN 1 AND 4) NOT VALID;
ALTER TABLE public.colleges VALIDATE CONSTRAINT colleges_featured_rank_range_chk;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_featured_rank_range_chk CHECK (featured_rank IS NULL OR featured_rank BETWEEN 1 AND 4) NOT VALID;
ALTER TABLE public.articles VALIDATE CONSTRAINT articles_featured_rank_range_chk;

-- 3. Auto-touch priority_updated_at when priority changes (trigger was missing)
DROP TRIGGER IF EXISTS trg_touch_college_priority_updated_at ON public.colleges;
CREATE TRIGGER trg_touch_college_priority_updated_at
BEFORE INSERT OR UPDATE OF priority ON public.colleges
FOR EACH ROW EXECUTE FUNCTION public.touch_college_priority_updated_at();

-- 4. Phase-out backfill: copy legacy featured_colleges -> colleges.featured_rank
--    when the new column is still NULL. Only the first 4 rows per category win.
WITH ranked AS (
  SELECT fc.college_slug,
         ROW_NUMBER() OVER (PARTITION BY COALESCE(fc.category,'__all__')
                            ORDER BY fc.display_order, fc.created_at) AS rn
  FROM public.featured_colleges fc
  WHERE fc.is_active = true
)
UPDATE public.colleges c
SET featured_rank = r.rn
FROM ranked r
WHERE c.slug = r.college_slug
  AND c.featured_rank IS NULL
  AND r.rn BETWEEN 1 AND 4;