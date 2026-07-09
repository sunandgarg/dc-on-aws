
-- Email providers (SES, etc) managed in admin
CREATE TABLE public.email_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  display_name text NOT NULL,
  api_key text DEFAULT '',
  api_secret text DEFAULT '',
  region text DEFAULT '',
  from_email text DEFAULT '',
  from_name text DEFAULT '',
  reply_to text DEFAULT '',
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  icon_emoji text DEFAULT '📧',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_providers TO authenticated;
GRANT ALL ON public.email_providers TO service_role;

ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email providers"
ON public.email_providers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_email_providers_updated_at
BEFORE UPDATE ON public.email_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outbound email log
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  message_id text,
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read email log"
ON public.email_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
