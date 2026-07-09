
CREATE TABLE IF NOT EXISTS public.target_roadmaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  slug text,
  target_college text NOT NULL,
  target_course text,
  class_level text,
  stream text,
  board text,
  current_percent text,
  state text,
  hours_per_day integer,
  weaknesses text,
  roadmap jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS target_roadmaps_share_token_key ON public.target_roadmaps(share_token);
CREATE INDEX IF NOT EXISTS target_roadmaps_user_id_idx ON public.target_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS target_roadmaps_user_primary_idx ON public.target_roadmaps(user_id, is_primary);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_roadmaps TO authenticated;
GRANT SELECT ON public.target_roadmaps TO anon;
GRANT ALL ON public.target_roadmaps TO service_role;

ALTER TABLE public.target_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roadmaps"
  ON public.target_roadmaps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view a roadmap by share token"
  ON public.target_roadmaps FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);

CREATE POLICY "Users can insert their own roadmaps"
  ON public.target_roadmaps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps"
  ON public.target_roadmaps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps"
  ON public.target_roadmaps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_target_roadmaps_updated_at
  BEFORE UPDATE ON public.target_roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
