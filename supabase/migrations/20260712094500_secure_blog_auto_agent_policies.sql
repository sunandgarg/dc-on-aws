DROP POLICY IF EXISTS "Public manage blog auto agent settings" ON public.blog_auto_agent_settings;
DROP POLICY IF EXISTS "Public manage blog research sources" ON public.blog_research_sources;
DROP POLICY IF EXISTS "Public manage blog auto agent runs" ON public.blog_auto_agent_runs;

CREATE POLICY "Admins manage blog auto agent settings"
  ON public.blog_auto_agent_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage blog research sources"
  ON public.blog_research_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage blog auto agent runs"
  ON public.blog_auto_agent_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
