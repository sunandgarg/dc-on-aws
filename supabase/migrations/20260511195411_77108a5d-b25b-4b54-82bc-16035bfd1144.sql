
ALTER TABLE public.colleges        ADD COLUMN IF NOT EXISTS page_summary text;
ALTER TABLE public.courses         ADD COLUMN IF NOT EXISTS page_summary text;
ALTER TABLE public.exams           ADD COLUMN IF NOT EXISTS page_summary text;
ALTER TABLE public.career_profiles ADD COLUMN IF NOT EXISTS page_summary text;
ALTER TABLE public.scholarships    ADD COLUMN IF NOT EXISTS page_summary text;
