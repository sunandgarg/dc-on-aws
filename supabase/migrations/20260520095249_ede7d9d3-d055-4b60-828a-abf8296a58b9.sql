
ALTER TABLE public.promoted_programs
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS learners_count text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ranking_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS why_this_program text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS who_should_apply jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS application_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS program_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS top_companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mentors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS testimonials jsonb NOT NULL DEFAULT '[]'::jsonb;
