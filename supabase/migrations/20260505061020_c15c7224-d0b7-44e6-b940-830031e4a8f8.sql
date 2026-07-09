DROP POLICY IF EXISTS "Admins manage promoted_programs" ON public.promoted_programs;
CREATE POLICY "Public manage promoted_programs" ON public.promoted_programs FOR ALL USING (true) WITH CHECK (true);