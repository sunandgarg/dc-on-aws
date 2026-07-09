
CREATE TABLE public.cta_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,
  cta TEXT NOT NULL,
  entity_slug TEXT,
  entity_name TEXT,
  user_id UUID,
  session_id TEXT,
  referrer TEXT,
  path TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cta_events_created_at ON public.cta_events (created_at DESC);
CREATE INDEX idx_cta_events_page_cta ON public.cta_events (page, cta);
CREATE INDEX idx_cta_events_entity ON public.cta_events (page, entity_slug);

ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cta events"
  ON public.cta_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view cta events"
  ON public.cta_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
