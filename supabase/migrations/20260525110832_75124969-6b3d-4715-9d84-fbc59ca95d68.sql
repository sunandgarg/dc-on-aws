ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS program_mode text NOT NULL DEFAULT 'regular';

CREATE INDEX IF NOT EXISTS idx_leads_program_mode ON public.leads(program_mode);