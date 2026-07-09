
-- 1. adsense_settings (singleton-ish)
CREATE TABLE IF NOT EXISTS public.adsense_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id text DEFAULT '',
  client_id text DEFAULT '',
  account_id text DEFAULT '',
  verification_meta text DEFAULT '',
  auto_ads_enabled boolean NOT NULL DEFAULT false,
  ads_globally_enabled boolean NOT NULL DEFAULT true,
  enabled_on_mobile boolean NOT NULL DEFAULT true,
  enabled_on_desktop boolean NOT NULL DEFAULT true,
  enabled_for_guests boolean NOT NULL DEFAULT true,
  enabled_for_logged_in boolean NOT NULL DEFAULT true,
  disabled_roles text[] NOT NULL DEFAULT '{}',
  disabled_pages text[] NOT NULL DEFAULT '{}',
  ads_per_page_limit int NOT NULL DEFAULT 0,
  lazy_load_enabled boolean NOT NULL DEFAULT true,
  refresh_interval_seconds int NOT NULL DEFAULT 0,
  head_scripts text DEFAULT '',
  body_scripts text DEFAULT '',
  footer_scripts text DEFAULT '',
  custom_css text DEFAULT '',
  custom_js text DEFAULT '',
  api_keys jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adsense_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read adsense settings"
  ON public.adsense_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage adsense settings"
  ON public.adsense_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_adsense_settings_updated
  BEFORE UPDATE ON public.adsense_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.adsense_settings (publisher_id) VALUES ('') ON CONFLICT DO NOTHING;

-- 2. ad_units
CREATE TABLE IF NOT EXISTS public.ad_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ad_type text NOT NULL DEFAULT 'display',
  placement text NOT NULL DEFAULT 'homepage',
  position text NOT NULL DEFAULT 'middle',
  ad_slot_id text DEFAULT '',
  ad_format text DEFAULT 'auto',
  full_width_responsive boolean NOT NULL DEFAULT true,
  custom_html text DEFAULT '',
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  target_devices text[] NOT NULL DEFAULT '{mobile,desktop,tablet}',
  target_roles text[] NOT NULL DEFAULT '{}',
  target_countries text[] NOT NULL DEFAULT '{}',
  target_categories text[] NOT NULL DEFAULT '{}',
  url_pattern text DEFAULT '',
  min_width int,
  min_height int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active ad units"
  ON public.ad_units FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage ad units"
  ON public.ad_units FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_ad_units_updated
  BEFORE UPDATE ON public.ad_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_ad_units_placement ON public.ad_units(placement, position) WHERE is_active = true;

-- 3. ad_scripts
CREATE TABLE IF NOT EXISTS public.ad_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT 'head', -- head|body|footer
  code text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active ad scripts"
  ON public.ad_scripts FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage ad scripts"
  ON public.ad_scripts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_ad_scripts_updated
  BEFORE UPDATE ON public.ad_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ad_analytics_events
CREATE TABLE IF NOT EXISTS public.ad_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_unit_id uuid REFERENCES public.ad_units(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- impression|click
  device text DEFAULT '',
  page_url text DEFAULT '',
  country text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record ad analytics"
  ON public.ad_analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read ad analytics"
  ON public.ad_analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete ad analytics"
  ON public.ad_analytics_events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_ad_events_unit_time ON public.ad_analytics_events(ad_unit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_type_time ON public.ad_analytics_events(event_type, created_at DESC);
