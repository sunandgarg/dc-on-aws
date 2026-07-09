UPDATE public.otp_providers
SET config_json = COALESCE(config_json, '{}'::jsonb)
  || jsonb_build_object(
    'route', 'otp',
    'fast2sms_route', 'otp',
    'otp_fallback_to_dlt', false
  ),
  updated_at = now()
WHERE lower(provider_name) = 'fast2sms' AND channel = 'sms';