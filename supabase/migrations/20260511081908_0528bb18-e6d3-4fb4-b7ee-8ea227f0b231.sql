CREATE TABLE IF NOT EXISTS public.article_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read article_categories" ON public.article_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage article_categories" ON public.article_categories FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_article_categories_updated BEFORE UPDATE ON public.article_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.article_categories (slug, name, display_order) VALUES
  ('admission','Admission',1),
  ('career-guidance','Career Guidance',2),
  ('college-reviews','College Reviews',3),
  ('exam-tips','Exam Tips',4),
  ('scholarships','Scholarships',5),
  ('study-abroad','Study Abroad',6),
  ('trending','Trending',7),
  ('news','News',8)
ON CONFLICT (slug) DO NOTHING;