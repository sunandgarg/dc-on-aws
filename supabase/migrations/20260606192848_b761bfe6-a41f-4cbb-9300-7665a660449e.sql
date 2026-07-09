CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  flow text,
  method text,
  message text NOT NULL,
  context jsonb,
  request_id text
);

GRANT SELECT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system logs"
ON public.system_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete system logs"
ON public.system_logs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_function ON public.system_logs(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;