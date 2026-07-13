ALTER TABLE public.blog_auto_agent_settings
  DROP CONSTRAINT IF EXISTS blog_auto_agent_settings_posts_per_run_check;

ALTER TABLE public.blog_auto_agent_settings
  ADD CONSTRAINT blog_auto_agent_settings_posts_per_run_check CHECK (posts_per_run BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS author_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS author_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_author_index integer NOT NULL DEFAULT -1;

ALTER TABLE public.blog_auto_agent_settings
  DROP CONSTRAINT IF EXISTS blog_auto_agent_settings_author_mode_check;
ALTER TABLE public.blog_auto_agent_settings
  ADD CONSTRAINT blog_auto_agent_settings_author_mode_check CHECK (author_mode IN ('none', 'single', 'round_robin'));

UPDATE public.blog_ai_provider_settings
SET text_model = CASE
      WHEN text_model IS NULL OR text_model = '' OR text_model IN ('claude-sonnet-5', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-latest', 'claude-3-5-sonnet')
        THEN 'claude-sonnet-4-20250514'
      ELSE text_model
    END,
    image_model = CASE
      WHEN image_model IS NULL OR image_model = '' OR image_model = 'gpt-image-2'
        THEN 'gpt-image-1'
      ELSE image_model
    END,
    updated_at = now()
WHERE id = 'default';

-- Imported directory records are editorial content, not drafts. Make every
-- college, course and exam discoverable through the public active queries.
UPDATE public.colleges SET is_active = true WHERE is_active IS DISTINCT FROM true;
UPDATE public.courses SET is_active = true WHERE is_active IS DISTINCT FROM true;
UPDATE public.exams SET is_active = true WHERE is_active IS DISTINCT FROM true;
