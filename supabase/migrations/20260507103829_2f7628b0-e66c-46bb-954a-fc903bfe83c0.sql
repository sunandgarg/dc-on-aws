
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS resource text;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS can_view boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS can_create boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS can_delete boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'own';
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.user_permissions SET resource = module WHERE resource IS NULL;
ALTER TABLE public.user_permissions ALTER COLUMN resource SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_permissions_user_resource ON public.user_permissions(user_id, resource);

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN has_role(_user_id, 'admin'::app_role) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.resource = _resource
        AND CASE _action
          WHEN 'view' THEN up.can_view
          WHEN 'create' THEN up.can_create
          WHEN 'edit' THEN up.can_edit
          WHEN 'delete' THEN up.can_delete
          ELSE false
        END
    )
  END
$$;
