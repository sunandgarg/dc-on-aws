ALTER TABLE public.lead_form_settings
ADD COLUMN IF NOT EXISTS form_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;