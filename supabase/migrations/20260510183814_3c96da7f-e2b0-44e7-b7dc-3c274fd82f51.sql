ALTER TABLE public.study_resources
  ADD COLUMN IF NOT EXISTS content_html text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content_images text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.study_resources
  ALTER COLUMN file_url DROP NOT NULL;