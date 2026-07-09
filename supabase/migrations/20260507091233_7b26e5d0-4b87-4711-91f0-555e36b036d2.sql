
-- Approval bodies library (reusable approval logos)
CREATE TABLE IF NOT EXISTS public.approval_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_bodies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approval_bodies" ON public.approval_bodies FOR SELECT USING (true);
CREATE POLICY "Admins manage approval_bodies" ON public.approval_bodies FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_approval_bodies_updated BEFORE UPDATE ON public.approval_bodies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.approval_bodies (code, name, logo_url, description, display_order) VALUES
('AICTE','All India Council for Technical Education','https://upload.wikimedia.org/wikipedia/en/thumb/4/40/All_India_Council_for_Technical_Education_logo.svg/200px-All_India_Council_for_Technical_Education_logo.svg.png','Statutory body for technical education in India',1),
('UGC','University Grants Commission','https://upload.wikimedia.org/wikipedia/en/thumb/0/02/University_Grants_Commission_%28India%29_Logo.svg/200px-University_Grants_Commission_%28India%29_Logo.svg.png','Apex body for higher education',2),
('NAAC','National Assessment & Accreditation Council','https://upload.wikimedia.org/wikipedia/en/thumb/5/56/NAAC_logo.png/200px-NAAC_logo.png','Accredits HEIs in India',3),
('NBA','National Board of Accreditation','https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/National_Board_of_Accreditation_logo.png/200px-National_Board_of_Accreditation_logo.png','Accredits technical programs',4),
('BCI','Bar Council of India','https://upload.wikimedia.org/wikipedia/en/thumb/4/47/Bar_Council_of_India_logo.svg/200px-Bar_Council_of_India_logo.svg.png','Regulates legal profession & education',5),
('MCI','Medical Council of India','','Regulates medical education (now NMC)',6),
('NMC','National Medical Commission','','Successor to MCI',7),
('PCI','Pharmacy Council of India','','Regulates pharmacy education',8)
ON CONFLICT (code) DO NOTHING;

-- Add per-category YouTube fallback rows
INSERT INTO public.site_integrations (key, label, value, category, enabled)
SELECT * FROM (VALUES
  ('youtube_fallback_college','Fallback YouTube — Colleges','','google',true),
  ('youtube_fallback_course','Fallback YouTube — Courses','','google',true),
  ('youtube_fallback_exam','Fallback YouTube — Exams','','google',true),
  ('youtube_fallback_career','Fallback YouTube — Careers','','google',true)
) AS v(key,label,value,category,enabled)
WHERE NOT EXISTS (SELECT 1 FROM public.site_integrations s WHERE s.key=v.key);
