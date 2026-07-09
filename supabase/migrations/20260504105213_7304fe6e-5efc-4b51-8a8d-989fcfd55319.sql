ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS question_papers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brochure_url text NOT NULL DEFAULT '';