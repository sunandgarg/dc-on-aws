
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_super_admins text[] := ARRAY['8700602524','9990109393','8010321712'];
  v_email_lc text;
  v_invite public.team_invites%ROWTYPE;
  v_perm jsonb;
BEGIN
  v_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '');
  v_phone := regexp_replace(v_phone, '[^0-9]', '', 'g');
  IF length(v_phone) > 10 THEN
    v_phone := right(v_phone, 10);
  END IF;
  v_email_lc := lower(COALESCE(NEW.email, ''));

  INSERT INTO public.profiles (user_id, email, display_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email,''), '@', 1), v_phone),
    v_phone
  )
  ON CONFLICT DO NOTHING;

  IF v_email_lc = 'sunandgarg@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  END IF;

  IF v_phone = ANY(v_super_admins) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  END IF;

  -- Team Dekhocampus invite acceptance
  SELECT * INTO v_invite FROM public.team_invites
    WHERE status = 'pending'
      AND ((email IS NOT NULL AND lower(email) = v_email_lc AND v_email_lc <> '')
        OR (phone IS NOT NULL AND phone = v_phone AND v_phone <> ''))
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    -- Role
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_invite.role::app_role)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN NULL; END;

    -- Custom permissions array of {resource,can_view,can_create,can_edit,can_publish,can_delete}
    FOR v_perm IN SELECT * FROM jsonb_array_elements(COALESCE(v_invite.permissions, '[]'::jsonb))
    LOOP
      BEGIN
        INSERT INTO public.user_permissions (user_id, resource, scope, can_view, can_create, can_edit, can_publish, can_delete)
        VALUES (
          NEW.id,
          COALESCE(v_perm->>'resource',''),
          'own',
          COALESCE((v_perm->>'can_view')::boolean, false),
          COALESCE((v_perm->>'can_create')::boolean, false),
          COALESCE((v_perm->>'can_edit')::boolean, false),
          COALESCE((v_perm->>'can_publish')::boolean, false),
          COALESCE((v_perm->>'can_delete')::boolean, false)
        );
      EXCEPTION WHEN others THEN NULL; END;
    END LOOP;

    -- Mask leads flag
    UPDATE public.profiles SET mask_leads = v_invite.mask_leads WHERE user_id = NEW.id;

    -- Mark invite accepted
    UPDATE public.team_invites
      SET status = 'accepted', accepted_user_id = NEW.id, updated_at = now()
      WHERE id = v_invite.id;
  END IF;

  RETURN NEW;
END;
$function$;
