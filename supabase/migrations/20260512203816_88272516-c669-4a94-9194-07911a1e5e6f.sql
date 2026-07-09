
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS lead_name text,
  ADD COLUMN IF NOT EXISTS lead_email text,
  ADD COLUMN IF NOT EXISTS lead_phone text,
  ADD COLUMN IF NOT EXISTS viewport text,
  ADD COLUMN IF NOT EXISTS screen text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS total_time_ms bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_scroll_pct integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS opt_in jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS entry_path text,
  ADD COLUMN IF NOT EXISTS exit_path text,
  ADD COLUMN IF NOT EXISTS conversion boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_sessions_lead_phone ON public.user_sessions (lead_phone);
CREATE INDEX IF NOT EXISTS idx_user_sessions_lead_email ON public.user_sessions (lead_email);

ALTER TABLE public.user_events
  ADD COLUMN IF NOT EXISTS x integer,
  ADD COLUMN IF NOT EXISTS y integer,
  ADD COLUMN IF NOT EXISTS vw integer,
  ADD COLUMN IF NOT EXISTS vh integer;

CREATE INDEX IF NOT EXISTS idx_user_events_path ON public.user_events (path);
CREATE INDEX IF NOT EXISTS idx_user_events_event_path ON public.user_events (event_type, path);

CREATE TABLE IF NOT EXISTS public.user_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  prefill boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert consent"
  ON public.user_consent FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins view consent"
  ON public.user_consent FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
