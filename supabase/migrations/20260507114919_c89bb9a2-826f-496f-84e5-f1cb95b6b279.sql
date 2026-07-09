
CREATE TABLE IF NOT EXISTS public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT '',
  amount text NOT NULL DEFAULT '',
  eligibility text NOT NULL DEFAULT '',
  deadline text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  level text NOT NULL DEFAULT 'UG',
  description text NOT NULL DEFAULT '',
  apply_url text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  is_live boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read scholarships" ON public.scholarships FOR SELECT USING (true);
CREATE POLICY "Admins manage scholarships" ON public.scholarships FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_scholarships_updated BEFORE UPDATE ON public.scholarships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
