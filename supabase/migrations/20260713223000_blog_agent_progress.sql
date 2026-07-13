ALTER TABLE public.blog_auto_agent_runs
  ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step text NOT NULL DEFAULT 'Queued',
  ADD COLUMN IF NOT EXISTS estimated_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_steps integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_steps integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.blog_auto_agent_runs.progress IS 'Visible 0-100 progress for the admin article agent.';
COMMENT ON COLUMN public.blog_auto_agent_runs.current_step IS 'Current research, writing, image or publishing step.';

DROP POLICY IF EXISTS "Public read blog auto agent settings" ON public.blog_auto_agent_settings;
DROP POLICY IF EXISTS "Public read blog research sources" ON public.blog_research_sources;
DROP POLICY IF EXISTS "Public read blog auto agent runs" ON public.blog_auto_agent_runs;
