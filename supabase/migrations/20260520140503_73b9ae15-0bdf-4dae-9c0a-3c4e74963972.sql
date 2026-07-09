
-- UNIVERSITIES
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_url text NOT NULL DEFAULT '',
  college_id text NOT NULL DEFAULT '',
  secret_key text NOT NULL DEFAULT '',
  source text DEFAULT 'dekhocampus',
  medium text DEFAULT 'dekhocampus',
  campaign text DEFAULT 'API',
  api_type text DEFAULT 'nopaperforms',
  leads_per_minute integer DEFAULT 5,
  column_mapping jsonb DEFAULT '{}'::jsonb,
  default_values jsonb DEFAULT '{}'::jsonb,
  utm_link text,
  daily_limit integer,
  admission_commitment integer,
  contact_person_name text,
  contact_person_mobile text,
  contact_person_email text,
  whatsapp_group_link text,
  deal_price numeric,
  gst_inclusive boolean DEFAULT true,
  city text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all universities" ON public.universities FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_universities_updated BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- UPLOAD BATCHES
CREATE TABLE IF NOT EXISTS public.upload_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  total_leads integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  csv_data text,
  scheduled_at timestamptz,
  leads_per_minute integer DEFAULT 5,
  api_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all upload_batches" ON public.upload_batches FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- PUSH LEADS (renamed from 'leads' to avoid clash)
CREATE TABLE IF NOT EXISTS public.push_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  university_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  address text, state text, city text,
  course text, specialization text,
  lead_source text, lead_medium text, lead_campaign text,
  extra_data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  api_response text,
  retry_count integer DEFAULT 0,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all push_leads" ON public.push_leads FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_push_leads_batch ON public.push_leads(batch_id);

-- API LOGS
CREATE TABLE IF NOT EXISTS public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  lead_id uuid, batch_id uuid,
  user_id text, application_no text,
  trigger_point text DEFAULT 'Lead Upload',
  webhook_id text,
  data_push_type text DEFAULT 'Real Time',
  email text, mobile text, form text,
  status text NOT NULL,
  response text, lead_data jsonb,
  source text, medium text, campaign text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all api_logs" ON public.api_logs FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_api_logs_uni ON public.api_logs(university_id);

-- TAXONOMIES
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.state_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  state text NOT NULL, city text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.course_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  course text NOT NULL, specialization text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.custom_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  column_name text NOT NULL, column_key text NOT NULL,
  is_required boolean DEFAULT false, sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.custom_column_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL, column_id uuid NOT NULL,
  value text NOT NULL,
  parent_column_id uuid, parent_value_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_column_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all programs" ON public.programs FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin all state_cities" ON public.state_cities FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin all course_specializations" ON public.course_specializations FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin all custom_columns" ON public.custom_columns FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin all custom_column_values" ON public.custom_column_values FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- MULTI PUSH PRESETS + DEFAULTS
CREATE TABLE IF NOT EXISTS public.multi_push_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text,
  university_ids uuid[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.multi_push_university_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL UNIQUE,
  defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.multi_push_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_push_university_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all mp_presets" ON public.multi_push_presets FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin all mp_defaults" ON public.multi_push_university_defaults FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_mp_presets_updated BEFORE UPDATE ON public.multi_push_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_defaults_updated BEFORE UPDATE ON public.multi_push_university_defaults FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PUSH LANDING PAGES (renamed)
CREATE TABLE IF NOT EXISTS public.push_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text,
  api_key text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  routing_mode text NOT NULL DEFAULT 'universities',
  university_ids uuid[] NOT NULL DEFAULT '{}',
  preset_id uuid REFERENCES public.multi_push_presets(id) ON DELETE SET NULL,
  default_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  submissions_count integer NOT NULL DEFAULT 0,
  last_submission_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all push_landing_pages" ON public.push_landing_pages FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_push_landing_updated BEFORE UPDATE ON public.push_landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_push_landing_submission(lp_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.push_landing_pages
  SET submissions_count = submissions_count + 1, last_submission_at = now()
  WHERE id = lp_id;
END $$;
