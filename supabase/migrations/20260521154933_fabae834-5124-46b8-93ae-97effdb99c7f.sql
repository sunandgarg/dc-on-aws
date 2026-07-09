ALTER TABLE public.promoted_programs
  ADD COLUMN IF NOT EXISTS institute_logo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS institute_legacy_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS institute_legacy_points jsonb NOT NULL DEFAULT '[]'::jsonb;