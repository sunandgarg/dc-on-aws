
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS apply_cta_mode text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS apply_url text,
  ADD COLUMN IF NOT EXISTS admission_criteria_points jsonb NOT NULL DEFAULT '[]'::jsonb;
