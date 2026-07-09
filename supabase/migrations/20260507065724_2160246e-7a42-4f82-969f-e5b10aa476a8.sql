
-- 1. College reviews moderation
ALTER TABLE public.college_reviews
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_report_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS moderation_note text DEFAULT '';

-- 2. Review reports table
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  reporter_user_id uuid,
  reporter_name text DEFAULT '',
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit report"
  ON public.review_reports FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins manage review_reports"
  ON public.review_reports FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Sub users
CREATE TABLE IF NOT EXISTS public.sub_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'family', -- 'family' | 'team'
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  role text DEFAULT 'viewer',          -- viewer | manager
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sub_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent manages own sub_users"
  ON public.sub_users FOR ALL TO public
  USING (auth.uid() = parent_user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = parent_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_sub_users_updated_at
  BEFORE UPDATE ON public.sub_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Approval logo names
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS approval_logo_names text[] NOT NULL DEFAULT '{}'::text[];
