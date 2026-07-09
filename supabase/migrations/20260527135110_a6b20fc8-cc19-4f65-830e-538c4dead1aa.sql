UPDATE public.otp_providers
SET api_key = 'OTiQAHf3NtL0sYZvryc6j78EoIWGBxUqhFaPMnpklwDdXzVSgbnR69ckLNJPBbC4yjl3Eo8K7sHdMw5i',
    is_active = true,
    base_url = 'https://www.fast2sms.com',
    config_json = COALESCE(config_json, '{}'::jsonb) || jsonb_build_object(
      'otp_length', COALESCE(config_json->>'otp_length','6')::int,
      'otp_expiry_minutes', COALESCE(config_json->>'otp_expiry_minutes','15')::int,
      'max_verify_attempts', COALESCE(config_json->>'max_verify_attempts','5')::int,
      'resend_cooldown_seconds', COALESCE(config_json->>'resend_cooldown_seconds','30')::int
    )
WHERE provider_name = 'fast2sms' AND channel = 'sms';

UPDATE public.otp_providers
SET is_active = false
WHERE channel = 'sms' AND provider_name <> 'fast2sms';