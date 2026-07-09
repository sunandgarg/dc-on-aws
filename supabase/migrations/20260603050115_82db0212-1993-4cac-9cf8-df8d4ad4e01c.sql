
CREATE TABLE public.job_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_slug text NOT NULL,
  job_title text,
  company text,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  current_location text,
  experience text,
  current_company text,
  current_designation text,
  expected_salary text,
  notice_period text,
  resume_url text,
  portfolio_url text,
  linkedin_url text,
  cover_letter text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  user_id uuid,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_apps_job_slug ON public.job_applications(job_slug);
CREATE INDEX idx_job_apps_status ON public.job_applications(status);
CREATE INDEX idx_job_apps_created ON public.job_applications(created_at DESC);

GRANT INSERT ON public.job_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an application"
  ON public.job_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update applications"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete applications"
  ON public.job_applications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
