-- Grant the owner phone a real database admin role, including for any
-- existing auth identity created by the phone-login flow.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE regexp_replace(coalesce(raw_user_meta_data->>'phone', ''), '\\D', '', 'g') = '8377080085'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_owner_phone_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF regexp_replace(coalesce(NEW.raw_user_meta_data->>'phone', ''), '\\D', '', 'g') = '8377080085' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_owner_phone_admin_on_signup ON auth.users;
CREATE TRIGGER grant_owner_phone_admin_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_phone_admin();
