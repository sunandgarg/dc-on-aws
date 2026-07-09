
-- =============================================
-- COLLEGES TABLE
-- =============================================
CREATE TABLE public.colleges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Private',
  category TEXT NOT NULL DEFAULT 'Engineering',
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  courses_count INTEGER NOT NULL DEFAULT 0,
  fees TEXT NOT NULL DEFAULT '',
  placement TEXT NOT NULL DEFAULT '',
  ranking TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  established INTEGER NOT NULL DEFAULT 2000,
  description TEXT NOT NULL DEFAULT '',
  highlights TEXT[] NOT NULL DEFAULT '{}',
  facilities TEXT[] NOT NULL DEFAULT '{}',
  approvals TEXT[] NOT NULL DEFAULT '{}',
  naac_grade TEXT NOT NULL DEFAULT '',
  top_recruiters TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "Public manage colleges" ON public.colleges FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_colleges_slug ON public.colleges (slug);
CREATE INDEX idx_colleges_category ON public.colleges (category);
CREATE INDEX idx_colleges_state ON public.colleges (state);
CREATE INDEX idx_colleges_active ON public.colleges (is_active);

CREATE TRIGGER update_colleges_updated_at
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COURSES TABLE
-- =============================================
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Engineering',
  duration TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'Undergraduate',
  colleges_count INTEGER NOT NULL DEFAULT 0,
  avg_fees TEXT NOT NULL DEFAULT '',
  avg_salary TEXT NOT NULL DEFAULT '',
  growth TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  eligibility TEXT NOT NULL DEFAULT '',
  top_exams TEXT[] NOT NULL DEFAULT '{}',
  careers TEXT[] NOT NULL DEFAULT '{}',
  subjects TEXT[] NOT NULL DEFAULT '{}',
  image TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'Full-Time',
  specializations TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public manage courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_courses_slug ON public.courses (slug);
CREATE INDEX idx_courses_category ON public.courses (category);
CREATE INDEX idx_courses_level ON public.courses (level);
CREATE INDEX idx_courses_active ON public.courses (is_active);

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- EXAMS TABLE
-- =============================================
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Engineering',
  level TEXT NOT NULL DEFAULT 'National',
  exam_date TEXT NOT NULL DEFAULT '',
  applicants TEXT NOT NULL DEFAULT '',
  eligibility TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'Online (CBT)',
  description TEXT NOT NULL DEFAULT '',
  important_dates JSONB NOT NULL DEFAULT '[]',
  syllabus TEXT[] NOT NULL DEFAULT '{}',
  top_colleges TEXT[] NOT NULL DEFAULT '{}',
  image TEXT NOT NULL DEFAULT '',
  registration_url TEXT NOT NULL DEFAULT '#',
  duration TEXT NOT NULL DEFAULT '',
  exam_type TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'English',
  frequency TEXT NOT NULL DEFAULT 'Once',
  application_mode TEXT NOT NULL DEFAULT 'Online',
  status TEXT NOT NULL DEFAULT 'Upcoming',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Public manage exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_exams_slug ON public.exams (slug);
CREATE INDEX idx_exams_category ON public.exams (category);
CREATE INDEX idx_exams_status ON public.exams (status);
CREATE INDEX idx_exams_active ON public.exams (is_active);

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENHANCE LEADS TABLE
-- =============================================
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS interested_college_slug TEXT,
  ADD COLUMN IF NOT EXISTS interested_course_slug TEXT,
  ADD COLUMN IF NOT EXISTS interested_exam_slug TEXT;

-- =============================================
-- SEED COLLEGES DATA
-- =============================================
INSERT INTO public.colleges (slug, name, short_name, location, city, state, type, category, rating, reviews, courses_count, fees, placement, ranking, image, tags, established, description, highlights, facilities, approvals, naac_grade, top_recruiters) VALUES
('iit-delhi', 'IIT Delhi', 'IITD', 'Hauz Khas, New Delhi', 'New Delhi', 'Delhi', 'Government', 'Engineering', 4.9, 2500, 50, '₹2.5L/year', '₹25 LPA avg', 'NIRF #1', 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=400&fit=crop', ARRAY['NIRF #1','IIT','Govt'], 1961, 'Indian Institute of Technology Delhi is one of India''s most prestigious engineering institutions.', ARRAY['NIRF Rank #1','₹25 LPA average placement','50+ courses','World-class research labs'], ARRAY['Central Library','Sports Complex','Hostel','Wi-Fi Campus','Medical Center','Incubation Center'], ARRAY['AICTE','UGC','NAAC'], 'A++', ARRAY['Google','Microsoft','Amazon','TCS','Infosys','Goldman Sachs','Flipkart','McKinsey']),
('iit-bombay', 'IIT Bombay', 'IITB', 'Powai, Mumbai', 'Mumbai', 'Maharashtra', 'Government', 'Engineering', 4.9, 2200, 45, '₹2.5L/year', '₹28 LPA avg', 'NIRF #2', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop', ARRAY['NIRF #2','IIT','Govt'], 1958, 'IIT Bombay is a premier engineering institution with strong emphasis on innovation.', ARRAY['NIRF Rank #2','₹28 LPA average placement','Strong startup culture','International collaborations'], ARRAY['Library','Sports Complex','Hostel','Swimming Pool','Gymkhana','Innovation Lab'], ARRAY['AICTE','UGC','NAAC'], 'A++', ARRAY['Google','Microsoft','Amazon','Flipkart','JP Morgan','Deloitte']),
('iit-madras', 'IIT Madras', 'IITM', 'Adyar, Chennai', 'Chennai', 'Tamil Nadu', 'Government', 'Engineering', 4.9, 2100, 48, '₹2.5L/year', '₹24 LPA avg', 'NIRF #3', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=400&fit=crop', ARRAY['NIRF #3','IIT','Govt'], 1959, 'IIT Madras consistently ranks among India''s top 3 engineering institutions.', ARRAY['#3 NIRF Overall','Research Park','Strong industry ties','Data Science hub'], ARRAY['Research Park','Central Library','Sports Complex','Hostel','Medical Center'], ARRAY['AICTE','UGC','NAAC'], 'A++', ARRAY['Google','Microsoft','Amazon','TCS','Wipro','Accenture']),
('iit-kanpur', 'IIT Kanpur', 'IITK', 'Kanpur, Uttar Pradesh', 'Kanpur', 'Uttar Pradesh', 'Government', 'Engineering', 4.8, 1900, 42, '₹2.5L/year', '₹22 LPA avg', 'NIRF #4', 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&h=400&fit=crop', ARRAY['NIRF #4','IIT','Govt'], 1959, 'IIT Kanpur is renowned for its rigorous academic programs.', ARRAY['Pioneer in CS education','₹22 LPA placement','42+ courses','Strong alumni network'], ARRAY['Central Library','Labs','Hostel','Airstrip','Sports Complex'], ARRAY['AICTE','UGC','NAAC'], 'A++', ARRAY['Google','Microsoft','Amazon','Goldman Sachs','JP Morgan']),
('iit-kharagpur', 'IIT Kharagpur', 'IITKGP', 'Kharagpur, West Bengal', 'Kharagpur', 'West Bengal', 'Government', 'Engineering', 4.8, 2000, 55, '₹2.5L/year', '₹20 LPA avg', 'NIRF #5', 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=400&fit=crop', ARRAY['NIRF #5','IIT','Oldest IIT'], 1951, 'India''s first IIT, with the largest campus among all IITs.', ARRAY['Oldest IIT','Largest campus','55+ courses','Strong tradition'], ARRAY['Hijli Shaheed Bhawan','Central Library','Hostel','Technology Market','Medical Center'], ARRAY['AICTE','UGC','NAAC'], 'A++', ARRAY['Google','Microsoft','TCS','Infosys','Wipro','Deloitte']),
('nit-trichy', 'NIT Trichy', 'NITT', 'Tiruchirappalli, Tamil Nadu', 'Tiruchirappalli', 'Tamil Nadu', 'Government', 'Engineering', 4.7, 1800, 35, '₹1.5L/year', '₹15 LPA avg', 'NIRF #9', 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&h=400&fit=crop', ARRAY['NIT #1','Govt','NIRF Top 10'], 1964, 'NIT Tiruchirappalli is the top NIT in India.', ARRAY['Top NIT','₹15 LPA avg placement','Affordable fees','Strong alumni'], ARRAY['Central Library','Labs','Hostel','Sports Ground','Workshop'], ARRAY['AICTE','UGC','NAAC'], 'A+', ARRAY['TCS','Infosys','Wipro','Microsoft','Amazon']),
('bits-pilani', 'BITS Pilani', 'BITS', 'Pilani, Rajasthan', 'Pilani', 'Rajasthan', 'Deemed', 'Engineering', 4.8, 1900, 40, '₹5L/year', '₹18 LPA avg', 'NIRF #6', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=400&fit=crop', ARRAY['BITS','Deemed','Top 10'], 1964, 'BITS Pilani is one of India''s most prestigious private engineering institutions.', ARRAY['Practice School program','Multi-campus','Strong alumni','BITSAT entrance'], ARRAY['Library','Labs','Sports Complex','Hostel','Innovation Center'], ARRAY['AICTE','UGC'], 'A', ARRAY['Google','Microsoft','Amazon','Goldman Sachs','JP Morgan']),
('vit-vellore', 'VIT Vellore', 'VIT', 'Vellore, Tamil Nadu', 'Vellore', 'Tamil Nadu', 'Deemed', 'Engineering', 4.5, 3500, 60, '₹2L/year', '₹8 LPA avg', 'NIRF #12', 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&h=400&fit=crop', ARRAY['VITEEE','Deemed','Private'], 1984, 'VIT Vellore is a leading private engineering university.', ARRAY['60+ courses','International tie-ups','VITEEE exam','Green campus'], ARRAY['Technology Tower','Library','Hostel','Sports Arena','Food Court'], ARRAY['AICTE','UGC','NAAC'], 'A++', ARRAY['TCS','Infosys','Wipro','Cognizant','Accenture']),
('aiims-delhi', 'AIIMS Delhi', 'AIIMS', 'Ansari Nagar, New Delhi', 'New Delhi', 'Delhi', 'Government', 'Medical', 4.9, 3200, 25, '₹1.5K/year', '₹15 LPA avg', 'NIRF #1 Medical', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop', ARRAY['NIRF #1','Medical','Govt'], 1956, 'AIIMS Delhi is India''s top medical institution.', ARRAY['#1 Medical College','Near-zero tuition','Top research output','Attached hospital'], ARRAY['Super Specialty Hospital','Research Labs','Hostel','Library','Sports Ground'], ARRAY['MCI','UGC'], 'A++', ARRAY['AIIMS Hospital','Fortis','Apollo','Max Healthcare']),
('iim-ahmedabad', 'IIM Ahmedabad', 'IIMA', 'Vastrapur, Ahmedabad', 'Ahmedabad', 'Gujarat', 'Government', 'Management', 4.9, 1800, 10, '₹24L/year', '₹32 LPA avg', 'NIRF #1 MBA', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop', ARRAY['#1 MBA','IIM','Govt'], 1961, 'IIM Ahmedabad is India''s premier business school.', ARRAY['#1 MBA in India','₹32 LPA avg placement','Case study method','Global alumni network'], ARRAY['Library','Auditorium','Sports Complex','Computing Center','Hostel'], ARRAY['AICTE','AACSB','EQUIS'], 'A++', ARRAY['McKinsey','BCG','Goldman Sachs','JP Morgan','Amazon','Google']),
('iim-bangalore', 'IIM Bangalore', 'IIMB', 'Bannerghatta, Bangalore', 'Bangalore', 'Karnataka', 'Government', 'Management', 4.9, 1600, 12, '₹25L/year', '₹30 LPA avg', 'NIRF #2 MBA', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=400&fit=crop', ARRAY['#2 MBA','IIM','Govt'], 1973, 'IIM Bangalore is India''s second-ranked B-school.', ARRAY['#2 MBA','Startup ecosystem','Bangalore advantage','Strong research'], ARRAY['Library','Computing Lab','Hostel','Sports Complex','Auditorium'], ARRAY['AICTE','AACSB','EQUIS'], 'A++', ARRAY['McKinsey','BCG','Bain','Goldman Sachs','Amazon','Microsoft']),
('nlsiu-bangalore', 'NLSIU Bangalore', 'NLSIU', 'Nagarbhavi, Bangalore', 'Bangalore', 'Karnataka', 'Government', 'Law', 4.9, 900, 5, '₹2.5L/year', '₹20 LPA avg', 'NIRF #1 Law', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop', ARRAY['#1 Law','NLU','Govt'], 1987, 'National Law School of India University is the top law school.', ARRAY['#1 Law School','₹20 LPA placement','Pioneer of 5-year LLB','Supreme Court alumni'], ARRAY['Moot Court Hall','Library','Hostel','Computer Lab','Legal Aid Clinic'], ARRAY['BCI','UGC'], 'A++', ARRAY['AZB','Trilegal','Khaitan','Cyril Amarchand','Shardul Amarchand']),
('nid-ahmedabad', 'NID Ahmedabad', 'NID', 'Paldi, Ahmedabad', 'Ahmedabad', 'Gujarat', 'Government', 'Design', 4.8, 800, 8, '₹3L/year', '₹12 LPA avg', 'NIRF #1 Design', 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop', ARRAY['#1 Design','NID','Govt'], 1961, 'NID Ahmedabad is India''s premier design institute.', ARRAY['#1 Design School','International recognition','Strong industry connect','Bauhaus tradition'], ARRAY['Design Studios','Library','Hostel','Gallery','Workshop'], ARRAY['UGC'], 'A++', ARRAY['Apple','Google','Samsung','Titan','Asian Paints']),
('srcc-delhi', 'SRCC Delhi', 'SRCC', 'North Campus, New Delhi', 'New Delhi', 'Delhi', 'Government', 'Commerce', 4.8, 1200, 6, '₹20K/year', '₹12 LPA avg', 'Top Commerce College', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', ARRAY['Top Commerce','DU','Govt'], 1926, 'Shri Ram College of Commerce is India''s best commerce college.', ARRAY['#1 Commerce College','Historic campus','Strong alumni','DU affiliation'], ARRAY['Library','Auditorium','Sports Ground','Canteen','Computer Lab'], ARRAY['UGC','NAAC'], 'A++', ARRAY['Deloitte','EY','KPMG','PwC','Goldman Sachs','McKinsey']),
('jipmer-puducherry', 'JIPMER Puducherry', 'JIPMER', 'Puducherry', 'Puducherry', 'Tamil Nadu', 'Government', 'Medical', 4.8, 2100, 20, '₹2K/year', '₹12 LPA avg', 'NIRF #2 Medical', 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&h=400&fit=crop', ARRAY['NIRF #2','Medical','Govt'], 1823, 'JIPMER is one of India''s oldest and most prestigious medical institutions.', ARRAY['#2 Medical','200-year legacy','Clinical excellence','Affordable'], ARRAY['Hospital','Research Labs','Hostel','Library','Auditorium'], ARRAY['MCI','UGC'], 'A++', ARRAY['JIPMER Hospital','Apollo','Fortis','PGIMER']);

-- =============================================
-- SEED COURSES DATA
-- =============================================
INSERT INTO public.courses (slug, name, full_name, category, duration, level, colleges_count, avg_fees, avg_salary, growth, description, eligibility, top_exams, careers, subjects, image, mode, specializations) VALUES
('btech-computer-science', 'B.Tech Computer Science', 'Bachelor of Technology in Computer Science & Engineering', 'Engineering', '4 Years', 'Undergraduate', 1200, '₹1.5L - ₹5L/year', '₹12 LPA', '+25%', 'B.Tech CSE is the most sought-after engineering program.', '10+2 with PCM, minimum 60%. JEE Main/Advanced or university entrance.', ARRAY['JEE Main','JEE Advanced','BITSAT','VITEEE','SRMJEE'], ARRAY['Software Engineer','Data Scientist','AI/ML Engineer','Full Stack Developer','Cloud Architect'], ARRAY['Data Structures','Algorithms','DBMS','Operating Systems','Machine Learning','Web Development'], 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop', 'Full-Time', ARRAY['AI/ML','Data Science','Cybersecurity','Cloud Computing']),
('btech-ai-ml', 'B.Tech AI & ML', 'Bachelor of Technology in Artificial Intelligence & Machine Learning', 'Engineering', '4 Years', 'Undergraduate', 450, '₹2L - ₹6L/year', '₹15 LPA', '+45%', 'B.Tech AI & ML is a cutting-edge program focused on artificial intelligence.', '10+2 with PCM, JEE Main/Advanced or university entrance.', ARRAY['JEE Main','JEE Advanced','BITSAT','VITEEE'], ARRAY['AI Engineer','ML Engineer','Data Scientist','Research Scientist','Robotics Engineer'], ARRAY['Machine Learning','Deep Learning','NLP','Computer Vision','Reinforcement Learning','Big Data'], 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Deep Learning','NLP','Computer Vision','Robotics']),
('mbbs', 'MBBS', 'Bachelor of Medicine and Bachelor of Surgery', 'Medical', '5.5 Years', 'Undergraduate', 612, '₹20K - ₹25L/year', '₹10 LPA', '+15%', 'MBBS is India''s most prestigious medical degree.', '10+2 with PCB, NEET UG qualification required.', ARRAY['NEET UG'], ARRAY['Doctor','Surgeon','Specialist','Medical Researcher','Public Health Officer'], ARRAY['Anatomy','Physiology','Biochemistry','Pharmacology','Pathology','Surgery'], 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop', 'Full-Time', ARRAY['General Medicine','Surgery','Pediatrics','Orthopedics']),
('mba', 'MBA', 'Master of Business Administration', 'Management', '2 Years', 'Postgraduate', 3500, '₹5L - ₹25L/year', '₹12 LPA', '+18%', 'MBA is the gold standard in business education.', 'Bachelor''s degree with minimum 50%, CAT/XAT/MAT score.', ARRAY['CAT','XAT','MAT','GMAT','SNAP'], ARRAY['Management Consultant','Investment Banker','Product Manager','Marketing Director','Entrepreneur'], ARRAY['Marketing','Finance','Operations','HR Management','Business Strategy','Analytics'], 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Finance','Marketing','HR','Operations','Analytics']),
('ba-llb', 'BA LLB', 'Bachelor of Arts & Bachelor of Laws (Integrated)', 'Law', '5 Years', 'Undergraduate', 450, '₹50K - ₹3L/year', '₹8 LPA', '+18%', 'BA LLB is a 5-year integrated law program.', '10+2 from any stream, CLAT/AILET qualification.', ARRAY['CLAT','AILET','LSAT India','MH CET Law'], ARRAY['Advocate','Corporate Lawyer','Legal Advisor','Judge','Legal Analyst'], ARRAY['Constitutional Law','Criminal Law','Contract Law','Corporate Law','Human Rights','IP Law'], 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Corporate Law','Criminal Law','IP Law','Human Rights']),
('bdes-ux-design', 'B.Des UX Design', 'Bachelor of Design in User Experience Design', 'Design', '4 Years', 'Undergraduate', 80, '₹2L - ₹5L/year', '₹10 LPA', '+50%', 'B.Des in UX Design focuses on user-centered digital experiences.', '10+2 from any stream, UCEED/NID DAT qualification.', ARRAY['UCEED','NID DAT','NIFT Entrance','CEED'], ARRAY['UX Designer','UI Designer','Product Designer','Design Researcher','Interaction Designer'], ARRAY['Design Thinking','Prototyping','User Research','Visual Design','Information Architecture'], 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Product Design','Interaction Design','Service Design','Visual Design']),
('bsc-physics', 'B.Sc Physics', 'Bachelor of Science in Physics', 'Science', '3 Years', 'Undergraduate', 2000, '₹10K - ₹1L/year', '₹5 LPA', '+15%', 'B.Sc Physics provides deep understanding of fundamental laws.', '10+2 with PCM, CUET or university entrance.', ARRAY['CUET','IIT JAM','JEST'], ARRAY['Research Scientist','Data Analyst','Lab Technician','Physicist','Science Writer'], ARRAY['Classical Mechanics','Quantum Physics','Electrodynamics','Thermodynamics','Optics'], 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Quantum Physics','Astrophysics','Condensed Matter','Nuclear Physics']),
('bcom', 'B.Com', 'Bachelor of Commerce', 'Commerce', '3 Years', 'Undergraduate', 5000, '₹10K - ₹1L/year', '₹4 LPA', '+10%', 'B.Com is the foundation for a career in commerce and finance.', '10+2 from Commerce stream, CUET or university entrance.', ARRAY['CUET','DU JAT','IPU CET'], ARRAY['Accountant','Tax Consultant','Auditor','Financial Analyst','Banking Officer'], ARRAY['Financial Accounting','Business Law','Economics','Taxation','Cost Accounting','Auditing'], 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Accounting','Banking','Taxation','E-Commerce']),
('btech-mechanical', 'B.Tech Mechanical', 'Bachelor of Technology in Mechanical Engineering', 'Engineering', '4 Years', 'Undergraduate', 1100, '₹1.5L - ₹4L/year', '₹8 LPA', '+12%', 'B.Tech Mechanical covers thermodynamics, manufacturing, robotics.', '10+2 with PCM, JEE Main/Advanced or university entrance.', ARRAY['JEE Main','JEE Advanced','BITSAT'], ARRAY['Mechanical Engineer','Design Engineer','Automotive Engineer','Robotics Engineer','Manufacturing Manager'], ARRAY['Thermodynamics','Fluid Mechanics','Manufacturing','CAD/CAM','Robotics','Material Science'], 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Robotics','Automotive','Thermal','Manufacturing']),
('bba', 'BBA', 'Bachelor of Business Administration', 'Management', '3 Years', 'Undergraduate', 3200, '₹50K - ₹3L/year', '₹5 LPA', '+15%', 'BBA provides foundational business management knowledge.', '10+2 from any stream, CUET or university entrance.', ARRAY['CUET','IPMAT','SET','NPAT'], ARRAY['Business Analyst','HR Executive','Marketing Executive','Operations Associate','Entrepreneur'], ARRAY['Principles of Management','Accounting','Marketing','Economics','Business Law','Entrepreneurship'], 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', 'Full-Time', ARRAY['Marketing','Finance','Entrepreneurship','Digital Marketing']);

-- =============================================
-- SEED EXAMS DATA
-- =============================================
INSERT INTO public.exams (slug, name, full_name, category, level, exam_date, applicants, eligibility, mode, description, important_dates, syllabus, top_colleges, image, registration_url, duration, exam_type, language, frequency, application_mode, status) VALUES
('jee-main-2026', 'JEE Main', 'Joint Entrance Examination Main 2026', 'Engineering', 'National', 'April 2026', '15L+', '10+2 with PCM, minimum 75%', 'Online (CBT)', 'JEE Main is India''s largest engineering entrance exam.', '[{"event":"Application Start","date":"Nov 15, 2025"},{"event":"Application End","date":"Dec 20, 2025"},{"event":"Exam Date","date":"Apr 5, 2026"},{"event":"Result Date","date":"May 10, 2026"}]', ARRAY['Physics','Chemistry','Mathematics'], ARRAY['NIT Trichy','NIT Warangal','NIT Surathkal','IIIT Hyderabad'], 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop', '#', '3 hours', 'National Wise', 'Both', 'Twice', 'Online', 'Applications Open'),
('jee-advanced-2026', 'JEE Advanced', 'Joint Entrance Examination Advanced 2026', 'Engineering', 'National', 'May 2026', '2.5L+', 'Top 2,50,000 JEE Main qualifiers', 'Online (CBT)', 'JEE Advanced is the gateway to IITs.', '[{"event":"Application Start","date":"Apr 20, 2026"},{"event":"Application End","date":"May 5, 2026"},{"event":"Exam Date","date":"May 25, 2026"},{"event":"Result Date","date":"Jun 15, 2026"}]', ARRAY['Physics','Chemistry','Mathematics'], ARRAY['IIT Delhi','IIT Bombay','IIT Kanpur','IIT Madras','IIT Kharagpur'], 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop', '#', '6 hours', 'National Wise', 'Both', 'Once', 'Online', 'Upcoming'),
('neet-ug-2026', 'NEET UG', 'National Eligibility cum Entrance Test (UG) 2026', 'Medical', 'National', 'May 2026', '20L+', '10+2 with PCB, minimum 50%', 'Offline (OMR)', 'NEET UG is the sole entrance exam for MBBS/BDS.', '[{"event":"Application Start","date":"Jan 10, 2026"},{"event":"Application End","date":"Feb 28, 2026"},{"event":"Exam Date","date":"May 3, 2026"},{"event":"Result Date","date":"Jun 16, 2026"}]', ARRAY['Physics','Chemistry','Biology (Botany & Zoology)'], ARRAY['AIIMS Delhi','JIPMER','CMC Vellore','AFMC Pune'], 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop', '#', '3 hours 20 min', 'National Wise', 'Both', 'Once', 'Online', 'Upcoming'),
('cat-2026', 'CAT', 'Common Admission Test 2026', 'Management', 'National', 'November 2026', '3L+', 'Bachelor''s degree, minimum 50%', 'Online (CBT)', 'CAT is the premier MBA entrance exam for IIMs.', '[{"event":"Application Start","date":"Aug 5, 2026"},{"event":"Application End","date":"Sep 25, 2026"},{"event":"Exam Date","date":"Nov 22, 2026"},{"event":"Result Date","date":"Jan 5, 2027"}]', ARRAY['Quantitative Aptitude','Verbal Ability & RC','DILR'], ARRAY['IIM Ahmedabad','IIM Bangalore','IIM Calcutta','IIM Lucknow'], 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', '#', '2 hours', 'National Wise', 'English', 'Once', 'Online', 'Upcoming'),
('clat-2026', 'CLAT', 'Common Law Admission Test 2026', 'Law', 'National', 'December 2025', '75K+', '10+2 with minimum 45%', 'Online (CBT)', 'CLAT is the entrance exam for all 22 NLUs.', '[{"event":"Application Start","date":"Aug 1, 2025"},{"event":"Application End","date":"Nov 15, 2025"},{"event":"Exam Date","date":"Dec 14, 2025"},{"event":"Result Date","date":"Dec 28, 2025"}]', ARRAY['English','Current Affairs','Legal Reasoning','Logical Reasoning','Quantitative Techniques'], ARRAY['NLSIU Bangalore','NLU Delhi','NALSAR Hyderabad'], 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop', '#', '2 hours', 'National Wise', 'English', 'Once', 'Online', 'Applications Closed'),
('gate-2026', 'GATE', 'Graduate Aptitude Test in Engineering 2026', 'Engineering', 'National', 'February 2026', '9L+', 'B.Tech/B.E. final year or graduated', 'Online (CBT)', 'GATE is for M.Tech/PhD admissions and PSU recruitment.', '[{"event":"Application Start","date":"Aug 15, 2025"},{"event":"Application End","date":"Oct 10, 2025"},{"event":"Exam Date","date":"Feb 7, 2026"},{"event":"Result Date","date":"Mar 20, 2026"}]', ARRAY['Engineering Mathematics','Core Subject','General Aptitude'], ARRAY['IIT Delhi','IIT Bombay','IISc Bangalore','NIT Trichy'], 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop', '#', '3 hours', 'National Wise', 'English', 'Once', 'Online', 'Applications Closed'),
('uceed-2026', 'UCEED', 'Undergraduate Common Entrance Examination for Design 2026', 'Design', 'National', 'January 2026', '15K+', '10+2 any stream, age <25', 'Online (CBT)', 'UCEED is for UG design programs at IITs.', '[{"event":"Application Start","date":"Oct 1, 2025"},{"event":"Application End","date":"Nov 15, 2025"},{"event":"Exam Date","date":"Jan 18, 2026"},{"event":"Result Date","date":"Mar 5, 2026"}]', ARRAY['Visualization','Observation & Design','Analytical Reasoning','Environmental Awareness'], ARRAY['IIT Bombay IDC','IIT Delhi','IIT Guwahati'], 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop', '#', '3 hours', 'National Wise', 'English', 'Once', 'Online', 'Applications Closed'),
('cuet-2026', 'CUET', 'Common University Entrance Test 2026', 'Science', 'National', 'May 2026', '15L+', '10+2 any board', 'Online (CBT)', 'CUET is mandatory for all central university UG admissions.', '[{"event":"Application Start","date":"Feb 15, 2026"},{"event":"Application End","date":"Mar 20, 2026"},{"event":"Exam Date","date":"May 10, 2026"},{"event":"Result Date","date":"Jun 25, 2026"}]', ARRAY['Domain Subjects','General Test','Language'], ARRAY['DU Colleges','BHU','JNU','Jamia Millia Islamia'], 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop', '#', 'Variable', 'National Wise', 'Both', 'Once', 'Online', 'Upcoming'),
('xat-2026', 'XAT', 'Xavier Aptitude Test 2026', 'Management', 'National', 'January 2026', '1L+', 'Bachelor''s degree', 'Online (CBT)', 'XAT is conducted by XLRI and accepted by 200+ B-schools.', '[{"event":"Application Start","date":"Aug 10, 2025"},{"event":"Application End","date":"Nov 30, 2025"},{"event":"Exam Date","date":"Jan 4, 2026"},{"event":"Result Date","date":"Jan 16, 2026"}]', ARRAY['Verbal Ability','Decision Making','Quantitative Aptitude','GK'], ARRAY['XLRI Jamshedpur','XIMB','TAPMI','Great Lakes'], 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', '#', '3 hours', 'National Wise', 'English', 'Once', 'Online', 'Applications Closed'),
('bitsat-2026', 'BITSAT', 'BITS Admission Test 2026', 'Engineering', 'University', 'May 2026', '3L+', '10+2 with PCM, minimum 75%', 'Online (CBT)', 'BITSAT is the entrance exam for BITS Pilani campuses.', '[{"event":"Application Start","date":"Jan 10, 2026"},{"event":"Application End","date":"Mar 31, 2026"},{"event":"Exam Date","date":"May 15, 2026"},{"event":"Result Date","date":"Jun 10, 2026"}]', ARRAY['Physics','Chemistry','Mathematics','English','Logical Reasoning'], ARRAY['BITS Pilani','BITS Goa','BITS Hyderabad'], 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop', '#', '3 hours', 'National Wise', 'English', 'Once', 'Online', 'Upcoming');
