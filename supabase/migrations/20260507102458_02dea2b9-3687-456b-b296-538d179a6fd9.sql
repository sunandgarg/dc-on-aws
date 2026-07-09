ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cta text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS page_url text;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email);