CREATE TABLE IF NOT EXISTS public.about_page (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_eyebrow text NOT NULL DEFAULT 'About DekhoCampus',
  hero_title text NOT NULL DEFAULT 'We help students choose better',
  hero_subtitle text NOT NULL DEFAULT 'and help colleges teach them better',
  hero_image text NOT NULL DEFAULT '',
  mission text NOT NULL DEFAULT '',
  vision text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  story_image text NOT NULL DEFAULT '',
  cta_title text NOT NULL DEFAULT 'Get expert counselling for free',
  cta_subtitle text NOT NULL DEFAULT '',
  meta_title text NOT NULL DEFAULT 'About Us | DekhoCampus',
  meta_description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.about_stats (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL, value text NOT NULL, description text NOT NULL DEFAULT '', icon_emoji text NOT NULL DEFAULT '📊', display_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.about_founders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, title text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '', photo text NOT NULL DEFAULT '', linkedin_url text NOT NULL DEFAULT '', twitter_url text NOT NULL DEFAULT '', display_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.about_team (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, role text NOT NULL DEFAULT '', department text NOT NULL DEFAULT '', photo text NOT NULL DEFAULT '', linkedin_url text NOT NULL DEFAULT '', display_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.about_milestones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), year text NOT NULL, title text NOT NULL, description text NOT NULL DEFAULT '', display_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.about_values (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL DEFAULT '', icon_emoji text NOT NULL DEFAULT '⭐', display_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.about_press (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), outlet text NOT NULL, headline text NOT NULL DEFAULT '', url text NOT NULL DEFAULT '', logo text NOT NULL DEFAULT '', published_on text NOT NULL DEFAULT '', display_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE public.about_page ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_press ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read about_page" ON public.about_page FOR SELECT USING (true);
CREATE POLICY "Admins manage about_page" ON public.about_page FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read about_stats" ON public.about_stats FOR SELECT USING (true);
CREATE POLICY "Admins manage about_stats" ON public.about_stats FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read about_founders" ON public.about_founders FOR SELECT USING (true);
CREATE POLICY "Admins manage about_founders" ON public.about_founders FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read about_team" ON public.about_team FOR SELECT USING (true);
CREATE POLICY "Admins manage about_team" ON public.about_team FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read about_milestones" ON public.about_milestones FOR SELECT USING (true);
CREATE POLICY "Admins manage about_milestones" ON public.about_milestones FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read about_values" ON public.about_values FOR SELECT USING (true);
CREATE POLICY "Admins manage about_values" ON public.about_values FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public read about_press" ON public.about_press FOR SELECT USING (true);
CREATE POLICY "Admins manage about_press" ON public.about_press FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.about_page (hero_title) SELECT 'We help students choose better' WHERE NOT EXISTS (SELECT 1 FROM public.about_page);