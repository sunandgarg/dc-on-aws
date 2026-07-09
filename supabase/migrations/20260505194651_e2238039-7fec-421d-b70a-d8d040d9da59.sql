CREATE TABLE IF NOT EXISTS public.site_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'analytics',
  value text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_integrations" ON public.site_integrations FOR SELECT USING (true);
CREATE POLICY "Admins manage site_integrations" ON public.site_integrations FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_site_integrations_updated BEFORE UPDATE ON public.site_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_integrations (key,label,category,value,enabled) VALUES
 ('ga4_measurement_id','Google Analytics 4 (Measurement ID)','google','',false),
 ('gtm_container_id','Google Tag Manager (GTM-XXXX)','google','',false),
 ('gsc_verification','Google Search Console (meta verification)','google','',false),
 ('google_ads_id','Google Ads Conversion ID','google','',false),
 ('google_adsense_id','Google AdSense (ca-pub-…)','google','',false),
 ('ms_clarity_id','Microsoft Clarity Project ID','microsoft','',false),
 ('bing_verification','Bing Webmaster Verification','microsoft','',false),
 ('bing_uet_tag','Microsoft Ads UET Tag ID','microsoft','',false),
 ('linkedin_partner_id','LinkedIn Insight Partner ID','microsoft','',false),
 ('facebook_pixel_id','Meta Pixel (Facebook)','social','',false),
 ('hotjar_id','Hotjar Site ID','analytics','',false),
 ('plausible_domain','Plausible Domain','analytics','',false)
ON CONFLICT (key) DO NOTHING;

-- RBAC roles for content team
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contributor';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;