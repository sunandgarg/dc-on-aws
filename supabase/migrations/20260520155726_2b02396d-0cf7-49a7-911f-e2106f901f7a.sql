ALTER TABLE public.lp_automation_rules
  ADD COLUMN IF NOT EXISTS prefills jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_dispatch boolean NOT NULL DEFAULT true;