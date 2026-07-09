-- Replace handle_new_user to also grant admin when phone is in super-admin list
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_super_admins text[] := ARRAY['8700602524','9990109393','8010321712'];
BEGIN
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '');
  -- Strip non-digits and any leading 91 country code
  v_phone := regexp_replace(v_phone, '[^0-9]', '', 'g');
  IF length(v_phone) > 10 THEN
    v_phone := right(v_phone, 10);
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email,''), '@', 1), v_phone),
    v_phone
  )
  ON CONFLICT DO NOTHING;

  -- Auto-grant admin for super admin email
  IF LOWER(COALESCE(NEW.email,'')) = 'sunandgarg@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-grant admin for super admin phones
  IF v_phone = ANY(v_super_admins) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Retroactively grant admin role to existing profiles whose phone matches
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE regexp_replace(COALESCE(p.phone,''), '[^0-9]', '', 'g') IN ('8700602524','9990109393','8010321712')
   OR right(regexp_replace(COALESCE(p.phone,''), '[^0-9]', '', 'g'), 10) IN ('8700602524','9990109393','8010321712')
ON CONFLICT DO NOTHING;