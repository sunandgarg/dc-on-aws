
-- 1. Extend role enum (separate statement so it is committed before being referenced)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lead_push';

-- 2. Add mask_leads to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mask_leads boolean NOT NULL DEFAULT false;

-- 3. Team invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  display_name text,
  role text NOT NULL DEFAULT 'editor',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  mask_leads boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  accepted_user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS team_invites_email_pending_uk
  ON public.team_invites (lower(email)) WHERE status = 'pending' AND email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS team_invites_phone_pending_uk
  ON public.team_invites (phone) WHERE status = 'pending' AND phone IS NOT NULL;

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage team_invites" ON public.team_invites;
CREATE POLICY "Admins manage team_invites"
  ON public.team_invites
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER team_invites_set_updated
  BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
