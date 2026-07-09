
-- Landing pages (dynamic /lp)
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Branding
  brand_name TEXT NOT NULL DEFAULT 'KollegeApply',
  logo_url TEXT NOT NULL DEFAULT '',
  nav_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_label TEXT NOT NULL DEFAULT 'Get Guidance',
  cta_href TEXT NOT NULL DEFAULT '#apply-card',
  -- Hero
  eyebrow TEXT NOT NULL DEFAULT '',
  hero_title TEXT NOT NULL DEFAULT '',
  hero_subtitle TEXT NOT NULL DEFAULT '',
  primary_cta_label TEXT NOT NULL DEFAULT 'Talk to an advisor',
  primary_cta_href TEXT NOT NULL DEFAULT '#apply-card',
  secondary_cta_label TEXT NOT NULL DEFAULT 'View application form ↓',
  secondary_cta_href TEXT NOT NULL DEFAULT '#apply-card',
  stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Form card
  form_title TEXT NOT NULL DEFAULT 'Quick application',
  form_subtitle TEXT NOT NULL DEFAULT 'Tell us about you. We respond in under 24 hours.',
  form_courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  form_submit_label TEXT NOT NULL DEFAULT 'SUBMIT',
  form_consent_text TEXT NOT NULL DEFAULT 'By submitting, you agree to our Privacy Policy and to receive communications about education programs. This is not an offer of credit, employment, or guaranteed admission.',
  -- Sections
  courses_title TEXT NOT NULL DEFAULT 'Explore courses',
  courses_subtitle TEXT NOT NULL DEFAULT 'Designed with industry mentors, updated each quarter.',
  courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  why_title TEXT NOT NULL DEFAULT 'Why learners pick us',
  why_subtitle TEXT NOT NULL DEFAULT '',
  why_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  testimonials_title TEXT NOT NULL DEFAULT 'Hear from learners',
  testimonials JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Footer / legal
  footer_text TEXT NOT NULL DEFAULT '',
  privacy_url TEXT NOT NULL DEFAULT '/legal/privacy',
  terms_url TEXT NOT NULL DEFAULT '/legal/terms',
  -- SEO
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  meta_keywords TEXT NOT NULL DEFAULT '',
  og_image TEXT NOT NULL DEFAULT '',
  -- Tracking (per-LP)
  ga_id TEXT NOT NULL DEFAULT '',
  gtm_id TEXT NOT NULL DEFAULT '',
  meta_pixel_id TEXT NOT NULL DEFAULT '',
  -- Theme tokens
  theme JSONB NOT NULL DEFAULT '{"primary":"#ee5a36","ink":"#0e2236","bg":"#ffffff","accent":"#ffeae3"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read landing_pages" ON public.landing_pages FOR SELECT USING (true);
CREATE POLICY "Admins manage landing_pages" ON public.landing_pages FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_landing_pages_updated BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Landing page leads (separate from main leads to keep ad campaigns clean)
CREATE TABLE IF NOT EXISTS public.landing_page_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  city TEXT,
  state TEXT,
  course TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  gclid TEXT,
  fbclid TEXT,
  referrer TEXT,
  page_url TEXT,
  consent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read lp leads" ON public.landing_page_leads FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public insert lp leads" ON public.landing_page_leads FOR INSERT WITH CHECK (true);

-- Granular per-user permission overrides (Module x Action)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allow BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, action)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage user_permissions" ON public.user_permissions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users read own permissions" ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Seed a default /lp page modeled on the reference, fully editable from admin
INSERT INTO public.landing_pages (
  slug, brand_name, logo_url, nav_links, cta_label, cta_href,
  eyebrow, hero_title, hero_subtitle,
  primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href,
  stats, form_courses,
  courses, why_items, testimonials, faqs,
  footer_text, meta_title, meta_description
) VALUES (
  'lp', 'DekhoCampus', '',
  '[{"label":"Courses","href":"#courses"},{"label":"Why Us","href":"#why"},{"label":"Apply","href":"#apply-card"}]'::jsonb,
  'Get Guidance', '#apply-card',
  'Future-proof skills · Mentors from top companies',
  'Unlock career-ready learning with industry-grade programs.',
  'Pick a track, learn with projects, and get paired with dedicated career coaches. Built for busy learners who want outcomes.',
  'Talk to an advisor', '#apply-card', 'View application form ↓', '#apply-card',
  '[{"value":"40K+","label":"Active learners"},{"value":"93%","label":"Complete capstone"},{"value":"120+","label":"Hiring partners"}]'::jsonb,
  '["MBA (Master of Business Administration)","BBA (Bachelor of Business Administration)","BCA (Bachelor of Computer Applications)","MCA (Master of Computer Applications)","PGDM (Post Graduate Diploma in Management)","B.Com (Hons.)"]'::jsonb,
  '[
    {"tag":"Leadership Track","title":"MBA (Master of Business Administration)","duration":"2 years","level":"Postgraduate"},
    {"tag":"Management Foundations","title":"BBA (Bachelor of Business Administration)","duration":"3 years","level":"Undergraduate"},
    {"tag":"Tech + Business","title":"BCA (Bachelor of Computer Applications)","duration":"3 years","level":"Undergraduate"},
    {"tag":"Advanced Tech","title":"MCA (Master of Computer Applications)","duration":"2 years","level":"Postgraduate"},
    {"tag":"Industry Ready","title":"PGDM (Post Graduate Diploma in Management)","duration":"2 years","level":"Postgraduate"},
    {"tag":"Finance & Commerce","title":"B.Com (Hons.)","duration":"3 years","level":"Undergraduate"}
  ]'::jsonb,
  '[
    {"title":"Outcome-first roadmaps","desc":"Every module ladders into a real job outcome with measurable milestones."},
    {"title":"Live cohorts with mentors","desc":"Weekly live sessions with practitioners from top companies."},
    {"title":"Career coaching included","desc":"Resume reviews, mock interviews, and 1:1 placement support."},
    {"title":"Flexible for working learners","desc":"Evening and weekend tracks fit around your full-time work."}
  ]'::jsonb,
  '[
    {"name":"Ananya S.","role":"PGDM, 2025","quote":"The career coach helped me land 3 final-round interviews in a month."},
    {"name":"Rohit K.","role":"MCA, 2024","quote":"Project-led learning made the difference — recruiters loved my portfolio."}
  ]'::jsonb,
  '[
    {"q":"Is this an accredited program?","a":"Programs are delivered with university partners. Accreditation varies by track — confirmed during your advisor call."},
    {"q":"Are EMI options available?","a":"Yes, no-cost EMI on most programs through partner lenders, subject to eligibility."},
    {"q":"What is the refund policy?","a":"7-day no-questions-asked refund from program start. Full policy shared before enrolment."}
  ]'::jsonb,
  '© DekhoCampus. All rights reserved.',
  'Career-ready learning programs | Apply Today',
  'Industry-grade programs with live mentors and career coaching. Apply now and get a callback within 24 hours.'
)
ON CONFLICT (slug) DO NOTHING;
