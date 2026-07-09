-- 1. AI provider keys: admin-only SELECT
DROP POLICY IF EXISTS "Public can read ai_providers names" ON public.ai_providers;

-- 2. OTP providers: drop any public-read policies (admin manage policy already exists)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='public' AND tablename='otp_providers'
       AND policyname ILIKE '%public%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.otp_providers', p.policyname);
  END LOOP;
END $$;

-- 3. Profiles: owner + admin only
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Placement records: drop any public-manage policies
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='public' AND tablename='placement_records'
       AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
       AND policyname ILIKE '%public%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.placement_records', p.policyname);
  END LOOP;
END $$;

-- 5. Featured colleges: drop public-manage and duplicate read policies
DROP POLICY IF EXISTS "Public manage featured colleges" ON public.featured_colleges;
DROP POLICY IF EXISTS "Public read featured_colleges" ON public.featured_colleges;

-- 6. Storage: admin-uploads — admin-only writes, public read kept
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects'
       AND (policyname ILIKE '%admin-uploads%' OR policyname ILIKE '%admin uploads%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Public read admin-uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'admin-uploads');
CREATE POLICY "Admins write admin-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'admin-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update admin-uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'admin-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete admin-uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'admin-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 7. Storage: ad-images — admin-only writes, public read kept
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects'
       AND (policyname ILIKE '%ad image%' OR policyname ILIKE '%ad-images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Public read ad-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-images');
CREATE POLICY "Admins write ad-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update ad-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ad-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete ad-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ad-images' AND public.has_role(auth.uid(), 'admin'::app_role));
