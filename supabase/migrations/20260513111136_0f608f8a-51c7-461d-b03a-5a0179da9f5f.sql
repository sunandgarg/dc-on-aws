ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS related_courses text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS related_exams   text[] NOT NULL DEFAULT '{}'::text[];