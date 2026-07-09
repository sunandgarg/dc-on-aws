
CREATE TABLE IF NOT EXISTS public.hero_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  href text NOT NULL DEFAULT '/',
  tint text NOT NULL DEFAULT 'bg-rose-50 hover:bg-rose-100/70 border-rose-100',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hero_categories"
  ON public.hero_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage hero_categories"
  ON public.hero_categories
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_hero_categories_updated
  BEFORE UPDATE ON public.hero_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hero_categories (key, label, href, tint, display_order) VALUES
  ('college',     '13,004+ Colleges',   '/colleges', 'bg-rose-50 hover:bg-rose-100/70 border-rose-100',       1),
  ('course',      '840+ Courses',       '/courses',  'bg-sky-50 hover:bg-sky-100/70 border-sky-100',          2),
  ('exam',        '219+ Exams',         '/exams',    'bg-violet-50 hover:bg-violet-100/70 border-violet-100', 3),
  ('application', 'Application Form',   '/colleges', 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-100', 4),
  ('review',      'Review',             '/colleges', 'bg-amber-50 hover:bg-amber-100/70 border-amber-100',    5),
  ('news',        'News',               '/news',     'bg-sky-50 hover:bg-sky-100/70 border-sky-100',          6)
ON CONFLICT (key) DO NOTHING;
