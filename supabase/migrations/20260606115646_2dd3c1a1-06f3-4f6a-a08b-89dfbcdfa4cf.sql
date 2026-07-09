CREATE POLICY "Users upload own avatar in admin-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-uploads'
  AND (storage.foldername(name))[1] = 'user-avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users update own avatar in admin-uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'admin-uploads'
  AND (storage.foldername(name))[1] = 'user-avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users delete own avatar in admin-uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-uploads'
  AND (storage.foldername(name))[1] = 'user-avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);