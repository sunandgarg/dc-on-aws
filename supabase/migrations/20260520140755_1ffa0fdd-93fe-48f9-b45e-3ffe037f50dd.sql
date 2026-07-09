
CREATE TABLE IF NOT EXISTS public.university_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  api_key text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  name text NOT NULL DEFAULT 'Default API Key',
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  request_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.university_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all university_api_keys" ON public.university_api_keys FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all app_settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "anyone read app_settings" ON public.app_settings FOR SELECT USING (true);

ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;
