
-- Add delivery mode to promoted programs (Online / Hybrid / Offline)
ALTER TABLE public.promoted_programs
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'Online';

-- Production scale: indexes for high-traffic listing queries
CREATE INDEX IF NOT EXISTS idx_colleges_active_rating ON public.colleges (is_active, rating DESC);
CREATE INDEX IF NOT EXISTS idx_colleges_category ON public.colleges (category);
CREATE INDEX IF NOT EXISTS idx_colleges_state_city ON public.colleges (state, city);
CREATE INDEX IF NOT EXISTS idx_colleges_type ON public.colleges (type);
CREATE INDEX IF NOT EXISTS idx_colleges_slug ON public.colleges (slug);

CREATE INDEX IF NOT EXISTS idx_courses_active_name ON public.courses (is_active, name);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses (category);
CREATE INDEX IF NOT EXISTS idx_courses_mode ON public.courses (mode);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses (slug);

CREATE INDEX IF NOT EXISTS idx_exams_active ON public.exams (is_active);
CREATE INDEX IF NOT EXISTS idx_exams_category ON public.exams (category);
CREATE INDEX IF NOT EXISTS idx_exams_top ON public.exams (is_top_exam) WHERE is_top_exam = true;
CREATE INDEX IF NOT EXISTS idx_exams_slug ON public.exams (slug);

CREATE INDEX IF NOT EXISTS idx_articles_active_created ON public.articles (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles (category);

CREATE INDEX IF NOT EXISTS idx_promoted_active_order ON public.promoted_programs (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_featured_active_order ON public.featured_colleges (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_popular_places_active ON public.popular_places (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_ads_active_priority ON public.ads (is_active, priority DESC);
