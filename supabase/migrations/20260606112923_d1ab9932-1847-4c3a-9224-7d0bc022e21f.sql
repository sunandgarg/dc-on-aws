DROP POLICY IF EXISTS "Public can read active otp_providers" ON public.otp_providers;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'otp_providers'
      AND policyname = 'Admins can read otp_providers'
  ) THEN
    CREATE POLICY "Admins can read otp_providers"
      ON public.otp_providers
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.otp_providers TO authenticated;
GRANT ALL ON public.otp_providers TO service_role;