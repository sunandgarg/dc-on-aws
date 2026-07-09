-- Create trusted_partners table for admin-managed partner logos
CREATE TABLE public.trusted_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_slug TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trusted_partners ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read trusted_partners" ON public.trusted_partners FOR SELECT USING (true);

-- Public manage (admin)
CREATE POLICY "Public manage trusted_partners" ON public.trusted_partners FOR ALL USING (true) WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_trusted_partners_updated_at
  BEFORE UPDATE ON public.trusted_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_top_exam field to exams table for admin-marked top exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_top_exam BOOLEAN NOT NULL DEFAULT false;
