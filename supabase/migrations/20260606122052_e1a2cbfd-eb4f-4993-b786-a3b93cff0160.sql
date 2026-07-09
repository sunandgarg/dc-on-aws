
-- =========================================================
-- 1) authors.email no longer readable by anonymous visitors
-- =========================================================
REVOKE SELECT ON public.authors FROM anon;
GRANT SELECT (
  id, slug, name, designation, photo, short_bio, bio, expertise,
  linkedin_url, twitter_url, website_url,
  display_order, is_active, user_id, created_at, updated_at
) ON public.authors TO anon;
GRANT SELECT ON public.authors TO authenticated;
GRANT SELECT ON public.authors TO service_role;

-- ===========================================================
-- 2) user_sessions: stop arbitrary overwrite of other sessions
-- ===========================================================
DROP POLICY IF EXISTS "Anyone can update own session" ON public.user_sessions;

CREATE POLICY "anon update unowned session"
  ON public.user_sessions
  FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "auth update own session"
  ON public.user_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

REVOKE UPDATE ON public.user_sessions FROM anon, authenticated;

GRANT UPDATE (
  last_seen_at, last_path, exit_path, entry_path, device, referrer, utm,
  viewport, screen, language, timezone, total_time_ms, max_scroll_pct,
  opt_in, pages_visited, total_events
) ON public.user_sessions TO anon;

GRANT UPDATE (
  last_seen_at, last_path, exit_path, entry_path, device, referrer, utm,
  viewport, screen, language, timezone, total_time_ms, max_scroll_pct,
  opt_in, pages_visited, total_events,
  lead_id, lead_name, lead_email, lead_phone, user_id, conversion
) ON public.user_sessions TO authenticated;

GRANT ALL ON public.user_sessions TO service_role;

-- ============================================================
-- 3) intent_visitors: stop client from claiming other visitors
-- ============================================================
DROP POLICY IF EXISTS "anyone can update own visitor" ON public.intent_visitors;

CREATE POLICY "anon update unowned visitor"
  ON public.intent_visitors
  FOR UPDATE
  TO anon
  USING (merged_user_id IS NULL)
  WITH CHECK (merged_user_id IS NULL);

CREATE POLICY "auth update own or unowned visitor"
  ON public.intent_visitors
  FOR UPDATE
  TO authenticated
  USING (merged_user_id IS NULL OR auth.uid() = merged_user_id)
  WITH CHECK (merged_user_id IS NULL OR auth.uid() = merged_user_id);

REVOKE UPDATE ON public.intent_visitors FROM anon, authenticated;
GRANT UPDATE (
  last_seen_at, device_type, city, state, country, user_agent,
  utm, referrer, landing_url
) ON public.intent_visitors TO anon, authenticated;
GRANT ALL ON public.intent_visitors TO service_role;

-- =========================================================
-- 4) marketing_automations: admin-only reads
-- =========================================================
DROP POLICY IF EXISTS "authenticated view active automations" ON public.marketing_automations;

-- =========================================================
-- 5) adsense_settings: hide api_keys from anon
-- =========================================================
REVOKE SELECT ON public.adsense_settings FROM anon;
GRANT SELECT (
  id, publisher_id, client_id, account_id, verification_meta,
  auto_ads_enabled, ads_globally_enabled,
  enabled_on_mobile, enabled_on_desktop,
  enabled_for_guests, enabled_for_logged_in,
  disabled_roles, disabled_pages,
  ads_per_page_limit, lazy_load_enabled, refresh_interval_seconds,
  head_scripts, body_scripts, footer_scripts,
  custom_css, custom_js,
  created_at, updated_at
) ON public.adsense_settings TO anon, authenticated;
GRANT ALL ON public.adsense_settings TO service_role;
