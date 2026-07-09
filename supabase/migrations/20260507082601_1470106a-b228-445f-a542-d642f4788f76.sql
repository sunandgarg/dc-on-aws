INSERT INTO public.site_integrations (key, label, category, value, enabled)
VALUES
  ('whatsapp_phone', 'WhatsApp Phone Number (with country code, no +)', 'social', '919990109393', true),
  ('whatsapp_message', 'WhatsApp Default Message', 'social', 'Hi DekhoCampus, I need help with college admissions', true)
ON CONFLICT (key) DO NOTHING;