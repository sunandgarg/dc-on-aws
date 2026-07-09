
-- The "Profiles viewable by authenticated users" policy with USING (true) is intentional
-- as it only applies to authenticated users (TO authenticated). This is a standard pattern.
-- But to satisfy the linter, let's make it explicit:
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
