
-- Fix ads policies: Drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can read active ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;

CREATE POLICY "Anyone can read active ads"
ON public.ads
FOR SELECT
USING (
  (is_active = true)
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);

CREATE POLICY "Admins can manage ads"
ON public.ads
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix featured_colleges policies: Drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can read featured colleges" ON public.featured_colleges;
DROP POLICY IF EXISTS "Admins can manage featured colleges" ON public.featured_colleges;

CREATE POLICY "Anyone can read featured colleges"
ON public.featured_colleges
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage featured colleges"
ON public.featured_colleges
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix leads policies: Drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
DROP POLICY IF EXISTS "Service role can read leads" ON public.leads;

CREATE POLICY "Anyone can submit a lead"
ON public.leads
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read leads"
ON public.leads
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage leads"
ON public.leads
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix user_roles policies: Drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles policies: Drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);
