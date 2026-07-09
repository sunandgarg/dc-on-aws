-- Create public bucket for admin-managed media (images, PDFs, brochures, question papers)
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-uploads', 'admin-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read admin-uploads" ON storage.objects;
CREATE POLICY "Public read admin-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-uploads');

-- Public write (admin route is the gate, same model as other public-managed tables)
DROP POLICY IF EXISTS "Public insert admin-uploads" ON storage.objects;
CREATE POLICY "Public insert admin-uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'admin-uploads');

DROP POLICY IF EXISTS "Public update admin-uploads" ON storage.objects;
CREATE POLICY "Public update admin-uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'admin-uploads');

DROP POLICY IF EXISTS "Public delete admin-uploads" ON storage.objects;
CREATE POLICY "Public delete admin-uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'admin-uploads');