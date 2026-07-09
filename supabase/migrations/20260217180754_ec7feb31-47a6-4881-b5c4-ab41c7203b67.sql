
-- Table to store AI provider API keys and settings (admin-managed)
CREATE TABLE public.ai_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  api_key_encrypted text NOT NULL DEFAULT '',
  base_url text NOT NULL DEFAULT '',
  default_model text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  icon_emoji text NOT NULL DEFAULT '🤖',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage, public can read active status (not keys)
CREATE POLICY "Admins can manage ai_providers"
ON public.ai_providers FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read ai_providers names"
ON public.ai_providers FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_providers_updated_at
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with popular providers
INSERT INTO public.ai_providers (provider_name, display_name, base_url, default_model, icon_emoji) VALUES
  ('openai', 'ChatGPT / OpenAI', 'https://api.openai.com/v1', 'gpt-4o', '🟢'),
  ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', 'gemini-2.5-flash', '🔵'),
  ('claude', 'Anthropic Claude', 'https://api.anthropic.com/v1', 'claude-sonnet-4-20250514', '🟣'),
  ('perplexity', 'Perplexity AI', 'https://api.perplexity.ai', 'sonar', '🟠'),
  ('grok', 'xAI Grok', 'https://api.x.ai/v1', 'grok-3', '⚫'),
  ('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat', '🔷'),
  ('meta', 'Meta AI (Llama)', 'https://api.together.xyz/v1', 'meta-llama/Llama-3-70b', '🟦'),
  ('copilot', 'Microsoft Copilot', 'https://api.openai.com/v1', 'gpt-4o', '🟡'),
  ('kimi', 'Kimi (Moonshot)', 'https://api.moonshot.cn/v1', 'moonshot-v1-8k', '🌙');
