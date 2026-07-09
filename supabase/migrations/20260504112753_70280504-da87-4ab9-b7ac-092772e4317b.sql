
CREATE TABLE IF NOT EXISTS public.college_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  college_slug TEXT NOT NULL,
  college_name TEXT DEFAULT '',
  course_slug TEXT DEFAULT '',
  course_interest TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.college_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert applications"
  ON public.college_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users read own applications"
  ON public.college_applications FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage applications"
  ON public.college_applications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_college_applications_updated_at
  BEFORE UPDATE ON public.college_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_college_applications_user ON public.college_applications(user_id);
CREATE INDEX idx_college_applications_college ON public.college_applications(college_slug);
