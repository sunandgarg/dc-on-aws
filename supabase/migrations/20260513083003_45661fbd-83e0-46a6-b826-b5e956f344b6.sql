
-- 1. Programs
CREATE TABLE public.college_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  total_semesters int NOT NULL DEFAULT 8,
  icon_emoji text NOT NULL DEFAULT '🎓',
  image text NOT NULL DEFAULT '',
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Universities
CREATE TABLE public.college_universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  short_name text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  logo text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  total_semesters int NOT NULL DEFAULT 8,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_slug, slug)
);

-- 3. Semesters
CREATE TABLE public.college_semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  university_slug text NOT NULL,
  semester_num int NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_slug, university_slug, semester_num)
);

-- 4. Subjects
CREATE TABLE public.college_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  university_slug text NOT NULL,
  semester_num int NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  branch text NOT NULL DEFAULT 'common',
  description text NOT NULL DEFAULT '',
  credits int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_slug, university_slug, semester_num, branch, slug)
);

-- 5. Resources (subject-level)
CREATE TABLE public.college_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  resource_type text NOT NULL DEFAULT 'notes',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  external_url text NOT NULL DEFAULT '',
  year int,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Quick Links (per program+uni+semester)
CREATE TABLE public.college_quick_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  university_slug text NOT NULL,
  semester_num int,
  link_type text NOT NULL DEFAULT 'syllabus',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_emoji text NOT NULL DEFAULT '📄',
  url text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Few Links (editorial chips)
CREATE TABLE public.college_few_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  university_slug text NOT NULL,
  title text NOT NULL,
  url text NOT NULL DEFAULT '',
  icon_emoji text NOT NULL DEFAULT '🔗',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Toppers
CREATE TABLE public.college_toppers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  university_slug text NOT NULL,
  year int NOT NULL,
  rank int NOT NULL DEFAULT 1,
  name text NOT NULL,
  branch text NOT NULL DEFAULT '',
  marks text NOT NULL DEFAULT '',
  percentage text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '',
  quote text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cu_program ON public.college_universities(program_slug);
CREATE INDEX idx_csem_pu ON public.college_semesters(program_slug, university_slug);
CREATE INDEX idx_csub_pus ON public.college_subjects(program_slug, university_slug, semester_num);
CREATE INDEX idx_cres_subject ON public.college_resources(subject_id);
CREATE INDEX idx_cql_pus ON public.college_quick_links(program_slug, university_slug, semester_num);
CREATE INDEX idx_cfl_pu ON public.college_few_links(program_slug, university_slug);
CREATE INDEX idx_ctop_pu ON public.college_toppers(program_slug, university_slug);

-- Triggers for updated_at
CREATE TRIGGER trg_cp_upd BEFORE UPDATE ON public.college_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cu_upd BEFORE UPDATE ON public.college_universities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_csem_upd BEFORE UPDATE ON public.college_semesters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_csub_upd BEFORE UPDATE ON public.college_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cres_upd BEFORE UPDATE ON public.college_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cql_upd BEFORE UPDATE ON public.college_quick_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cfl_upd BEFORE UPDATE ON public.college_few_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ctop_upd BEFORE UPDATE ON public.college_toppers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.college_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_few_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_toppers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['college_programs','college_universities','college_semesters','college_subjects','college_resources','college_quick_links','college_few_links','college_toppers'] LOOP
    EXECUTE format('CREATE POLICY "Public read %I" ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Admins manage %I" ON public.%I FOR ALL USING (has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''admin''::app_role))', t, t);
  END LOOP;
END $$;

-- Seed: programs
INSERT INTO public.college_programs (slug, name, short_description, total_semesters, icon_emoji, display_order) VALUES
('btech','B.Tech','Bachelor of Technology — 4 year engineering degree across CSE, ECE, Mechanical and more',8,'⚙️',1),
('bca','BCA','Bachelor of Computer Applications — 3 year UG degree in computer applications',6,'💻',2),
('bba','BBA','Bachelor of Business Administration — 3 year UG management degree',6,'📊',3),
('mba','MBA','Master of Business Administration — 2 year PG management degree',4,'🎯',4),
('mtech','M.Tech','Master of Technology — 2 year PG engineering degree',4,'🛠️',5),
('bsc','B.Sc','Bachelor of Science — 3 year UG science degree',6,'🔬',6);

-- Seed: BTech universities
INSERT INTO public.college_universities (program_slug, slug, name, short_name, state, city, total_semesters, display_order) VALUES
('btech','aktu','Dr. A.P.J. Abdul Kalam Technical University','AKTU','Uttar Pradesh','Lucknow',8,1),
('btech','vtu','Visvesvaraya Technological University','VTU','Karnataka','Belagavi',8,2),
('btech','rgpv','Rajiv Gandhi Proudyogiki Vishwavidyalaya','RGPV','Madhya Pradesh','Bhopal',8,3),
('btech','gtu','Gujarat Technological University','GTU','Gujarat','Ahmedabad',8,4),
('btech','anna-university','Anna University','Anna Univ','Tamil Nadu','Chennai',8,5),
('btech','jntuh','Jawaharlal Nehru Technological University Hyderabad','JNTUH','Telangana','Hyderabad',8,6);

-- Seed: 8 semesters per BTech university
INSERT INTO public.college_semesters (program_slug, university_slug, semester_num, title, display_order)
SELECT 'btech', u.slug, s.n, 'Semester ' || s.n, s.n
FROM public.college_universities u
CROSS JOIN generate_series(1,8) AS s(n)
WHERE u.program_slug = 'btech';

-- Seed: 4 quick-link templates per BTech uni+semester
INSERT INTO public.college_quick_links (program_slug, university_slug, semester_num, link_type, title, icon_emoji, display_order)
SELECT 'btech', u.slug, s.n, q.link_type, q.title, q.icon, q.ord
FROM public.college_universities u
CROSS JOIN generate_series(1,8) AS s(n)
CROSS JOIN (VALUES
  ('syllabus','Syllabus PDF','📘',1),
  ('pyq','Previous Year Papers','📝',2),
  ('important-questions','Important Questions','⭐',3),
  ('reference-books','Reference Books','📚',4)
) AS q(link_type, title, icon, ord)
WHERE u.program_slug = 'btech';

-- Seed: a few editorial few-links per BTech uni
INSERT INTO public.college_few_links (program_slug, university_slug, title, icon_emoji, display_order)
SELECT 'btech', u.slug, f.title, f.icon, f.ord
FROM public.college_universities u
CROSS JOIN (VALUES
  ('Admission 2026','🎓',1),
  ('Results','📊',2),
  ('Date Sheet','📅',3),
  ('Notifications','🔔',4),
  ('Counselling','💬',5)
) AS f(title, icon, ord)
WHERE u.program_slug = 'btech';

-- Seed: sample CSE Sem 1 subjects for AKTU
INSERT INTO public.college_subjects (program_slug, university_slug, semester_num, slug, name, code, branch, credits, display_order) VALUES
('btech','aktu',1,'engineering-mathematics-1','Engineering Mathematics-I','BAS103','common',4,1),
('btech','aktu',1,'engineering-physics','Engineering Physics','BAS101','common',4,2),
('btech','aktu',1,'fundamentals-of-electrical-engg','Fundamentals of Electrical Engineering','BEE101','common',4,3),
('btech','aktu',1,'programming-for-problem-solving','Programming for Problem Solving','BCS101','cse',4,4),
('btech','aktu',1,'engineering-graphics','Engineering Graphics & Design','BME151','common',2,5);
