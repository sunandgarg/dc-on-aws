CREATE TABLE IF NOT EXISTS public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  designation text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '',
  short_bio text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  expertise text[] NOT NULL DEFAULT '{}',
  email text NOT NULL DEFAULT '',
  linkedin_url text NOT NULL DEFAULT '',
  twitter_url text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read authors" ON public.authors FOR SELECT USING (true);
CREATE POLICY "Admins manage authors" ON public.authors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_authors_updated BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.articles         ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;
ALTER TABLE public.colleges         ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;
ALTER TABLE public.courses          ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;
ALTER TABLE public.exams            ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;
ALTER TABLE public.scholarships     ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;
ALTER TABLE public.career_profiles  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;
ALTER TABLE public.study_subjects   ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_author ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_colleges_author ON public.colleges(author_id);
CREATE INDEX IF NOT EXISTS idx_courses_author ON public.courses(author_id);
CREATE INDEX IF NOT EXISTS idx_exams_author ON public.exams(author_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_author ON public.scholarships(author_id);
CREATE INDEX IF NOT EXISTS idx_careers_author ON public.career_profiles(author_id);
CREATE INDEX IF NOT EXISTS idx_subjects_author ON public.study_subjects(author_id);