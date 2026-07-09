CREATE TABLE public.ai_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  message_excerpt text,
  full_content text,
  reason text,
  reporter_name text,
  reporter_email text,
  reporter_phone text,
  user_id uuid,
  page_url text,
  context jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_content_reports TO authenticated;
GRANT INSERT ON public.ai_content_reports TO anon;
GRANT ALL ON public.ai_content_reports TO service_role;

ALTER TABLE public.ai_content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an AI report"
  ON public.ai_content_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view AI reports"
  ON public.ai_content_reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update AI reports"
  ON public.ai_content_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete AI reports"
  ON public.ai_content_reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_content_reports_updated_at
  BEFORE UPDATE ON public.ai_content_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ai_content_reports_status ON public.ai_content_reports(status, created_at DESC);
CREATE INDEX idx_ai_content_reports_source ON public.ai_content_reports(source);