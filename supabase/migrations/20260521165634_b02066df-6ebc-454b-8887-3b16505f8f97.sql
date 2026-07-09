INSERT INTO public.site_integrations (key, label, category, value, enabled)
VALUES ('premium_program_fallback_phone', 'Premium Program Fallback Phone', 'contact', '', true)
ON CONFLICT (key) DO NOTHING;