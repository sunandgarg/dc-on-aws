
-- Since admin is open to everyone (no auth required), we need public write access for ads and featured_colleges
-- Drop admin-only policies and add public management policies

DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;
CREATE POLICY "Anyone can manage ads"
ON public.ads
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage featured colleges" ON public.featured_colleges;
CREATE POLICY "Anyone can manage featured colleges"
ON public.featured_colleges
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
CREATE POLICY "Anyone can read leads"
ON public.leads
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage leads"
ON public.leads
FOR ALL
USING (true)
WITH CHECK (true);
