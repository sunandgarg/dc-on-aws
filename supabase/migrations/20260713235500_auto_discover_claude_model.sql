UPDATE public.blog_ai_provider_settings
SET text_model = 'auto-sonnet', updated_at = now()
WHERE id = 'default';
