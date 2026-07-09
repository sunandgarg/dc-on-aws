
CREATE TABLE IF NOT EXISTS public.user_education_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  level text NOT NULL CHECK (level IN ('graduation','master','phd','diploma')),
  degree text,
  specialization text,
  institution text,
  board_university text,
  start_year text,
  end_year text,
  marks_type text,
  percentage_cgpa text,
  status text,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_education_entries TO authenticated;
GRANT ALL ON public.user_education_entries TO service_role;

ALTER TABLE public.user_education_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own education entries"
  ON public.user_education_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_education_entries_user_level
  ON public.user_education_entries(user_id, level, sort_order);

CREATE TRIGGER trg_user_education_entries_updated_at
  BEFORE UPDATE ON public.user_education_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
