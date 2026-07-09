
-- 1. Multi-category arrays (additive, keep existing single `category` for primary)
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.courses  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.exams    ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

-- Backfill: include the existing single category in the array so filters keep working
UPDATE public.colleges SET categories = ARRAY[category] WHERE (categories IS NULL OR array_length(categories,1) IS NULL) AND category IS NOT NULL AND category <> '';
UPDATE public.courses  SET categories = ARRAY[category] WHERE (categories IS NULL OR array_length(categories,1) IS NULL) AND category IS NOT NULL AND category <> '';
UPDATE public.exams    SET categories = ARRAY[category] WHERE (categories IS NULL OR array_length(categories,1) IS NULL) AND category IS NOT NULL AND category <> '';

-- GIN indexes for fast contains/overlap filters
CREATE INDEX IF NOT EXISTS idx_colleges_categories ON public.colleges USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_courses_categories  ON public.courses  USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_exams_categories    ON public.exams    USING GIN (categories);

-- 2. Stream categories master table (admin-editable)
CREATE TABLE IF NOT EXISTS public.stream_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '📚',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stream_categories" ON public.stream_categories
  FOR SELECT USING (true);
CREATE POLICY "Admins manage stream_categories" ON public.stream_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_stream_categories_updated_at
  BEFORE UPDATE ON public.stream_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed (idempotent)
INSERT INTO public.stream_categories (slug, label, emoji, display_order) VALUES
  ('Engineering','Engineering','⚡',10),
  ('Management','Management','📊',20),
  ('Commerce and Banking','Commerce & Banking','💼',30),
  ('Medical','Medical','🏥',40),
  ('Science','Science','🔬',50),
  ('Hotel Management','Hotel Management','🏨',60),
  ('Information Technology','Information Technology','💻',70),
  ('Arts & Humanities','Arts & Humanities','🎭',80),
  ('Agriculture','Agriculture','🌾',90),
  ('Law','Law','⚖️',100),
  ('Pharmacy','Pharmacy','💊',110),
  ('Education','Education','🎓',120)
ON CONFLICT (slug) DO NOTHING;
