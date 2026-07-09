
CREATE TABLE IF NOT EXISTS public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read legal_pages" ON public.legal_pages FOR SELECT USING (true);
CREATE POLICY "Public manage legal_pages" ON public.legal_pages FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_legal_pages_updated BEFORE UPDATE ON public.legal_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_pages (slug, title, content, meta_title, meta_description) VALUES
('privacy-policy', 'Privacy Policy', '<h2>Introduction</h2><p>DekhoCampus respects your privacy. This policy explains what data we collect and how we use it.</p><h2>Information We Collect</h2><p>Name, email, phone, education details you submit through forms.</p><h2>How We Use It</h2><p>To provide counselling, send updates, and improve our services.</p><h2>Contact</h2><p>Email privacy@dekhocampus.com for any concerns.</p>', 'Privacy Policy | DekhoCampus', 'How DekhoCampus collects, uses, and protects your personal data.'),
('terms-of-service', 'Terms of Service', '<h2>Acceptance</h2><p>By using DekhoCampus you agree to these terms.</p><h2>User Conduct</h2><p>Provide accurate information; do not misuse the platform.</p><h2>Liability</h2><p>Information is provided as-is. Verify with official sources before decisions.</p>', 'Terms of Service | DekhoCampus', 'Terms governing your use of the DekhoCampus platform.'),
('refund-policy', 'Refund & Payment Policy', '<h2>Payments</h2><p>All paid services are billed upfront via secure gateways.</p><h2>Refund Eligibility</h2><p>Refund requests within 7 days of payment are considered for unused services.</p><h2>How to Request</h2><p>Email billing@dekhocampus.com with your transaction ID.</p>', 'Refund & Payment Policy | DekhoCampus', 'Our refund eligibility, process, and payment terms.'),
('cookie-policy', 'Cookie Policy', '<h2>What are cookies</h2><p>Small files stored on your device to remember preferences.</p><h2>How we use them</h2><p>Analytics, login sessions, personalisation.</p>', 'Cookie Policy | DekhoCampus', 'How DekhoCampus uses cookies and similar technologies.'),
('accessibility', 'Accessibility', '<h2>Our commitment</h2><p>We aim to make DekhoCampus accessible to everyone, including users with disabilities.</p>', 'Accessibility | DekhoCampus', 'DekhoCampus accessibility commitments and standards.'),
('about-us', 'About Us', '<h2>Our Mission</h2><p>To help every Indian student find the right college, course, and career path through trusted data and AI guidance.</p>', 'About Us | DekhoCampus', 'Learn about DekhoCampus — India''s AI-powered education platform.')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  domain text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  avg_salary text NOT NULL DEFAULT '',
  growth text NOT NULL DEFAULT '',
  experience_required text NOT NULL DEFAULT '',
  top_skills text[] NOT NULL DEFAULT '{}',
  top_companies text[] NOT NULL DEFAULT '{}',
  related_courses text[] NOT NULL DEFAULT '{}',
  related_exams text[] NOT NULL DEFAULT '{}',
  job_roles jsonb NOT NULL DEFAULT '[]',
  image text NOT NULL DEFAULT '',
  icon_emoji text NOT NULL DEFAULT '💼',
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  meta_keywords text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Published',
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read career_profiles" ON public.career_profiles FOR SELECT USING (true);
CREATE POLICY "Public manage career_profiles" ON public.career_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_career_profiles_updated BEFORE UPDATE ON public.career_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.career_profiles (slug, name, domain, short_description, description, avg_salary, growth, top_skills, top_companies, related_courses, icon_emoji, is_featured) VALUES
('software-engineer', 'Software Engineer', 'Technology', 'Design, build and maintain software systems and applications.', 'Software engineers apply engineering principles to design, develop, test and maintain software. They work across web, mobile, backend, and embedded systems.', '₹6 - 25 LPA', 'Very High (22% YoY)', ARRAY['Programming','Data Structures','System Design','Problem Solving'], ARRAY['Google','Microsoft','Amazon','TCS','Infosys'], ARRAY['b-tech-cse','bca','mca'], '💻', true),
('data-scientist', 'Data Scientist', 'Technology', 'Extract insights from data using statistics, ML and visualisation.', 'Data scientists combine statistics, programming and domain knowledge to derive insights and build predictive models.', '₹8 - 30 LPA', 'High (15% YoY)', ARRAY['Python','SQL','Machine Learning','Statistics'], ARRAY['Google','Flipkart','Meta','Mu Sigma'], ARRAY['b-tech-cse','m-sc-data-science'], '📊', true),
('chartered-accountant', 'Chartered Accountant', 'Finance', 'Audit, taxation, advisory and financial reporting expertise.', 'CAs handle audits, tax planning, statutory compliance, and corporate financial advisory across industries.', '₹7 - 20 LPA', 'Steady (8% YoY)', ARRAY['Accounting','Auditing','Taxation','Financial Reporting'], ARRAY['Deloitte','PwC','EY','KPMG'], ARRAY['b-com','ca'], '📈', true),
('doctor', 'Doctor (MBBS)', 'Healthcare', 'Diagnose, treat and care for patients across specialisations.', 'Medical doctors provide care across general practice, surgery, pediatrics, and more after MBBS and specialisation.', '₹8 - 40 LPA', 'High (10% YoY)', ARRAY['Diagnosis','Patient Care','Anatomy','Communication'], ARRAY['AIIMS','Apollo','Fortis','Max Healthcare'], ARRAY['mbbs','md'], '🩺', true),
('product-manager', 'Product Manager', 'Technology', 'Define product vision, roadmap and lead cross-functional execution.', 'PMs sit at the intersection of business, design and engineering to ship products users love.', '₹15 - 50 LPA', 'High (18% YoY)', ARRAY['Strategy','User Research','Analytics','Communication'], ARRAY['Google','Flipkart','Swiggy','Razorpay'], ARRAY['b-tech-cse','mba'], '🎯', true),
('mechanical-engineer', 'Mechanical Engineer', 'Engineering', 'Design and build machines, engines and mechanical systems.', 'Mechanical engineers work on automotive, aerospace, manufacturing, HVAC, and energy systems.', '₹4 - 15 LPA', 'Steady (6% YoY)', ARRAY['CAD','Thermodynamics','Manufacturing','Problem Solving'], ARRAY['Tata Motors','Mahindra','L&T','Bosch'], ARRAY['b-tech-mech','m-tech'], '⚙️', false)
ON CONFLICT (slug) DO NOTHING;
