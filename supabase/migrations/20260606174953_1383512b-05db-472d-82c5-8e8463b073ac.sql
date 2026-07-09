
INSERT INTO public.otp_providers (channel, provider_name, display_name, api_key, api_secret, sender_id, base_url, template_id, is_active, config_json)
VALUES (
  'whatsapp', 'fast2sms', 'Fast2SMS WhatsApp',
  'OTiQAHf3NtL0sYZvryc6j78EoIWGBxUqhFaPMnpklwDdXzVSgbnR69ckLNJPBbC4yjl3Eo8K7sHdMw5i',
  '', 'DekhoCampus', 'https://www.fast2sms.com', '', false,
  jsonb_build_object(
    'version','v24.0',
    'phone_number_id','1116681824868728',
    'waba_id','998323619356465',
    'language_code','en',
    'template_name','',
    'otp_expiry_minutes',10,
    'resend_cooldown_seconds',45
  )
);
