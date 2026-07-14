-- AI cost observability and non-destructive daily silent-lead reporting.
CREATE TABLE IF NOT EXISTS public.ai_budget_settings (
  provider text PRIMARY KEY,
  monthly_budget_usd numeric(12,4) NOT NULL DEFAULT 0,
  baseline_spend_usd numeric(12,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.ai_budget_settings(provider, monthly_budget_usd)
VALUES ('gemini', 10), ('openai', 5), ('anthropic', 100)
ON CONFLICT (provider) DO UPDATE SET monthly_budget_usd = EXCLUDED.monthly_budget_usd;

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  feature text NOT NULL,
  operation text,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  total_tokens bigint GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  image_count integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(14,6) NOT NULL DEFAULT 0,
  request_id text,
  user_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ai_usage_events_created_idx ON public.ai_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_events_provider_feature_idx ON public.ai_usage_events(provider, feature, created_at DESC);
ALTER TABLE public.ai_budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage AI budgets" ON public.ai_budget_settings;
CREATE POLICY "Admins manage AI budgets" ON public.ai_budget_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins read AI usage" ON public.ai_usage_events;
CREATE POLICY "Admins read AI usage" ON public.ai_usage_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Preserve every raw lead, but expose the business definition: repeated silent
-- events from the same identity on the same India calendar day count once.
CREATE OR REPLACE VIEW public.leads_daily_business_rollup
WITH (security_invoker = true) AS
SELECT
  min(id::text)::uuid AS representative_id,
  ((created_at AT TIME ZONE 'Asia/Kolkata')::date) AS lead_day,
  coalesce(nullif(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), ''), lower(nullif(email, '')), id::text) AS identity_key,
  bool_or(
    lower(coalesce(source, '')) LIKE '%silent%'
    OR lower(coalesce(source_category, '')) IN ('silent', 'behavioral', 'intent', 'engagement')
  ) AS is_silent,
  count(*) AS event_count,
  min(created_at) AS first_seen_at,
  max(created_at) AS last_seen_at
FROM public.leads
GROUP BY 2, 3;

GRANT SELECT ON public.leads_daily_business_rollup TO authenticated;

COMMENT ON TABLE public.ai_usage_events IS 'Exact provider usage when returned by the API; estimated_cost_usd is an auditable estimate, not a provider invoice.';
COMMENT ON COLUMN public.ai_budget_settings.baseline_spend_usd IS 'Manual provider-console spend from before application telemetry existed.';
