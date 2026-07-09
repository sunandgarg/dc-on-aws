
-- OTP Provider configuration table for SMS/WhatsApp channels
CREATE TABLE public.otp_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'sms', -- 'sms' or 'whatsapp'
  provider_name text NOT NULL, -- e.g. 'twilio', 'msg91', 'gupshup', 'custom'
  display_name text NOT NULL,
  api_key text NOT NULL DEFAULT '',
  api_secret text NOT NULL DEFAULT '',
  sender_id text NOT NULL DEFAULT '',
  base_url text NOT NULL DEFAULT '',
  template_id text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  icon_emoji text NOT NULL DEFAULT '📱',
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage otp_providers" ON public.otp_providers
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active otp_providers" ON public.otp_providers
  FOR SELECT USING (true);

-- Add KYC fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS education_level text DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS kyc_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_completed_at timestamptz;

-- Seed default OTP providers
INSERT INTO public.otp_providers (channel, provider_name, display_name, icon_emoji, base_url) VALUES
  ('sms', 'twilio', 'Twilio SMS', '📲', 'https://api.twilio.com'),
  ('sms', 'msg91', 'MSG91', '💬', 'https://api.msg91.com'),
  ('whatsapp', 'twilio_whatsapp', 'Twilio WhatsApp', '💚', 'https://api.twilio.com'),
  ('whatsapp', 'gupshup', 'Gupshup WhatsApp', '🟢', 'https://api.gupshup.io'),
  ('sms', 'custom', 'Custom SMS API', '🔧', ''),
  ('whatsapp', 'custom_whatsapp', 'Custom WhatsApp API', '🔧', '');

CREATE TRIGGER update_otp_providers_updated_at
  BEFORE UPDATE ON public.otp_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
