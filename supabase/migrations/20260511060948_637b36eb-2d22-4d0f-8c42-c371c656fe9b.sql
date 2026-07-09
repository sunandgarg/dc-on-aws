CREATE TABLE IF NOT EXISTS public.study_toppers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_num integer NOT NULL,
  board_slug text NOT NULL,
  stream text NOT NULL DEFAULT 'Science',
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  rank integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  marks text NOT NULL DEFAULT '',
  percentage numeric NOT NULL DEFAULT 0,
  school text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_toppers_lookup
  ON public.study_toppers(class_num, board_slug, stream, rank);

ALTER TABLE public.study_toppers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read study_toppers" ON public.study_toppers;
CREATE POLICY "Public read study_toppers"
  ON public.study_toppers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage study_toppers" ON public.study_toppers;
CREATE POLICY "Admins manage study_toppers"
  ON public.study_toppers FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_study_toppers_updated_at ON public.study_toppers;
CREATE TRIGGER trg_study_toppers_updated_at
  BEFORE UPDATE ON public.study_toppers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();