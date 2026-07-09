ALTER TABLE public.lp_universities
  ADD COLUMN IF NOT EXISTS programs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS state_cities JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS course_specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS utm_link TEXT,
  ADD COLUMN IF NOT EXISTS publisher_panel_url TEXT,
  ADD COLUMN IF NOT EXISTS publisher_id TEXT;