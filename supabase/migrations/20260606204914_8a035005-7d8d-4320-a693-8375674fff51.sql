CREATE TABLE IF NOT EXISTS public.otp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_hash text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  provider_name text,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  consumed_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.otp_sessions TO service_role;

ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage OTP sessions" ON public.otp_sessions;
CREATE POLICY "Service role can manage OTP sessions"
ON public.otp_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone_created_at
ON public.otp_sessions (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires_at
ON public.otp_sessions (expires_at);

DROP TRIGGER IF EXISTS update_otp_sessions_updated_at ON public.otp_sessions;
CREATE TRIGGER update_otp_sessions_updated_at
BEFORE UPDATE ON public.otp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();