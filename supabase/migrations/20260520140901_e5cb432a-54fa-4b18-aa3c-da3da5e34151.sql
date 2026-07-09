
CREATE TABLE IF NOT EXISTS public.feature_toggles (
  feature_key text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  parent_key text,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read feature_toggles" ON public.feature_toggles FOR SELECT USING (true);
CREATE POLICY "admin write feature_toggles" ON public.feature_toggles FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read user_permissions" ON public.user_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin write user_permissions" ON public.user_permissions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS processed_count integer DEFAULT 0;
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS current_lead_index integer DEFAULT 0;
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS error_message text;

CREATE OR REPLACE FUNCTION public.increment_batch_success(batch_uuid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.upload_batches SET success_count = success_count + 1 WHERE id = batch_uuid; END $$;

CREATE OR REPLACE FUNCTION public.increment_batch_fail(batch_uuid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.upload_batches SET fail_count = fail_count + 1 WHERE id = batch_uuid; END $$;
