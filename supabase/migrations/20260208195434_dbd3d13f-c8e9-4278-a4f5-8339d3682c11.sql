
-- Fix ads RLS: drop restrictive policies, create permissive ones
DROP POLICY IF EXISTS "Anyone can manage ads" ON public.ads;
DROP POLICY IF EXISTS "Anyone can read active ads" ON public.ads;

-- Permissive: anyone can read all ads (admin needs inactive too)
CREATE POLICY "Public read all ads"
  ON public.ads FOR SELECT
  USING (true);

-- Permissive: anyone can insert/update/delete (open admin)
CREATE POLICY "Public manage ads"
  ON public.ads FOR ALL
  USING (true)
  WITH CHECK (true);

-- Fix featured_colleges RLS
DROP POLICY IF EXISTS "Anyone can manage featured colleges" ON public.featured_colleges;
DROP POLICY IF EXISTS "Anyone can read featured colleges" ON public.featured_colleges;

CREATE POLICY "Public read featured colleges"
  ON public.featured_colleges FOR SELECT
  USING (true);

CREATE POLICY "Public manage featured colleges"
  ON public.featured_colleges FOR ALL
  USING (true)
  WITH CHECK (true);

-- Fix leads RLS
DROP POLICY IF EXISTS "Anyone can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can read leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Public read leads"
  ON public.leads FOR SELECT
  USING (true);

CREATE POLICY "Public manage leads"
  ON public.leads FOR ALL
  USING (true)
  WITH CHECK (true);
