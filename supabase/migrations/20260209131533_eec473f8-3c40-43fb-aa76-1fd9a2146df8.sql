-- Create hero_banners table for configurable banner images
CREATE TABLE public.hero_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL DEFAULT '#',
  cta_text TEXT NOT NULL DEFAULT 'Explore Now',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read hero_banners" ON public.hero_banners FOR SELECT USING (true);

-- Public manage (admin)
CREATE POLICY "Public manage hero_banners" ON public.hero_banners FOR ALL USING (true) WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_hero_banners_updated_at
  BEFORE UPDATE ON public.hero_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
