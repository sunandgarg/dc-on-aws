CREATE TABLE IF NOT EXISTS public.cat_universe_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL DEFAULT 'default',
  hero_badge text NOT NULL DEFAULT 'MBA lead engine',
  title text NOT NULL DEFAULT 'CAT Universe',
  subtitle text NOT NULL DEFAULT '',
  primary_cta_label text NOT NULL DEFAULT 'Start with CAT Score Calculator',
  primary_cta_href text NOT NULL DEFAULT '/cat-universe/cat-score-calculator',
  toggle_label text NOT NULL DEFAULT 'Switch homepage into CAT Universe mode',
  lead_title text NOT NULL DEFAULT 'Talk to an MBA admission expert',
  lead_subtitle text NOT NULL DEFAULT 'Get your shortlist, score interpretation, and next-step plan for free.',
  seo_title text NOT NULL DEFAULT 'CAT Universe - MBA calculators, call predictor and cut-offs',
  seo_description text NOT NULL DEFAULT '',
  show_home_toggle boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cat_universe_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'sparkles',
  accent_class text NOT NULL DEFAULT 'from-orange-500 to-rose-500',
  lead_hook text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cat_universe_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  section_slug text NOT NULL REFERENCES public.cat_universe_sections(slug) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  module_type text NOT NULL DEFAULT 'resource_hub',
  exam_key text NOT NULL DEFAULT 'cat',
  icon_name text NOT NULL DEFAULT 'sparkles',
  badge text NOT NULL DEFAULT '',
  stat_label text NOT NULL DEFAULT '',
  stat_value text NOT NULL DEFAULT '',
  detail_points text NOT NULL DEFAULT '',
  audience_text text NOT NULL DEFAULT '',
  primary_cta_label text NOT NULL DEFAULT 'Open module',
  primary_cta_href text NOT NULL DEFAULT '/auth',
  lead_source text NOT NULL DEFAULT 'cat_universe_module',
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  show_on_home boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cat_universe_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL REFERENCES public.cat_universe_modules(slug) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  resource_type text NOT NULL DEFAULT 'year_pack',
  year integer,
  href text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT '',
  meta text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cat_universe_cutoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL REFERENCES public.cat_universe_modules(slug) ON DELETE CASCADE,
  college_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  exam_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  percentile numeric(5,2) NOT NULL DEFAULT 0,
  cutoff_band text NOT NULL DEFAULT '',
  fees text NOT NULL DEFAULT '',
  avg_package text NOT NULL DEFAULT '',
  college_slug text NOT NULL DEFAULT '',
  highlight text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cat_universe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_universe_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_universe_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_universe_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_universe_cutoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read cat_universe_settings" ON public.cat_universe_settings;
CREATE POLICY "Public read cat_universe_settings" ON public.cat_universe_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage cat_universe_settings" ON public.cat_universe_settings;
CREATE POLICY "Admins manage cat_universe_settings" ON public.cat_universe_settings
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public read cat_universe_sections" ON public.cat_universe_sections;
CREATE POLICY "Public read cat_universe_sections" ON public.cat_universe_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage cat_universe_sections" ON public.cat_universe_sections;
CREATE POLICY "Admins manage cat_universe_sections" ON public.cat_universe_sections
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public read cat_universe_modules" ON public.cat_universe_modules;
CREATE POLICY "Public read cat_universe_modules" ON public.cat_universe_modules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage cat_universe_modules" ON public.cat_universe_modules;
CREATE POLICY "Admins manage cat_universe_modules" ON public.cat_universe_modules
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public read cat_universe_resources" ON public.cat_universe_resources;
CREATE POLICY "Public read cat_universe_resources" ON public.cat_universe_resources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage cat_universe_resources" ON public.cat_universe_resources;
CREATE POLICY "Admins manage cat_universe_resources" ON public.cat_universe_resources
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public read cat_universe_cutoffs" ON public.cat_universe_cutoffs;
CREATE POLICY "Public read cat_universe_cutoffs" ON public.cat_universe_cutoffs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage cat_universe_cutoffs" ON public.cat_universe_cutoffs;
CREATE POLICY "Admins manage cat_universe_cutoffs" ON public.cat_universe_cutoffs
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_cat_universe_settings_updated ON public.cat_universe_settings;
CREATE TRIGGER trg_cat_universe_settings_updated BEFORE UPDATE ON public.cat_universe_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cat_universe_sections_updated ON public.cat_universe_sections;
CREATE TRIGGER trg_cat_universe_sections_updated BEFORE UPDATE ON public.cat_universe_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cat_universe_modules_updated ON public.cat_universe_modules;
CREATE TRIGGER trg_cat_universe_modules_updated BEFORE UPDATE ON public.cat_universe_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cat_universe_resources_updated ON public.cat_universe_resources;
CREATE TRIGGER trg_cat_universe_resources_updated BEFORE UPDATE ON public.cat_universe_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cat_universe_cutoffs_updated ON public.cat_universe_cutoffs;
CREATE TRIGGER trg_cat_universe_cutoffs_updated BEFORE UPDATE ON public.cat_universe_cutoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cat_universe_settings (
  slug, hero_badge, title, subtitle, primary_cta_label, primary_cta_href, toggle_label, lead_title, lead_subtitle, seo_title, seo_description, show_home_toggle, is_active
) VALUES (
  'default',
  'MBA lead engine',
  'CAT Universe',
  'Everything ambitious MBA aspirants need in one place - score calculators, interview-call estimation, previous-year prep and cut-off discovery with lead capture woven into every decision point.',
  'Start with CAT Score Calculator',
  '/cat-universe/cat-score-calculator',
  'Switch homepage into CAT Universe mode',
  'Talk to an MBA admission expert',
  'Get your shortlist, score interpretation, and next-step plan for free.',
  'CAT Universe - CAT, XAT, CMAT calculators, call predictor, cut-offs and MBA guidance',
  'Explore CAT Universe on DekhoCampus - CAT, XAT and CMAT calculators, IIM call predictor, previous-year prep, cut-off discovery and MBA counselling workflows.',
  true,
  true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.cat_universe_sections (slug, title, description, icon_name, accent_class, lead_hook, display_order, is_active) VALUES
  ('post-exam', 'Post Exam', 'Convert raw attempts into action - score estimates, WAT/SOP help, and next-step strategy.', 'sparkles', 'from-orange-500 to-rose-500', 'Just attempted CAT, XAT, or CMAT? Get your score interpreted before the market moves.', 1, true),
  ('pre-exam', 'Pre Exam', 'Build preparation depth with previous-year archives, pattern memory, and resource-led lead magnets.', 'book-open', 'from-sky-500 to-indigo-500', 'Unlock year-wise prep assets and get a mentor-backed attempt strategy.', 2, true),
  ('post-result', 'Post Result', 'Move from percentile panic to interview planning with call prediction, converts guidance, and mock workflows.', 'target', 'from-violet-500 to-fuchsia-500', 'Use your percentile to map likely calls, reach schools, and interview readiness.', 3, true),
  ('important-college-cutoffs', 'Important College Cut-offs', 'Filter colleges by exam, percentile bands, fees, and placement story without forcing students to leave the funnel.', 'bar-chart-3', 'from-emerald-500 to-teal-500', 'Show students where their score can realistically convert into an MBA seat.', 4, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.cat_universe_modules (
  slug, section_slug, title, subtitle, description, module_type, exam_key, icon_name, badge, stat_label, stat_value, detail_points, audience_text, primary_cta_label, primary_cta_href, lead_source, display_order, is_featured, show_on_home, is_active
) VALUES
  ('sop-exam-score-wat', 'post-exam', 'SOP, Exam Score and WAT Desk', 'Turn uncertainty into a guided admissions narrative', 'A counseling-first hub for statement of purpose, WAT direction, and score interpretation after exam day.', 'counselling', 'cat', 'file-text', 'High-intent', 'Best for', 'MBA applicants entering profile-building mode', E'Score interpretation checklist\nWAT themes and framing\nSOP structure for MBA colleges\nProfile gap identification\n1:1 mentor callback CTA', 'Students who have attempted MBA entrance exams and need profile positioning support.', 'Get SOP and WAT help', '/auth', 'cat_universe_sop_wat', 1, true, true, true),
  ('cat-score-calculator', 'post-exam', 'CAT Score Calculator', 'Estimate raw score, percentile band and next action', 'A friction-light calculator inspired by leading CAT score estimators, adapted for DekhoCampus lead capture and follow-up.', 'calculator', 'cat', 'calculator', 'Most wanted', 'Signals shown', 'Score, percentile band, likely cut-off zone', E'Section-wise inputs\nFast percentile estimate\nCut-off alignment\nLead capture after result state', 'CAT takers checking score confidence and B-school direction before official results settle the market.', 'Open calculator', '/cat-universe/cat-score-calculator', 'cat_universe_cat_score', 2, true, true, true),
  ('xat-score-calculator', 'post-exam', 'XAT Score Calculator', 'Estimate your XAT performance band quickly', 'Use recent score-vs-percentile market patterns to estimate where your XAT score may land.', 'calculator', 'xat', 'calculator', 'Hot after XAT', 'Built for', 'XLRI and top private MBA aspirants', E'Simple score inputs\nEstimated percentile zone\nXAT-aligned college pathways', 'Students comparing XAT outcomes against private B-school cut-offs and interview possibilities.', 'Check XAT estimate', '/cat-universe/xat-score-calculator', 'cat_universe_xat_score', 3, false, true, true),
  ('cmat-score-calculator', 'post-exam', 'CMAT Score Calculator', 'Map CMAT attempts to college shortlisting signals', 'A simple CMAT estimator designed to drive immediate college-fit conversations and low-friction enquiry capture.', 'calculator', 'cmat', 'calculator', 'Lead magnet', 'Works best for', 'Students targeting CMAT-friendly private colleges', E'Quick score estimate\nRecent percentile bands\nCMAT college discovery CTA', 'Students who need fast clarity on where their CMAT outcome can convert into admissions.', 'Estimate CMAT score', '/cat-universe/cmat-score-calculator', 'cat_universe_cmat_score', 4, false, false, true),
  ('cat-previous-year-papers', 'pre-exam', 'Last 10 Year CAT Resources', 'Year-wise CAT archive built for repeat visits', 'A rolling CAT prep hub that can house question papers, pattern summaries, and mentor takeaways year by year.', 'resource_hub', 'cat', 'book-open', 'Retention', 'Archive depth', '10 years of editable cards', E'Year-wise resource cards\nLead gate ready\nAdmin-editable links and notes', 'CAT aspirants who want recent-paper familiarity and curated mentor commentary.', 'Explore CAT archive', '/cat-universe/cat-previous-year-papers', 'cat_universe_cat_archive', 1, true, true, true),
  ('xat-previous-year-papers', 'pre-exam', 'Last 10 Year XAT Resources', 'Pattern memory and decision-making support for XAT', 'A dynamic XAT prep archive that keeps year cards, notes and lead capture in one structured loop.', 'resource_hub', 'xat', 'book-open', 'Prep', 'Focus', 'Decision-making and verbal trend review', E'Year-wise cards\nEditable links\nGuided preparation CTA', 'XAT aspirants who benefit from exam-pattern recall and mentor-backed resource flows.', 'Browse XAT archive', '/cat-universe/xat-previous-year-papers', 'cat_universe_xat_archive', 2, false, false, true),
  ('mat-previous-year-papers', 'pre-exam', 'Last 10 Year MAT Resources', 'Steady-funnel prep content for MAT seekers', 'Admin-manageable MAT archive cards with clear lead magnets and counseling prompts.', 'resource_hub', 'mat', 'book-open', 'Evergreen', 'Use case', 'Consistent exam-season lead generation', E'Year cards\nCall-back CTA\nQuick prep navigation', 'Students using MAT as a pathway into private management institutes.', 'Open MAT archive', '/cat-universe/mat-previous-year-papers', 'cat_universe_mat_archive', 3, false, false, true),
  ('gmat-previous-year-papers', 'pre-exam', 'Last 10 Year GMAT Resources', 'GMAT-focused prep cards for MBA and MiM audiences', 'A reusable GMAT prep area that can support both domestic and overseas pathways.', 'resource_hub', 'gmat', 'book-open', 'Premium traffic', 'Audience', 'GMAT-based MBA and MiM seekers', E'Year-wise assets\nHigh-value lead capture\nProfile-based counselor routing', 'Students exploring higher-ticket GMAT programs in India and abroad.', 'View GMAT resources', '/cat-universe/gmat-previous-year-papers', 'cat_universe_gmat_archive', 4, false, false, true),
  ('sat-previous-year-papers', 'pre-exam', 'Last 10 Year SAT Resources', 'SAT archive cards for exam familiarity and parent trust', 'A configurable SAT archive workflow that keeps students and parents moving toward a guided conversation.', 'resource_hub', 'sat', 'book-open', 'Parent friendly', 'Intent', 'High-information pre-application traffic', E'Year cards\nPrep support CTA\nParent-counseling handoff', 'Students and families exploring SAT-based undergraduate applications.', 'Browse SAT resources', '/cat-universe/sat-previous-year-papers', 'cat_universe_sat_archive', 5, false, false, true),
  ('interview-calls-converts', 'post-result', 'Interview Calls and Converts', 'Turn percentile into realistic call expectations', 'A counseling-led route for estimating likely interview calls and the kind of conversion strategy a student should pursue.', 'predictor', 'cat', 'target', 'Post-result', 'Outcome', 'Likely, reach and dream call zones', E'Percentile-first estimator\nProfile-sensitive interpretation\nCounselor handoff after shortlist', 'Students who want clarity on interviews, converts and realistic school positioning.', 'Estimate interview calls', '/cat-universe/interview-calls-converts', 'cat_universe_interview_calls', 1, true, true, true),
  ('mock-interview-and-dockets', 'post-result', 'Mock Interview and Dockets', 'Collect high-intent MBA leads before GDPI season', 'A lead-focused workflow for interview prep, personal dossier building and mentor callbacks.', 'counselling', 'cat', 'briefcase', 'High-conversion', 'Use case', 'GDPI-season counselling and bookings', E'Mock interview prep CTA\nDocket and profile checklist\nMentor routing and callback', 'Students moving from shortlist to interview preparation.', 'Book interview support', '/cat-universe/mock-interview-and-dockets', 'cat_universe_mock_interview', 2, false, true, true),
  ('iim-call-predictor', 'post-result', 'IIM Call Predictor', 'Percentile plus profile-aware IIM shortlist guidance', 'Inspired by leading market predictors, but designed to keep users inside the DekhoCampus conversion funnel.', 'predictor', 'cat', 'target', 'Core feature', 'Inputs', 'Percentile, category, academics, work ex', E'Profile-aware scoring\nLikely and reach segmentation\nCut-off informed shortlist output', 'CAT students looking for IIM and B-school call probability insights.', 'Run IIM predictor', '/cat-universe/iim-call-predictor', 'cat_universe_iim_predictor', 3, true, true, true),
  ('cat-based-college-cutoffs', 'important-college-cutoffs', 'CAT Based College Cut-offs', 'Explore percentile-linked MBA options by CAT outcome', 'Filterable cut-off rows for CAT-based MBA colleges, built to reduce exits and increase counselor enquiries.', 'cutoff_list', 'cat', 'bar-chart-3', 'SEO pillar', 'Best for', 'Students comparing CAT options quickly', E'Percentile-led discovery\nFees and package context\nDirect enquiry points', 'CAT aspirants deciding where to apply or where to expect calls.', 'See CAT cut-offs', '/cat-universe/cat-based-college-cutoffs', 'cat_universe_cat_cutoffs', 1, true, true, true),
  ('nmat-based-college-cutoffs', 'important-college-cutoffs', 'NMAT Based College Cut-offs', 'Map NMAT performance to private MBA opportunities', 'A dynamic cut-off page for NMAT-targeting students who want quick college discovery and conversion prompts.', 'cutoff_list', 'nmat', 'bar-chart-3', 'Private B-schools', 'Intent', 'NMIMS and NMAT-accepting colleges', E'Score-led college list\nFees and package context\nLead capture throughout', 'Students exploring NMAT-based MBA admissions.', 'View NMAT options', '/cat-universe/nmat-based-college-cutoffs', 'cat_universe_nmat_cutoffs', 2, false, false, true),
  ('snap-based-cutoffs', 'important-college-cutoffs', 'SNAP Based Cut-offs', 'Find Symbiosis-aligned MBA targets faster', 'A SNAP-focused discovery page that helps students map performance to likely Symbiosis pathways.', 'cutoff_list', 'snap', 'bar-chart-3', 'Brand-heavy', 'Ideal for', 'Symbiosis-oriented students', E'SNAP-based college list\nCut-off and fee context\nCounselor escalation CTA', 'Students targeting Symbiosis institutes and related management schools.', 'See SNAP cut-offs', '/cat-universe/snap-based-cutoffs', 'cat_universe_snap_cutoffs', 3, false, false, true),
  ('xat-based-college-cutoffs', 'important-college-cutoffs', 'XAT Based College Cut-offs', 'From XLRI dreams to realistic private-school targets', 'A decision-ready XAT cut-off module designed for traffic retention and counselor conversion.', 'cutoff_list', 'xat', 'bar-chart-3', 'Decision-ready', 'Coverage', 'XLRI and XAT-accepting schools', E'Percentile-led exploration\nCity, fees and package view\nLead prompts after filter use', 'XAT candidates comparing flagship and reachable colleges.', 'Browse XAT cut-offs', '/cat-universe/xat-based-college-cutoffs', 'cat_universe_xat_cutoffs', 4, false, true, true),
  ('top-gmat-based-colleges', 'important-college-cutoffs', 'Top GMAT Based Colleges', 'Premium-intent discovery for GMAT candidates', 'A high-value college discovery flow for GMAT users looking at MBA programs that accept GMAT scores.', 'cutoff_list', 'gmat', 'bar-chart-3', 'Premium', 'Ideal for', 'Higher-ticket counseling journeys', E'GMAT college list\nApproximate score bands\nCounselor follow-up hooks', 'Students evaluating GMAT-based MBA opportunities in India and abroad-facing institutions.', 'Find GMAT colleges', '/cat-universe/top-gmat-based-colleges', 'cat_universe_gmat_colleges', 5, false, false, true),
  ('top-gmat-based-colleges-mim', 'important-college-cutoffs', 'Top GMAT Based Colleges - MiM Programs', 'Management-in-Master pathways for globally mobile students', 'A dedicated MiM discovery surface for GMAT/GRE-adjacent aspirants and international admissions counseling.', 'cutoff_list', 'gmat', 'bar-chart-3', 'Global', 'Focus', 'MiM-ready student journeys', E'MiM-friendly institutions\nPremium lead capture\nParent-involved counselling pathways', 'Students interested in MiM programs and profile-led overseas planning.', 'Explore MiM colleges', '/cat-universe/top-gmat-based-colleges-mim', 'cat_universe_mim_colleges', 6, false, false, true),
  ('iits-cat-cutoff', 'important-college-cutoffs', 'IITs CAT Cutoff', 'Specialized IIT MBA discovery by percentile band', 'An IIT MBA-oriented cut-off module that captures strong ROI-seeking CAT traffic.', 'cutoff_list', 'cat', 'bar-chart-3', 'High ROI', 'Value angle', 'ROI-focused MBA seekers', E'IIT MBA comparison\nPercentile bands\nFee vs package positioning', 'Students who want strong MBA ROI without only chasing legacy IIM brands.', 'View IIT MBA cut-offs', '/cat-universe/iits-cat-cutoff', 'cat_universe_iit_cutoffs', 7, true, true, true),
  ('cmat-based-colleges-and-cutoffs', 'important-college-cutoffs', 'CMAT Based Colleges and Cut-offs', 'Fast CMAT discovery for applications that need urgency', 'A CMAT-oriented decision page that pairs score bands with practical college options and enquiry prompts.', 'cutoff_list', 'cmat', 'bar-chart-3', 'Actionable', 'Good for', 'Late-stage private college applications', E'CMAT-friendly colleges\nApproximate percentile context\nQuick call-back capture', 'Students shortlisting private MBA options after CMAT.', 'See CMAT colleges', '/cat-universe/cmat-based-colleges-and-cutoffs', 'cat_universe_cmat_cutoffs', 8, false, true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.cat_universe_resources (module_slug, title, subtitle, resource_type, year, href, badge, meta, display_order, is_active)
SELECT 'cat-previous-year-papers', 'CAT ' || y || ' resource pack', 'Previous-year paper direction, pattern recap and mentor notes for ' || y || '.', 'year_pack', y, '', 'Add PDF or link in admin', 'Lead gate ready', ROW_NUMBER() OVER (), true
FROM generate_series(EXTRACT(YEAR FROM now())::int - 1, EXTRACT(YEAR FROM now())::int - 10, -1) y
ON CONFLICT DO NOTHING;

INSERT INTO public.cat_universe_resources (module_slug, title, subtitle, resource_type, year, href, badge, meta, display_order, is_active)
SELECT 'xat-previous-year-papers', 'XAT ' || y || ' resource pack', 'Previous-year paper direction, pattern recap and mentor notes for ' || y || '.', 'year_pack', y, '', 'Add PDF or link in admin', 'Lead gate ready', ROW_NUMBER() OVER (), true
FROM generate_series(EXTRACT(YEAR FROM now())::int - 1, EXTRACT(YEAR FROM now())::int - 10, -1) y
ON CONFLICT DO NOTHING;

INSERT INTO public.cat_universe_resources (module_slug, title, subtitle, resource_type, year, href, badge, meta, display_order, is_active)
SELECT 'mat-previous-year-papers', 'MAT ' || y || ' resource pack', 'Previous-year paper direction, pattern recap and mentor notes for ' || y || '.', 'year_pack', y, '', 'Add PDF or link in admin', 'Lead gate ready', ROW_NUMBER() OVER (), true
FROM generate_series(EXTRACT(YEAR FROM now())::int - 1, EXTRACT(YEAR FROM now())::int - 10, -1) y
ON CONFLICT DO NOTHING;

INSERT INTO public.cat_universe_resources (module_slug, title, subtitle, resource_type, year, href, badge, meta, display_order, is_active)
SELECT 'gmat-previous-year-papers', 'GMAT ' || y || ' resource pack', 'Previous-year paper direction, pattern recap and mentor notes for ' || y || '.', 'year_pack', y, '', 'Add PDF or link in admin', 'Lead gate ready', ROW_NUMBER() OVER (), true
FROM generate_series(EXTRACT(YEAR FROM now())::int - 1, EXTRACT(YEAR FROM now())::int - 10, -1) y
ON CONFLICT DO NOTHING;

INSERT INTO public.cat_universe_resources (module_slug, title, subtitle, resource_type, year, href, badge, meta, display_order, is_active)
SELECT 'sat-previous-year-papers', 'SAT ' || y || ' resource pack', 'Previous-year paper direction, pattern recap and mentor notes for ' || y || '.', 'year_pack', y, '', 'Add PDF or link in admin', 'Lead gate ready', ROW_NUMBER() OVER (), true
FROM generate_series(EXTRACT(YEAR FROM now())::int - 1, EXTRACT(YEAR FROM now())::int - 10, -1) y
ON CONFLICT DO NOTHING;

INSERT INTO public.cat_universe_resources (module_slug, title, subtitle, resource_type, year, href, badge, meta, display_order, is_active) VALUES
  ('sop-exam-score-wat', 'WAT topic bank', 'MBA-friendly themes students can practice with mentor framing.', 'template', NULL, '', 'Counselling hook', 'Turn into PDF or article later', 1, true),
  ('sop-exam-score-wat', 'MBA SOP starter framework', 'Reusable prompt structure for profile storytelling.', 'template', NULL, '', 'High-intent', 'Lead magnet', 2, true),
  ('mock-interview-and-dockets', 'Mock interview checklist', 'A structured practice list covering academics, goals and current affairs.', 'checklist', NULL, '', 'Interview prep', 'Great for callbacks', 1, true),
  ('mock-interview-and-dockets', 'Docket preparation guide', 'Collect documents, profile bullets and answer-ready evidence before GDPI.', 'checklist', NULL, '', 'Operations', 'Easy conversion trigger', 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.cat_universe_cutoffs (module_slug, college_name, city, exam_name, category, percentile, cutoff_band, fees, avg_package, college_slug, highlight, display_order, is_active) VALUES
  ('cat-based-college-cutoffs', 'IIM Ahmedabad', 'Ahmedabad', 'CAT', 'General', 99.50, '99.5+', '₹26L', '₹35L+', 'iim-ahmedabad', 'Top-tier old IIM', 1, true),
  ('cat-based-college-cutoffs', 'IIM Bangalore', 'Bengaluru', 'CAT', 'General', 99.40, '99.4+', '₹25L', '₹35L+', 'iim-bangalore', 'Strong brand and placements', 2, true),
  ('cat-based-college-cutoffs', 'FMS Delhi', 'Delhi', 'CAT', 'General', 98.50, '98.5+', '₹2L', '₹34L+', '', 'Ultra-high ROI', 3, true),
  ('cat-based-college-cutoffs', 'MDI Gurgaon', 'Gurugram', 'CAT', 'General', 95.00, '95+', '₹25L', '₹27L+', '', 'Private B-school benchmark', 4, true),
  ('cat-based-college-cutoffs', 'IIM Trichy', 'Tiruchirappalli', 'CAT', 'General', 94.00, '94+', '₹20L', '₹20L+', '', 'New IIM value play', 5, true),
  ('cat-based-college-cutoffs', 'IMT Ghaziabad', 'Ghaziabad', 'CAT', 'General', 90.00, '90+', '₹23L', '₹16L+', '', 'Strong marketer brand recall', 6, true),
  ('cat-based-college-cutoffs', 'FORE School of Management', 'New Delhi', 'CAT', 'General', 85.00, '85+', '₹23L', '₹16L+', '', 'Good for 85+ band', 7, true),
  ('nmat-based-college-cutoffs', 'NMIMS Mumbai', 'Mumbai', 'NMAT', 'General', 94.00, '235+ score equivalent', '₹25L', '₹26L+', '', 'Flagship NMAT target', 1, true),
  ('nmat-based-college-cutoffs', 'NMIMS Bengaluru', 'Bengaluru', 'NMAT', 'General', 88.00, '220+ score equivalent', '₹20L', '₹14L+', '', 'High-interest private option', 2, true),
  ('nmat-based-college-cutoffs', 'TAPMI', 'Manipal', 'NMAT', 'General', 86.00, '215+ score equivalent', '₹19L', '₹14L+', '', 'Stable NMAT pathway', 3, true),
  ('snap-based-cutoffs', 'SIBM Pune', 'Pune', 'SNAP', 'General', 97.00, '97+', '₹24L', '₹26L+', '', 'Top Symbiosis target', 1, true),
  ('snap-based-cutoffs', 'SCMHRD', 'Pune', 'SNAP', 'General', 94.00, '94+', '₹23L', '₹24L+', '', 'Premium HR and MBA brand', 2, true),
  ('snap-based-cutoffs', 'SIIB', 'Pune', 'SNAP', 'General', 90.00, '90+', '₹20L', '₹14L+', '', 'Good conversion target', 3, true),
  ('xat-based-college-cutoffs', 'XLRI Jamshedpur', 'Jamshedpur', 'XAT', 'General', 98.00, '98+', '₹30L', '₹29L+', '', 'XAT flagship', 1, true),
  ('xat-based-college-cutoffs', 'XIM University', 'Bhubaneswar', 'XAT', 'General', 91.00, '91+', '₹21L', '₹19L+', '', 'XAT-friendly conversion play', 2, true),
  ('xat-based-college-cutoffs', 'IMT Ghaziabad', 'Ghaziabad', 'XAT', 'General', 90.00, '90+', '₹23L', '₹16L+', '', 'Strong private option', 3, true),
  ('xat-based-college-cutoffs', 'TAPMI', 'Manipal', 'XAT', 'General', 85.00, '85+', '₹19L', '₹14L+', '', 'Reachable XAT target', 4, true),
  ('top-gmat-based-colleges', 'ISB Hyderabad', 'Hyderabad', 'GMAT', 'General', 95.00, 'GMAT 700+ typical', '₹42L+', '₹34L+', '', 'Premium one-year MBA', 1, true),
  ('top-gmat-based-colleges', 'SPJIMR PGPM', 'Mumbai', 'GMAT', 'General', 88.00, 'GMAT 650+ typical', '₹22L+', '₹20L+', '', 'Experienced candidates', 2, true),
  ('top-gmat-based-colleges', 'Great Lakes Chennai', 'Chennai', 'GMAT', 'General', 80.00, 'GMAT 600+ typical', '₹18L+', '₹15L+', '', 'Accessible one-year route', 3, true),
  ('top-gmat-based-colleges-mim', 'SP Jain Global - MiM pathway', 'Dubai / Singapore / Sydney', 'GMAT', 'General', 85.00, 'Profile-driven', '₹35L+', 'Varies', '', 'Global mobility', 1, true),
  ('top-gmat-based-colleges-mim', 'ESCP-style MiM shortlisting', 'Europe', 'GMAT', 'General', 85.00, 'Profile-driven', 'High-ticket', 'Varies', '', 'Overseas counselling hook', 2, true),
  ('iits-cat-cutoff', 'IIT Delhi DMS', 'Delhi', 'CAT', 'General', 96.00, '96+', '₹11L', '₹25L+', '', 'Strong ROI', 1, true),
  ('iits-cat-cutoff', 'IIT Bombay SJMSOM', 'Mumbai', 'CAT', 'General', 98.00, '98+', '₹15L', '₹28L+', '', 'Premium IIT MBA', 2, true),
  ('iits-cat-cutoff', 'IIT Kharagpur VGSoM', 'Kharagpur', 'CAT', 'General', 90.00, '90+', '₹12L', '₹22L+', '', 'Strong 90+ option', 3, true),
  ('iits-cat-cutoff', 'IIT Kanpur DoMS', 'Kanpur', 'CAT', 'General', 90.00, '90+', '₹5L', '₹18L+', '', 'Very high ROI', 4, true),
  ('cmat-based-colleges-and-cutoffs', 'K J Somaiya Institute of Management', 'Mumbai', 'CMAT', 'General', 95.00, '95+', '₹22L', '₹13L+', '', 'High urban demand', 1, true),
  ('cmat-based-colleges-and-cutoffs', 'Welingkar Mumbai', 'Mumbai', 'CMAT', 'General', 90.00, '90+', '₹14L', '₹12L+', '', 'Strong CMAT interest', 2, true),
  ('cmat-based-colleges-and-cutoffs', 'PUMBA', 'Pune', 'CMAT', 'General', 92.00, '92+', '₹2L', '₹9L+', '', 'Excellent ROI', 3, true)
ON CONFLICT DO NOTHING;
