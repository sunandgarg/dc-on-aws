
CREATE TABLE IF NOT EXISTS public.lead_form_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  otp_mode text NOT NULL DEFAULT 'off' CHECK (otp_mode IN ('on','off','test')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.lead_form_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lead_form_settings"
  ON public.lead_form_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert lead_form_settings"
  ON public.lead_form_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update lead_form_settings"
  ON public.lead_form_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lead_form_settings_updated_at
  BEFORE UPDATE ON public.lead_form_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.lead_form_settings (singleton, otp_mode)
VALUES (true, 'off')
ON CONFLICT (singleton) DO NOTHING;
