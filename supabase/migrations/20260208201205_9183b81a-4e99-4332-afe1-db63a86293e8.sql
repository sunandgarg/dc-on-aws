
-- Create storage bucket for ad images
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-images', 'ad-images', true);

-- Allow public read access
CREATE POLICY "Public can view ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-images');

-- Allow anyone to upload ad images (admin panel is open)
CREATE POLICY "Anyone can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-images');

-- Allow anyone to update ad images
CREATE POLICY "Anyone can update ad images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad-images');

-- Allow anyone to delete ad images
CREATE POLICY "Anyone can delete ad images"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-images');
