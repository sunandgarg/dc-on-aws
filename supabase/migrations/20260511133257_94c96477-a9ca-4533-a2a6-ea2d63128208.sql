ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS lp_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS multiple_layout text NOT NULL DEFAULT 'compact',
  ADD COLUMN IF NOT EXISTS multiple_colleges jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exam_ad jsonb NOT NULL DEFAULT '{"free_downloads":[],"locked_premium":[],"lead_only":[],"locked_gate":"form","lead_only_gate":"form"}'::jsonb,
  ADD COLUMN IF NOT EXISTS advertiser_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS advertiser_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS advertiser_contact text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS disclosure_text text NOT NULL DEFAULT 'This page is an advertisement. Information shown is for educational lead generation; it is not an offer of admission, scholarship, employment, or guaranteed outcome.';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_lp_type_chk') THEN
    ALTER TABLE public.landing_pages
      ADD CONSTRAINT landing_pages_lp_type_chk CHECK (lp_type IN ('general','multiple_colleges','exam_ad'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'landing_pages_multiple_layout_chk') THEN
    ALTER TABLE public.landing_pages
      ADD CONSTRAINT landing_pages_multiple_layout_chk CHECK (multiple_layout IN ('compact','accordion','bento'));
  END IF;
END $$;