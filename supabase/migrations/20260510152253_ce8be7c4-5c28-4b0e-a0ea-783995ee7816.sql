ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_semester text DEFAULT '',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;