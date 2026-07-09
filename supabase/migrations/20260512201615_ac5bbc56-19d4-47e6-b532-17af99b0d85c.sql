
ALTER TABLE public.college_contacts ADD COLUMN IF NOT EXISTS map_link text;

CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  event_type text NOT NULL,
  path text,
  element text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON public.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON public.user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON public.user_events(event_type);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert user events"
  ON public.user_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view user events"
  ON public.user_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  pages_visited integer NOT NULL DEFAULT 0,
  total_events integer NOT NULL DEFAULT 0,
  device text,
  last_path text,
  referrer text,
  utm jsonb DEFAULT '{}'::jsonb,
  ai_summary text,
  ai_summary_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can upsert user sessions insert"
  ON public.user_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update own session"
  ON public.user_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view user sessions"
  ON public.user_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
