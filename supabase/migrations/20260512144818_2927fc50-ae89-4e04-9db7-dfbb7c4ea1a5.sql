
ALTER TABLE public.user_permissions
  ALTER COLUMN module DROP NOT NULL,
  ALTER COLUMN action DROP NOT NULL,
  ALTER COLUMN allow DROP NOT NULL;

ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS can_publish boolean NOT NULL DEFAULT false;

-- Update has_permission to support the 'publish' action
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN has_role(_user_id, 'admin'::app_role) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.resource = _resource
        AND CASE _action
          WHEN 'view'    THEN up.can_view
          WHEN 'create'  THEN up.can_create
          WHEN 'edit'    THEN up.can_edit
          WHEN 'delete'  THEN up.can_delete
          WHEN 'publish' THEN up.can_publish
          ELSE false
        END
    )
  END
$function$;
