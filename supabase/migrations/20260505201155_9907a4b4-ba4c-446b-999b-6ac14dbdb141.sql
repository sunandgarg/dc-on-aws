
-- Helper: drop + recreate "Public manage" -> admin-only ALL, keep public SELECT
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'articles','colleges','courses','exams','ads','hero_banners','faqs',
    'popular_places','featured_colleges','promoted_programs','trusted_partners',
    'legal_pages','faculty','college_facilities','facilities_library',
    'college_contacts','course_fees','companies','placement_records',
    'career_profiles','career_course_links','article_links'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public manage %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Admins manage %I" ON public.%I FOR ALL TO public USING (has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''admin''::app_role))', t, t);
    EXECUTE format('CREATE POLICY "Public read %I" ON public.%I FOR SELECT TO public USING (true)', t, t);
  END LOOP;
END $$;

-- Leads: public can INSERT only; admins manage; public cannot read
DROP POLICY IF EXISTS "Public manage leads" ON public.leads;
DROP POLICY IF EXISTS "Public read leads" ON public.leads;
CREATE POLICY "Public insert leads" ON public.leads
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins manage leads" ON public.leads
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Banners table (no rls policies row in dump, defensive)
ALTER TABLE IF EXISTS public.hero_banners ENABLE ROW LEVEL SECURITY;
