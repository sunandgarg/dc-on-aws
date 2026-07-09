
CREATE TABLE IF NOT EXISTS public.hero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_urls text[] NOT NULL DEFAULT '{}',
  overlay_mode text NOT NULL DEFAULT 'dark',
  tint_color text NOT NULL DEFAULT '#000000',
  overlay_opacity numeric NOT NULL DEFAULT 0.45,
  blur_px integer NOT NULL DEFAULT 3,
  grayscale numeric NOT NULL DEFAULT 0,
  brightness numeric NOT NULL DEFAULT 1.0,
  saturation numeric NOT NULL DEFAULT 1.05,
  rotation_seconds integer NOT NULL DEFAULT 11,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hero_settings" ON public.hero_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage hero_settings" ON public.hero_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_hero_settings_updated_at
  BEFORE UPDATE ON public.hero_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hero_settings (image_urls, overlay_mode, overlay_opacity, blur_px)
SELECT ARRAY[]::text[], 'dark', 0.45, 3
WHERE NOT EXISTS (SELECT 1 FROM public.hero_settings);
