CREATE TABLE IF NOT EXISTS public.blog_ai_provider_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  claude_api_key_ciphertext text NOT NULL DEFAULT '',
  openai_api_key_ciphertext text NOT NULL DEFAULT '',
  text_model text NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  image_model text NOT NULL DEFAULT 'gpt-image-2',
  image_quality text NOT NULL DEFAULT 'medium' CHECK (image_quality IN ('low','medium','high')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.blog_ai_provider_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_ai_provider_settings FROM anon, authenticated;
GRANT ALL ON public.blog_ai_provider_settings TO service_role;

INSERT INTO public.blog_ai_provider_settings (id)
VALUES ('default') ON CONFLICT (id) DO NOTHING;

