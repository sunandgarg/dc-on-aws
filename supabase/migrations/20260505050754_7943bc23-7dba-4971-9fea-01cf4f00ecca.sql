
-- Faculty
CREATE TABLE IF NOT EXISTS public.faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  name text NOT NULL,
  designation text DEFAULT '',
  department text DEFAULT '',
  qualification text DEFAULT '',
  photo text DEFAULT '',
  bio text DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read faculty" ON public.faculty FOR SELECT USING (true);
CREATE POLICY "Public manage faculty" ON public.faculty FOR ALL USING (true) WITH CHECK (true);

-- Companies (central library)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo text DEFAULT '',
  sector text DEFAULT '',
  website text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public manage companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- Placement records
CREATE TABLE IF NOT EXISTS public.placement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  course_slug text DEFAULT '',
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text DEFAULT '',
  package_lpa numeric DEFAULT 0,
  year text DEFAULT '',
  role text DEFAULT '',
  hires_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read placements" ON public.placement_records FOR SELECT USING (true);
CREATE POLICY "Public manage placements" ON public.placement_records FOR ALL USING (true) WITH CHECK (true);

-- Facilities library
CREATE TABLE IF NOT EXISTS public.facilities_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon_emoji text DEFAULT '🏫',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read facilities_library" ON public.facilities_library FOR SELECT USING (true);
CREATE POLICY "Public manage facilities_library" ON public.facilities_library FOR ALL USING (true) WITH CHECK (true);

-- College -> Facilities (M2M)
CREATE TABLE IF NOT EXISTS public.college_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  facility_id uuid REFERENCES public.facilities_library(id) ON DELETE CASCADE,
  custom_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.college_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read college_facilities" ON public.college_facilities FOR SELECT USING (true);
CREATE POLICY "Public manage college_facilities" ON public.college_facilities FOR ALL USING (true) WITH CHECK (true);

-- College contacts
CREATE TABLE IF NOT EXISTS public.college_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL UNIQUE,
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  map_embed text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.college_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read college_contacts" ON public.college_contacts FOR SELECT USING (true);
CREATE POLICY "Public manage college_contacts" ON public.college_contacts FOR ALL USING (true) WITH CHECK (true);

-- Course fees per college
CREATE TABLE IF NOT EXISTS public.course_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  course_slug text NOT NULL,
  course_name text DEFAULT '',
  fee_amount numeric DEFAULT 0,
  fee_type text DEFAULT 'Annual',
  year text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read course_fees" ON public.course_fees FOR SELECT USING (true);
CREATE POLICY "Public manage course_fees" ON public.course_fees FOR ALL USING (true) WITH CHECK (true);

-- Article links to entities
CREATE TABLE IF NOT EXISTS public.article_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_article_links_entity ON public.article_links(entity_type, entity_slug);
ALTER TABLE public.article_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read article_links" ON public.article_links FOR SELECT USING (true);
CREATE POLICY "Public manage article_links" ON public.article_links FOR ALL USING (true) WITH CHECK (true);

-- Career <-> Course
CREATE TABLE IF NOT EXISTS public.career_course_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_slug text NOT NULL,
  course_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(career_slug, course_slug)
);
ALTER TABLE public.career_course_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read career_course_links" ON public.career_course_links FOR SELECT USING (true);
CREATE POLICY "Public manage career_course_links" ON public.career_course_links FOR ALL USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER trg_faculty_updated BEFORE UPDATE ON public.faculty FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_college_contacts_updated BEFORE UPDATE ON public.college_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed facilities library
INSERT INTO public.facilities_library (name, icon_emoji, description) VALUES
('Library', '📚', 'Central library with books and digital resources'),
('Hostel', '🏠', 'On-campus residential facility'),
('Cafeteria', '🍽️', 'Food court and dining hall'),
('Sports Complex', '⚽', 'Indoor and outdoor sports facilities'),
('Wi-Fi Campus', '📶', 'High-speed internet across campus'),
('Auditorium', '🎭', 'Multi-purpose auditorium'),
('Labs', '🔬', 'Modern science and computer labs'),
('Medical Center', '🏥', 'On-campus health services'),
('Gym', '💪', 'Fitness center with modern equipment'),
('Transport', '🚌', 'Bus services to campus')
ON CONFLICT (name) DO NOTHING;

-- Seed companies
INSERT INTO public.companies (name, sector) VALUES
('TCS', 'IT Services'),
('Infosys', 'IT Services'),
('Wipro', 'IT Services'),
('Accenture', 'Consulting'),
('Google', 'Technology'),
('Microsoft', 'Technology'),
('Amazon', 'E-commerce'),
('Deloitte', 'Consulting'),
('HDFC Bank', 'Banking'),
('Reliance', 'Conglomerate')
ON CONFLICT (name) DO NOTHING;
