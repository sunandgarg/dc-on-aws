ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 50;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 50;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_colleges_priority ON public.colleges (priority DESC);
CREATE INDEX IF NOT EXISTS idx_courses_priority ON public.courses (priority DESC);
CREATE INDEX IF NOT EXISTS idx_exams_priority ON public.exams (priority DESC);