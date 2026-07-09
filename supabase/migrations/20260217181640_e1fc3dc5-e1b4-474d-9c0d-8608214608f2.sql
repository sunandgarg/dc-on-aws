
-- Table for promoted/trending programs shown on homepage
CREATE TABLE public.promoted_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_name text NOT NULL,
  college_slug text NOT NULL DEFAULT '',
  title text NOT NULL,
  badge text NOT NULL DEFAULT 'New',
  badge_variant text NOT NULL DEFAULT 'default',
  program_type text NOT NULL DEFAULT 'Bachelor''s Degree',
  duration text NOT NULL DEFAULT '24 Months',
  original_price numeric NOT NULL DEFAULT 0,
  discount_percent integer NOT NULL DEFAULT 0,
  course_slug text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promoted_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read promoted_programs"
ON public.promoted_programs FOR SELECT USING (true);

CREATE POLICY "Admins manage promoted_programs"
ON public.promoted_programs FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promoted_programs_updated_at
BEFORE UPDATE ON public.promoted_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with initial programs
INSERT INTO public.promoted_programs (college_name, college_slug, title, badge, badge_variant, program_type, duration, original_price, discount_percent, course_slug, display_order) VALUES
  ('IIT Madras', 'iit-madras', 'BS in Data Science & Applications', 'Bestseller', 'destructive', 'Bachelor''s Degree', '36 Months', 300000, 15, 'bsc-data-science', 1),
  ('IIM Bangalore', 'iim-bangalore', 'Executive PG Programme in Management', 'New', 'default', 'Executive PG Program', '12 Months', 1200000, 10, 'mba', 2),
  ('IIT Bombay', 'iit-bombay', 'M.Tech in AI & Machine Learning', 'Trending', 'secondary', 'Master''s Degree', '24 Months', 500000, 12, 'mtech-ai', 3),
  ('IIM Ahmedabad', 'iim-ahmedabad', 'Certificate in Business Analytics', 'Popular', 'default', 'Certification', '6 Months', 250000, 20, 'business-analytics', 4),
  ('IIT Delhi', 'iit-delhi', 'M.Tech in Computer Science', 'Hot', 'destructive', 'Master''s Degree', '24 Months', 450000, 10, 'mtech-cs', 5),
  ('IIM Calcutta', 'iim-calcutta', 'Executive MBA Program', 'Premium', 'default', 'Executive MBA', '15 Months', 1500000, 8, 'emba', 6);
