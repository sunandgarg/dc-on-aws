
CREATE TABLE public.also_check_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  url text NOT NULL DEFAULT '',
  icon text DEFAULT 'Sparkles',
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.also_check_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.also_check_modules TO authenticated;
GRANT ALL ON public.also_check_modules TO service_role;

ALTER TABLE public.also_check_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled also_check_modules"
  ON public.also_check_modules FOR SELECT
  USING (true);

CREATE POLICY "Admins manage also_check_modules"
  ON public.also_check_modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_also_check_modules_updated_at
  BEFORE UPDATE ON public.also_check_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.also_check_modules (key, title, description, url, icon, sort_order) VALUES
  ('exam_calendar_2026', 'Exam Calendar 2026', 'Track all upcoming entrance exam dates for 2026', '/exam-calendar-2026', 'Calendar', 1),
  ('eligibility_checker', 'Eligibility Checker', 'Check your eligibility for top colleges and courses', '/eligibility-checker', 'CheckCircle2', 2),
  ('college_predictor', 'College Predictor', 'Predict the best colleges based on your scores', '/college-predictor', 'GraduationCap', 3);
