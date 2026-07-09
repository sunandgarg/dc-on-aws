ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS source_category text;

CREATE INDEX IF NOT EXISTS idx_leads_device_type ON public.leads(device_type);
CREATE INDEX IF NOT EXISTS idx_leads_source_category ON public.leads(source_category);