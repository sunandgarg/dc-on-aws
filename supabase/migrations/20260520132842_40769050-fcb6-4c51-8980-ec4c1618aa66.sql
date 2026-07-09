CREATE TABLE IF NOT EXISTS public.marketing_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'Lead/Application',
  list_name TEXT NOT NULL DEFAULT 'Lead',
  trigger_type TEXT NOT NULL DEFAULT 'on_creation',
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_runs INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage automations" ON public.marketing_automations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated view active automations" ON public.marketing_automations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_ma_updated_at BEFORE UPDATE ON public.marketing_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();