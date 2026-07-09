-- 1) LinkedIn URL for faculty
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS linkedin_url text NOT NULL DEFAULT '';

-- 2) Premium program categories (admin-editable, shown as icon chips above cards)
CREATE TABLE IF NOT EXISTS public.program_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon_emoji text NOT NULL DEFAULT '🎓',
  icon_url text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.program_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read program_categories" ON public.program_categories;
CREATE POLICY "Public read program_categories" ON public.program_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage program_categories" ON public.program_categories;
CREATE POLICY "Admins manage program_categories" ON public.program_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS trg_program_categories_updated ON public.program_categories;
CREATE TRIGGER trg_program_categories_updated BEFORE UPDATE ON public.program_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the categories visible in the user's screenshot
INSERT INTO public.program_categories (slug, name, icon_emoji, display_order) VALUES
  ('agentic-ai',             'Agentic AI',             '🤖', 10),
  ('artificial-intelligence','Artificial Intelligence','🧠', 20),
  ('doctorate',              'Doctorate',              '🎓', 30),
  ('machine-learning',       'Machine Learning',       '📊', 40),
  ('data-science',           'Data Science',           '📈', 50),
  ('mba',                    'MBA',                    '🎓', 60),
  ('marketing',              'Marketing',              '📣', 70),
  ('management',             'Management',             '🧩', 80),
  ('education',              'Education',              '📚', 90),
  ('project-management',     'Project Management',     '💬', 100)
ON CONFLICT (slug) DO NOTHING;

-- 3) Promoted programs: detail-page fields + category link
ALTER TABLE public.promoted_programs
  ADD COLUMN IF NOT EXISTS slug              text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category_slug     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_image        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_video_url    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brochure_url      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS apply_url         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary           text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_program     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS eligibility       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS batch_start_date  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS schedule          text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emi_starts_at     numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certificate_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS highlights        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS learning_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS curriculum        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faculty           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs              jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fee_breakdown     jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS partner_logos     jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tools_taught      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS placement_stats   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_title        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description  text NOT NULL DEFAULT '';

-- Backfill slugs for any existing rows so detail pages always resolve.
UPDATE public.promoted_programs
SET slug = regexp_replace(lower(coalesce(title,'') || '-' || coalesce(college_name,'')), '[^a-z0-9]+', '-', 'g')
WHERE slug = '' OR slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promoted_programs_slug ON public.promoted_programs (slug) WHERE slug <> '';
CREATE INDEX IF NOT EXISTS idx_promoted_programs_category ON public.promoted_programs (category_slug);
