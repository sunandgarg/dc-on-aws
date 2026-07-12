-- Blog auto agent configuration, research queue and run logs.

CREATE TABLE IF NOT EXISTS public.blog_auto_agent_settings (
  id text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT false,
  interval_minutes integer NOT NULL DEFAULT 60 CHECK (interval_minutes IN (30, 60)),
  posts_per_run integer NOT NULL DEFAULT 2 CHECK (posts_per_run BETWEEN 1 AND 3),
  daily_post_cap integer NOT NULL DEFAULT 12 CHECK (daily_post_cap BETWEEN 1 AND 48),
  publish_status text NOT NULL DEFAULT 'Published' CHECK (publish_status IN ('Draft', 'Published')),
  model_provider text NOT NULL DEFAULT 'gemini',
  word_limit integer NOT NULL DEFAULT 1200 CHECK (word_limit IN (800, 1200, 1800)),
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.blog_auto_agent_settings (id, enabled, interval_minutes, next_run_at)
VALUES ('default', false, 60, now())
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.blog_research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL UNIQUE,
  source_type text NOT NULL DEFAULT 'competitor' CHECK (source_type IN ('competitor', 'own')),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.blog_research_sources (name, url, source_type, display_order) VALUES
  ('Shiksha', 'https://www.shiksha.com/news', 'competitor', 10),
  ('Careers360', 'https://www.careers360.com/articles', 'competitor', 20),
  ('KollegeApply', 'https://news.kollegeapply.com', 'competitor', 30),
  ('CollegeDunia', 'https://collegedunia.com/news', 'competitor', 40),
  ('CollegeDekho', 'https://www.collegedekho.com/news', 'competitor', 50),
  ('PaGaLGuY', 'https://www.pagalguy.com/mba/articles', 'competitor', 60),
  ('DekhoCampus', 'https://www.dekhocampus.in/news', 'own', 100)
ON CONFLICT (url) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.blog_auto_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'skipped', 'failed')),
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'schedule')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  interval_minutes integer,
  model_provider text,
  word_limit integer,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_article_ids uuid[] NOT NULL DEFAULT '{}',
  message text NOT NULL DEFAULT ''
);

ALTER TABLE public.blog_auto_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_auto_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read blog auto agent settings" ON public.blog_auto_agent_settings FOR SELECT USING (true);
CREATE POLICY "Public manage blog auto agent settings" ON public.blog_auto_agent_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read blog research sources" ON public.blog_research_sources FOR SELECT USING (true);
CREATE POLICY "Public manage blog research sources" ON public.blog_research_sources FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read blog auto agent runs" ON public.blog_auto_agent_runs FOR SELECT USING (true);
CREATE POLICY "Public manage blog auto agent runs" ON public.blog_auto_agent_runs FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_blog_auto_agent_settings_updated_at ON public.blog_auto_agent_settings;
CREATE TRIGGER update_blog_auto_agent_settings_updated_at
  BEFORE UPDATE ON public.blog_auto_agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_research_sources_updated_at ON public.blog_research_sources;
CREATE TRIGGER update_blog_research_sources_updated_at
  BEFORE UPDATE ON public.blog_research_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
