
-- College reviews table
CREATE TABLE IF NOT EXISTS public.college_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug TEXT NOT NULL,
  user_id UUID,
  reviewer_name TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  course TEXT DEFAULT '',
  year_of_study TEXT DEFAULT '',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_college_reviews_slug ON public.college_reviews(college_slug);

ALTER TABLE public.college_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved reviews"
  ON public.college_reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Authenticated can create reviews"
  ON public.college_reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users update own reviews"
  ON public.college_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage reviews"
  ON public.college_reviews FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_college_reviews_updated
  BEFORE UPDATE ON public.college_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Default global YouTube URL integration (for public pages without their own video)
INSERT INTO public.site_integrations (key, label, category, value, enabled, notes)
VALUES ('youtube_default_url', 'Default YouTube Channel/Video URL', 'google', 'https://www.youtube.com/@dekhocampus', true, 'Used as fallback for the YouTube button on public pages.')
ON CONFLICT DO NOTHING;
