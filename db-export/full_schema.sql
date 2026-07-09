-- =====================================================================
-- DEKHO CAMPUS — Consolidated Database Schema
-- Generated for fresh Supabase project import
-- Run this file in the Supabase SQL editor on an EMPTY project.
-- =====================================================================

-- 1. Required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"      WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"     WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net"        WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

-- 2. Public schema (drop if re-running)
-- DROP SCHEMA IF EXISTS public CASCADE;  -- uncomment to force reset

-- 3. Public schema (tables, types, functions, triggers, RLS, grants)
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user',
    'manager',
    'editor',
    'contributor',
    'author',
    'lead_push'
);


--
-- Name: clear_featured_rank(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_featured_rank(_table text, _id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_sql text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _table NOT IN ('articles','colleges') THEN
    RAISE EXCEPTION 'invalid table';
  END IF;
  v_sql := format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table);
  EXECUTE v_sql USING _id;
END;
$_$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: has_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_batch_duplicate(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_batch_duplicate(batch_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN UPDATE public.upload_batches SET duplicate_count = duplicate_count + 1 WHERE id = batch_uuid; END
$$;


--
-- Name: increment_batch_fail(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_batch_fail(batch_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN UPDATE public.upload_batches SET fail_count = fail_count + 1 WHERE id = batch_uuid; END $$;


--
-- Name: increment_batch_success(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_batch_success(batch_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN UPDATE public.upload_batches SET success_count = success_count + 1 WHERE id = batch_uuid; END $$;


--
-- Name: increment_push_landing_submission(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_push_landing_submission(lp_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.push_landing_pages
  SET submissions_count = submissions_count + 1, last_submission_at = now()
  WHERE id = lp_id;
END $$;


--
-- Name: intent_category_for(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.intent_category_for(_score integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN _score IS NULL OR _score <= 30 THEN 'cold'
    WHEN _score <= 70                   THEN 'warm'
    WHEN _score <= 120                  THEN 'hot'
    ELSE 'admission_ready'
  END
$$;


--
-- Name: intent_merge_visitor(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.intent_merge_visitor(_visitor_id uuid, _user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_score   integer := 0;
  v_count   integer := 0;
  v_first   timestamptz;
  v_last    timestamptz;
  v_last_t  text;
  v_top_c   text;
  v_top_cr  text;
BEGIN
  IF _visitor_id IS NULL OR _user_id IS NULL THEN RETURN; END IF;

  -- Reassign events
  UPDATE public.intent_events SET user_id = _user_id
    WHERE visitor_id = _visitor_id AND user_id IS NULL;

  -- Mark visitor merged
  UPDATE public.intent_visitors SET merged_user_id = _user_id, updated_at = now()
    WHERE visitor_id = _visitor_id;

  -- Recompute the user's score from all their events
  SELECT
    COALESCE(SUM(COALESCE(w.weight,0)),0),
    COUNT(*), MIN(e.occurred_at), MAX(e.occurred_at),
    (SELECT event_type FROM public.intent_events WHERE user_id=_user_id ORDER BY occurred_at DESC LIMIT 1)
    INTO v_score, v_count, v_first, v_last, v_last_t
  FROM public.intent_events e
  LEFT JOIN public.intent_event_weights w ON w.event_type = e.event_type AND w.is_active
  WHERE e.user_id = _user_id;

  SELECT college_slug INTO v_top_c FROM (
    SELECT college_slug, COUNT(*) c FROM public.intent_events
    WHERE user_id=_user_id AND college_slug IS NOT NULL
    GROUP BY college_slug ORDER BY c DESC LIMIT 1
  ) t;
  SELECT course_slug INTO v_top_cr FROM (
    SELECT course_slug, COUNT(*) c FROM public.intent_events
    WHERE user_id=_user_id AND course_slug IS NOT NULL
    GROUP BY course_slug ORDER BY c DESC LIMIT 1
  ) t;

  -- Upsert user score, merging any existing visitor score
  INSERT INTO public.intent_lead_scores(subject_type, subject_id, score, category, top_college_slug, top_course_slug, event_count, last_event_type, last_event_at, first_event_at)
  VALUES ('user', _user_id, v_score, public.intent_category_for(v_score), v_top_c, v_top_cr, v_count, v_last_t, v_last, v_first)
  ON CONFLICT (subject_type, subject_id) DO UPDATE SET
    score            = EXCLUDED.score,
    category         = EXCLUDED.category,
    top_college_slug = EXCLUDED.top_college_slug,
    top_course_slug  = EXCLUDED.top_course_slug,
    event_count      = EXCLUDED.event_count,
    last_event_type  = EXCLUDED.last_event_type,
    last_event_at    = EXCLUDED.last_event_at,
    updated_at       = now();

  -- Drop the visitor score row (rolled into user)
  DELETE FROM public.intent_lead_scores WHERE subject_type='visitor' AND subject_id=_visitor_id;
END;
$$;


--
-- Name: intent_on_event_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.intent_on_event_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  w               integer := 0;
  v_subject_type  text;
  v_subject_id    uuid;
  v_prev_score    integer := 0;
  v_prev_category text := 'cold';
  v_new_score     integer := 0;
  v_new_category  text := 'cold';
  v_top_college   text;
  v_top_course    text;
  v_fee_count     integer := 0;
  v_should_alert  boolean := false;
  v_alert_type    text;
  v_alert_id      uuid;
  v_fn_url        text := 'https://hpjbwtnvtktezwhafuuf.supabase.co/functions/v1/dispatch-intent-alert';
BEGIN
  -- Lookup weight
  SELECT COALESCE(weight,0) INTO w
    FROM public.intent_event_weights
    WHERE event_type = NEW.event_type AND is_active = true;
  IF w IS NULL THEN w := 0; END IF;
  NEW.score_delta := w;

  -- Determine subject (user wins over visitor)
  IF NEW.user_id IS NOT NULL THEN
    v_subject_type := 'user';
    v_subject_id   := NEW.user_id;
  ELSIF NEW.visitor_id IS NOT NULL THEN
    v_subject_type := 'visitor';
    v_subject_id   := NEW.visitor_id;
  ELSE
    RETURN NEW; -- nothing to score
  END IF;

  -- Read prev
  SELECT score, category INTO v_prev_score, v_prev_category
    FROM public.intent_lead_scores
    WHERE subject_type = v_subject_type AND subject_id = v_subject_id;
  IF v_prev_score IS NULL THEN v_prev_score := 0; v_prev_category := 'cold'; END IF;

  v_new_score    := v_prev_score + w;
  v_new_category := public.intent_category_for(v_new_score);

  -- Recompute top college/course from last 30 days
  SELECT college_slug INTO v_top_college FROM (
    SELECT college_slug, COUNT(*) AS c
      FROM public.intent_events
      WHERE ((v_subject_type='user' AND user_id = v_subject_id) OR (v_subject_type='visitor' AND visitor_id = v_subject_id))
        AND college_slug IS NOT NULL AND occurred_at > now() - interval '30 days'
      GROUP BY college_slug ORDER BY c DESC LIMIT 1
  ) t;
  SELECT course_slug INTO v_top_course FROM (
    SELECT course_slug, COUNT(*) AS c
      FROM public.intent_events
      WHERE ((v_subject_type='user' AND user_id = v_subject_id) OR (v_subject_type='visitor' AND visitor_id = v_subject_id))
        AND course_slug IS NOT NULL AND occurred_at > now() - interval '30 days'
      GROUP BY course_slug ORDER BY c DESC LIMIT 1
  ) t;

  INSERT INTO public.intent_lead_scores AS s
    (subject_type, subject_id, score, category, top_college_slug, top_course_slug, event_count, last_event_type, last_event_at, first_event_at)
  VALUES
    (v_subject_type, v_subject_id, v_new_score, v_new_category, v_top_college, v_top_course, 1, NEW.event_type, NEW.occurred_at, NEW.occurred_at)
  ON CONFLICT (subject_type, subject_id) DO UPDATE SET
    score            = EXCLUDED.score,
    category         = EXCLUDED.category,
    top_college_slug = EXCLUDED.top_college_slug,
    top_course_slug  = EXCLUDED.top_course_slug,
    event_count      = s.event_count + 1,
    last_event_type  = EXCLUDED.last_event_type,
    last_event_at    = EXCLUDED.last_event_at,
    updated_at       = now();

  -- Alert logic
  IF v_prev_category <> v_new_category AND v_new_category IN ('hot','admission_ready') THEN
    v_should_alert := true;
    v_alert_type   := 'threshold_crossed';
  ELSIF NEW.event_type IN ('download_brochure','apply_now','call_institute','whatsapp_institute','compare_colleges','counselling_request') THEN
    v_should_alert := true;
    v_alert_type   := NEW.event_type;
  ELSIF NEW.event_type = 'fee_viewed' THEN
    SELECT COUNT(*) INTO v_fee_count FROM public.intent_events
      WHERE event_type = 'fee_viewed'
        AND ((v_subject_type='user' AND user_id = v_subject_id) OR (v_subject_type='visitor' AND visitor_id = v_subject_id))
        AND occurred_at > now() - interval '24 hours';
    IF v_fee_count >= 2 THEN
      v_should_alert := true;
      v_alert_type   := 'fee_repeat';
    END IF;
  END IF;

  IF v_should_alert THEN
    INSERT INTO public.intent_alerts(subject_type, subject_id, alert_type, score, college_slug, course_slug, payload)
    VALUES (v_subject_type, v_subject_id, v_alert_type, v_new_score, COALESCE(NEW.college_slug, v_top_college), COALESCE(NEW.course_slug, v_top_course),
      jsonb_build_object(
        'event_id', NEW.id,
        'event_type', NEW.event_type,
        'page_url', NEW.page_url,
        'city', NEW.city,
        'state', NEW.state,
        'utm', jsonb_build_object('source',NEW.utm_source,'medium',NEW.utm_medium,'campaign',NEW.utm_campaign)
      ))
    RETURNING id INTO v_alert_id;

    BEGIN
      PERFORM net.http_post(
        url := v_fn_url,
        headers := jsonb_build_object('Content-Type','application/json'),
        body := jsonb_build_object('alert_id', v_alert_id)
      );
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: list_public_tables(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_public_tables() RETURNS TABLE(table_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;


--
-- Name: lp_dispatch_on_lead_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lp_dispatch_on_lead_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  fn_url text;
begin
  fn_url := 'https://hpjbwtnvtktezwhafuuf.supabase.co/functions/v1/lp-dispatch-lead';
  begin
    perform net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('lead_id', NEW.id)
    );
  exception when others then
    null;
  end;
  return NEW;
end;
$$;


--
-- Name: lp_increment_batch_duplicate(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lp_increment_batch_duplicate(batch_uuid uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.lp_batches set duplicate = duplicate + 1, updated_at = now() where id = batch_uuid;
$$;


--
-- Name: lp_increment_batch_fail(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lp_increment_batch_fail(batch_uuid uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.lp_batches set fail = fail + 1, updated_at = now() where id = batch_uuid;
$$;


--
-- Name: lp_increment_batch_success(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lp_increment_batch_success(batch_uuid uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.lp_batches set success = success + 1, updated_at = now() where id = batch_uuid;
$$;


--
-- Name: prevent_short_id_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_short_id_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.short_id IS DISTINCT FROM OLD.short_id THEN
    RAISE EXCEPTION 'short_id is immutable and cannot be modified (table: %, id: %)', TG_TABLE_NAME, OLD.short_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_created_by_articles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_created_by_articles() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;


--
-- Name: set_featured_rank(text, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_featured_rank(_table text, _id uuid, _rank integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  _max int;
BEGIN
  IF _table NOT IN ('articles','colleges') THEN
    RAISE EXCEPTION 'Invalid table';
  END IF;
  _max := CASE WHEN _table = 'articles' THEN 5 ELSE 5 END;
  IF _rank IS NULL THEN
    EXECUTE format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table) USING _id;
    RETURN;
  END IF;
  IF _rank < 1 OR _rank > _max THEN
    RAISE EXCEPTION 'Rank out of range';
  END IF;
  EXECUTE format('UPDATE public.%I SET featured_rank = NULL WHERE id = $1', _table) USING _id;
  EXECUTE format('UPDATE public.%I SET featured_rank = featured_rank + 1 WHERE featured_rank >= $1 AND featured_rank < $2', _table) USING _rank, _max;
  EXECUTE format('UPDATE public.%I SET featured_rank = NULL WHERE featured_rank >= $1', _table) USING _max + 1;
  EXECUTE format('UPDATE public.%I SET featured_rank = $1 WHERE id = $2', _table) USING _rank, _id;
END;
$_$;


--
-- Name: touch_college_priority_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_college_priority_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.priority_updated_at := now();
  ELSIF NEW.priority IS DISTINCT FROM OLD.priority THEN
    NEW.priority_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_article_link(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_article_link() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.entity_type IS NULL OR NEW.entity_slug IS NULL OR NEW.entity_slug = '' THEN
    RAISE EXCEPTION 'article_links: entity_type and entity_slug are required';
  END IF;
  CASE NEW.entity_type
    WHEN 'college'            THEN SELECT EXISTS(SELECT 1 FROM public.colleges             WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'course'             THEN SELECT EXISTS(SELECT 1 FROM public.courses              WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'exam'               THEN SELECT EXISTS(SELECT 1 FROM public.exams                WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'career'             THEN SELECT EXISTS(SELECT 1 FROM public.career_profiles      WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'scholarship'        THEN SELECT EXISTS(SELECT 1 FROM public.scholarships         WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'article'            THEN SELECT EXISTS(SELECT 1 FROM public.articles             WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'study_subject'      THEN BEGIN
      SELECT EXISTS(SELECT 1 FROM public.study_subjects WHERE id = NEW.entity_slug::uuid) INTO ok;
    EXCEPTION WHEN others THEN ok := false; END;
    WHEN 'study_chapter'      THEN BEGIN
      SELECT EXISTS(SELECT 1 FROM public.study_chapters WHERE id = NEW.entity_slug::uuid) INTO ok;
    EXCEPTION WHEN others THEN ok := false; END;
    WHEN 'board'              THEN SELECT EXISTS(SELECT 1 FROM public.study_boards         WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'subject'            THEN ok := true;
    WHEN 'chapter'            THEN ok := true;
    WHEN 'study_material'     THEN ok := true;
    WHEN 'college_program'    THEN SELECT EXISTS(SELECT 1 FROM public.college_programs     WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'college_university' THEN SELECT EXISTS(SELECT 1 FROM public.college_universities WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'college_semester'   THEN ok := true;
    WHEN 'college_subject'    THEN ok := true;
    ELSE RAISE EXCEPTION 'article_links: invalid entity_type %', NEW.entity_type;
  END CASE;
  IF NOT ok THEN
    RAISE EXCEPTION 'article_links: % "%" does not exist', NEW.entity_type, NEW.entity_slug;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: validate_college_affiliation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_college_affiliation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.affiliation_kind = 'affiliated' THEN
    IF NEW.parent_university_slug IS NULL OR NEW.parent_university_slug = '' THEN
      RAISE EXCEPTION 'parent_university_slug is required when affiliation_kind = affiliated';
    END IF;
    IF NEW.parent_university_slug = NEW.slug THEN
      RAISE EXCEPTION 'A college cannot be affiliated to itself';
    END IF;
    -- Allow linking to ANY existing college/university (no longer must be kind = university)
    IF NOT EXISTS (
      SELECT 1 FROM public.colleges WHERE slug = NEW.parent_university_slug
    ) THEN
      RAISE EXCEPTION 'parent_university_slug "%" must reference an existing college', NEW.parent_university_slug;
    END IF;
  ELSE
    NEW.parent_university_slug := NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_college_related_arrays(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_college_related_arrays() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE bad text;
BEGIN
  IF NEW.related_courses IS NOT NULL AND array_length(NEW.related_courses,1) IS NOT NULL THEN
    SELECT s INTO bad FROM unnest(NEW.related_courses) s
      WHERE s <> '' AND NOT EXISTS (SELECT 1 FROM public.courses WHERE slug = s) LIMIT 1;
    IF bad IS NOT NULL THEN RAISE EXCEPTION 'colleges.related_courses: course "%" does not exist', bad; END IF;
  END IF;
  IF NEW.related_exams IS NOT NULL AND array_length(NEW.related_exams,1) IS NOT NULL THEN
    SELECT s INTO bad FROM unnest(NEW.related_exams) s
      WHERE s <> '' AND NOT EXISTS (SELECT 1 FROM public.exams WHERE slug = s) LIMIT 1;
    IF bad IS NOT NULL THEN RAISE EXCEPTION 'colleges.related_exams: exam "%" does not exist', bad; END IF;
  END IF;
  RETURN NEW;
END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: about_founders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_founders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    bio text DEFAULT ''::text NOT NULL,
    photo text DEFAULT ''::text NOT NULL,
    linkedin_url text DEFAULT ''::text NOT NULL,
    twitter_url text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: about_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: about_page; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_page (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hero_eyebrow text DEFAULT 'About DekhoCampus'::text NOT NULL,
    hero_title text DEFAULT 'We help students choose better'::text NOT NULL,
    hero_subtitle text DEFAULT 'and help colleges teach them better'::text NOT NULL,
    hero_image text DEFAULT ''::text NOT NULL,
    mission text DEFAULT ''::text NOT NULL,
    vision text DEFAULT ''::text NOT NULL,
    story text DEFAULT ''::text NOT NULL,
    story_image text DEFAULT ''::text NOT NULL,
    cta_title text DEFAULT 'Get expert counselling for free'::text NOT NULL,
    cta_subtitle text DEFAULT ''::text NOT NULL,
    meta_title text DEFAULT 'About Us | DekhoCampus'::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: about_press; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_press (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    outlet text NOT NULL,
    headline text DEFAULT ''::text NOT NULL,
    url text DEFAULT ''::text NOT NULL,
    logo text DEFAULT ''::text NOT NULL,
    published_on text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: about_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    value text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    icon_emoji text DEFAULT '📊'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: about_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_team (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text DEFAULT ''::text NOT NULL,
    department text DEFAULT ''::text NOT NULL,
    photo text DEFAULT ''::text NOT NULL,
    linkedin_url text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: about_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.about_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    icon_emoji text DEFAULT '⭐'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ad_analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_unit_id uuid,
    event_type text NOT NULL,
    device text DEFAULT ''::text,
    page_url text DEFAULT ''::text,
    country text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ad_scripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_scripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text DEFAULT 'head'::text NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ad_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    ad_type text DEFAULT 'display'::text NOT NULL,
    placement text DEFAULT 'homepage'::text NOT NULL,
    "position" text DEFAULT 'middle'::text NOT NULL,
    ad_slot_id text DEFAULT ''::text,
    ad_format text DEFAULT 'auto'::text,
    full_width_responsive boolean DEFAULT true NOT NULL,
    custom_html text DEFAULT ''::text,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    target_devices text[] DEFAULT '{mobile,desktop,tablet}'::text[] NOT NULL,
    target_roles text[] DEFAULT '{}'::text[] NOT NULL,
    target_countries text[] DEFAULT '{}'::text[] NOT NULL,
    target_categories text[] DEFAULT '{}'::text[] NOT NULL,
    url_pattern text DEFAULT ''::text,
    min_width integer,
    min_height integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subtitle text,
    cta_text text DEFAULT 'Learn More'::text NOT NULL,
    link_url text DEFAULT '#'::text NOT NULL,
    image_url text,
    variant text DEFAULT 'horizontal'::text NOT NULL,
    bg_gradient text DEFAULT 'from-violet-600 to-purple-600'::text NOT NULL,
    target_type text DEFAULT 'universal'::text NOT NULL,
    target_page text,
    target_item_slug text,
    target_city text,
    "position" text DEFAULT 'sidebar'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ads_position_check CHECK (("position" = ANY (ARRAY['sidebar'::text, 'mid-page'::text, 'top'::text, 'bottom'::text, 'leaderboard'::text, 'inline'::text]))),
    CONSTRAINT ads_target_page_check CHECK ((target_page = ANY (ARRAY['colleges'::text, 'courses'::text, 'exams'::text, 'articles'::text, NULL::text]))),
    CONSTRAINT ads_target_type_check CHECK ((target_type = ANY (ARRAY['universal'::text, 'page'::text, 'item'::text, 'city'::text]))),
    CONSTRAINT ads_variant_check CHECK ((variant = ANY (ARRAY['horizontal'::text, 'vertical'::text, 'square'::text, 'leaderboard'::text])))
);


--
-- Name: adsense_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adsense_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id text DEFAULT ''::text,
    client_id text DEFAULT ''::text,
    account_id text DEFAULT ''::text,
    verification_meta text DEFAULT ''::text,
    auto_ads_enabled boolean DEFAULT false NOT NULL,
    ads_globally_enabled boolean DEFAULT true NOT NULL,
    enabled_on_mobile boolean DEFAULT true NOT NULL,
    enabled_on_desktop boolean DEFAULT true NOT NULL,
    enabled_for_guests boolean DEFAULT true NOT NULL,
    enabled_for_logged_in boolean DEFAULT true NOT NULL,
    disabled_roles text[] DEFAULT '{}'::text[] NOT NULL,
    disabled_pages text[] DEFAULT '{}'::text[] NOT NULL,
    ads_per_page_limit integer DEFAULT 0 NOT NULL,
    lazy_load_enabled boolean DEFAULT true NOT NULL,
    refresh_interval_seconds integer DEFAULT 0 NOT NULL,
    head_scripts text DEFAULT ''::text,
    body_scripts text DEFAULT ''::text,
    footer_scripts text DEFAULT ''::text,
    custom_css text DEFAULT ''::text,
    custom_js text DEFAULT ''::text,
    api_keys jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_name text NOT NULL,
    display_name text NOT NULL,
    api_key_encrypted text DEFAULT ''::text NOT NULL,
    base_url text DEFAULT ''::text NOT NULL,
    default_model text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    icon_emoji text DEFAULT '🤖'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: also_check_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.also_check_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    description text,
    url text DEFAULT ''::text NOT NULL,
    icon text DEFAULT 'Sparkles'::text,
    sort_order integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    lead_id uuid,
    batch_id uuid,
    user_id text,
    application_no text,
    trigger_point text DEFAULT 'Lead Upload'::text,
    webhook_id text,
    data_push_type text DEFAULT 'Real Time'::text,
    email text,
    mobile text,
    form text,
    status text NOT NULL,
    response text,
    lead_data jsonb,
    source text,
    medium text,
    campaign text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_bodies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_bodies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    logo_url text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: article_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: article_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'Draft'::text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    vertical text DEFAULT ''::text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    featured_image text DEFAULT ''::text NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    meta_keywords text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    author_id uuid,
    featured_rank integer,
    CONSTRAINT articles_featured_rank_range_chk CHECK (((featured_rank IS NULL) OR ((featured_rank >= 1) AND (featured_rank <= 4))))
);


--
-- Name: authors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    designation text DEFAULT ''::text NOT NULL,
    photo text DEFAULT ''::text NOT NULL,
    short_bio text DEFAULT ''::text NOT NULL,
    bio text DEFAULT ''::text NOT NULL,
    expertise text[] DEFAULT '{}'::text[] NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    linkedin_url text DEFAULT ''::text NOT NULL,
    twitter_url text DEFAULT ''::text NOT NULL,
    website_url text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid
);


--
-- Name: career_course_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_course_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    career_slug text NOT NULL,
    course_slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: career_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    domain text DEFAULT ''::text NOT NULL,
    short_description text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    avg_salary text DEFAULT ''::text NOT NULL,
    growth text DEFAULT ''::text NOT NULL,
    experience_required text DEFAULT ''::text NOT NULL,
    top_skills text[] DEFAULT '{}'::text[] NOT NULL,
    top_companies text[] DEFAULT '{}'::text[] NOT NULL,
    related_courses text[] DEFAULT '{}'::text[] NOT NULL,
    related_exams text[] DEFAULT '{}'::text[] NOT NULL,
    job_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    icon_emoji text DEFAULT '💼'::text NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    meta_keywords text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'Published'::text NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    youtube_video_url text DEFAULT ''::text NOT NULL,
    author_id uuid,
    page_summary text
);


--
-- Name: college_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text,
    phone text NOT NULL,
    city text DEFAULT ''::text,
    state text DEFAULT ''::text,
    college_slug text NOT NULL,
    college_name text DEFAULT ''::text,
    course_slug text DEFAULT ''::text,
    course_interest text DEFAULT ''::text,
    message text DEFAULT ''::text,
    status text DEFAULT 'submitted'::text NOT NULL,
    admin_notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text NOT NULL,
    address text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    email text DEFAULT ''::text,
    website text DEFAULT ''::text,
    map_embed text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    map_link text
);


--
-- Name: college_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text NOT NULL,
    facility_id uuid,
    custom_note text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_few_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_few_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_slug text NOT NULL,
    university_slug text NOT NULL,
    title text NOT NULL,
    url text DEFAULT ''::text NOT NULL,
    icon_emoji text DEFAULT '🔗'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    short_description text DEFAULT ''::text NOT NULL,
    total_semesters integer DEFAULT 8 NOT NULL,
    icon_emoji text DEFAULT '🎓'::text NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_quick_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_quick_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_slug text NOT NULL,
    university_slug text NOT NULL,
    semester_num integer,
    link_type text DEFAULT 'syllabus'::text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    icon_emoji text DEFAULT '📄'::text NOT NULL,
    url text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    resource_type text DEFAULT 'notes'::text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    file_url text DEFAULT ''::text NOT NULL,
    external_url text DEFAULT ''::text NOT NULL,
    year integer,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text NOT NULL,
    user_id uuid,
    reviewer_name text DEFAULT ''::text NOT NULL,
    rating integer DEFAULT 5 NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    course text DEFAULT ''::text,
    year_of_study text DEFAULT ''::text,
    is_anonymous boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    report_count integer DEFAULT 0 NOT NULL,
    last_report_reason text DEFAULT ''::text,
    moderation_note text DEFAULT ''::text,
    CONSTRAINT college_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: college_semesters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_semesters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_slug text NOT NULL,
    university_slug text NOT NULL,
    semester_num integer NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_slug text NOT NULL,
    university_slug text NOT NULL,
    semester_num integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    branch text DEFAULT 'common'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    credits integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_toppers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_toppers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_slug text NOT NULL,
    university_slug text NOT NULL,
    year integer NOT NULL,
    rank integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    branch text DEFAULT ''::text NOT NULL,
    marks text DEFAULT ''::text NOT NULL,
    percentage text DEFAULT ''::text NOT NULL,
    photo text DEFAULT ''::text NOT NULL,
    quote text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: college_universities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_universities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_slug text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    short_name text DEFAULT ''::text NOT NULL,
    state text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    logo text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    total_semesters integer DEFAULT 8 NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: colleges_short_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.colleges_short_id_seq
    START WITH 10001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: colleges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colleges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    short_name text DEFAULT ''::text NOT NULL,
    location text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    state text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'Private'::text NOT NULL,
    category text DEFAULT 'Engineering'::text NOT NULL,
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    reviews integer DEFAULT 0 NOT NULL,
    courses_count integer DEFAULT 0 NOT NULL,
    fees text DEFAULT ''::text NOT NULL,
    placement text DEFAULT ''::text NOT NULL,
    ranking text DEFAULT ''::text NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    established integer DEFAULT 2000 NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    highlights text[] DEFAULT '{}'::text[] NOT NULL,
    facilities text[] DEFAULT '{}'::text[] NOT NULL,
    approvals text[] DEFAULT '{}'::text[] NOT NULL,
    naac_grade text DEFAULT ''::text NOT NULL,
    top_recruiters text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'Draft'::text NOT NULL,
    logo text DEFAULT ''::text NOT NULL,
    carousel_images text[] DEFAULT '{}'::text[] NOT NULL,
    brochure_url text DEFAULT ''::text NOT NULL,
    eligibility_criteria text DEFAULT ''::text NOT NULL,
    admission_process text DEFAULT ''::text NOT NULL,
    scholarship_details text DEFAULT ''::text NOT NULL,
    hostel_life text DEFAULT ''::text NOT NULL,
    gallery_images text[] DEFAULT '{}'::text[] NOT NULL,
    cutoff text DEFAULT ''::text NOT NULL,
    course_fee_content text DEFAULT ''::text NOT NULL,
    placement_content text DEFAULT ''::text NOT NULL,
    rankings_content text DEFAULT ''::text NOT NULL,
    facilities_content text DEFAULT ''::text NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    meta_keywords text DEFAULT ''::text NOT NULL,
    banner_ad_image text DEFAULT ''::text NOT NULL,
    square_ad_image text DEFAULT ''::text NOT NULL,
    youtube_video_url text DEFAULT ''::text NOT NULL,
    approval_logos text[] DEFAULT '{}'::text[] NOT NULL,
    approval_logo_names text[] DEFAULT '{}'::text[] NOT NULL,
    categories text[] DEFAULT '{}'::text[] NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    author_id uuid,
    featured_rank integer,
    priority_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    apply_cta_mode text DEFAULT 'lead'::text NOT NULL,
    apply_url text,
    admission_criteria_points jsonb DEFAULT '[]'::jsonb NOT NULL,
    page_summary text,
    related_courses text[] DEFAULT '{}'::text[] NOT NULL,
    related_exams text[] DEFAULT '{}'::text[] NOT NULL,
    secondary_state text,
    secondary_city text,
    admission_deadline timestamp with time zone,
    short_id bigint DEFAULT nextval('public.colleges_short_id_seq'::regclass) NOT NULL,
    scholarship_available text DEFAULT 'unknown'::text,
    affiliation_kind text DEFAULT 'standalone'::text NOT NULL,
    parent_university_slug text,
    CONSTRAINT colleges_affiliation_kind_check CHECK ((affiliation_kind = ANY (ARRAY['university'::text, 'affiliated'::text, 'standalone'::text]))),
    CONSTRAINT colleges_featured_rank_range_chk CHECK (((featured_rank IS NULL) OR ((featured_rank >= 1) AND (featured_rank <= 4)))),
    CONSTRAINT colleges_priority_range_chk CHECK (((priority >= 1) AND (priority <= 100)))
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo text DEFAULT ''::text,
    sector text DEFAULT ''::text,
    website text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text NOT NULL,
    course_slug text NOT NULL,
    course_name text DEFAULT ''::text,
    fee_amount numeric DEFAULT 0,
    fee_type text DEFAULT 'Annual'::text,
    year text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_specializations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_specializations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    course text NOT NULL,
    specialization text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'Engineering'::text NOT NULL,
    duration text DEFAULT ''::text NOT NULL,
    level text DEFAULT 'Undergraduate'::text NOT NULL,
    colleges_count integer DEFAULT 0 NOT NULL,
    avg_fees text DEFAULT ''::text NOT NULL,
    avg_salary text DEFAULT ''::text NOT NULL,
    growth text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    eligibility text DEFAULT ''::text NOT NULL,
    top_exams text[] DEFAULT '{}'::text[] NOT NULL,
    careers text[] DEFAULT '{}'::text[] NOT NULL,
    subjects text[] DEFAULT '{}'::text[] NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    mode text DEFAULT 'Full-Time'::text NOT NULL,
    specializations text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'Draft'::text NOT NULL,
    short_description text DEFAULT ''::text NOT NULL,
    domain text DEFAULT ''::text NOT NULL,
    duration_type text DEFAULT ''::text NOT NULL,
    study_type text DEFAULT ''::text NOT NULL,
    rating numeric DEFAULT 0 NOT NULL,
    fee_type text DEFAULT ''::text NOT NULL,
    fee numeric DEFAULT 0 NOT NULL,
    low_fee numeric DEFAULT 0 NOT NULL,
    high_fee numeric DEFAULT 0 NOT NULL,
    syllabus_pdf_url text DEFAULT ''::text NOT NULL,
    about_content text DEFAULT ''::text NOT NULL,
    scope_content text DEFAULT ''::text NOT NULL,
    subjects_content text DEFAULT ''::text NOT NULL,
    placements_content text DEFAULT ''::text NOT NULL,
    admission_process text DEFAULT ''::text NOT NULL,
    fees_content text DEFAULT ''::text NOT NULL,
    cutoff_content text DEFAULT ''::text NOT NULL,
    specialization_content text DEFAULT ''::text NOT NULL,
    recruiters_content text DEFAULT ''::text NOT NULL,
    syllabus_content text DEFAULT ''::text NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    meta_keywords text DEFAULT ''::text NOT NULL,
    youtube_video_url text DEFAULT ''::text NOT NULL,
    categories text[] DEFAULT '{}'::text[] NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    author_id uuid,
    page_summary text,
    linked_school_classes integer[] DEFAULT '{}'::integer[] NOT NULL,
    linked_college_subjects uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    short_id integer NOT NULL,
    CONSTRAINT courses_priority_range_chk CHECK (((priority >= 1) AND (priority <= 100)))
);


--
-- Name: courses_short_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courses_short_id_seq
    START WITH 20001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courses_short_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courses_short_id_seq OWNED BY public.courses.short_id;


--
-- Name: cta_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cta_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page text NOT NULL,
    cta text NOT NULL,
    entity_slug text,
    entity_name text,
    user_id uuid,
    session_id text,
    referrer text,
    path text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    user_agent text,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_column_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_column_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    column_id uuid NOT NULL,
    value text NOT NULL,
    parent_column_id uuid,
    parent_value_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    column_name text NOT NULL,
    column_key text NOT NULL,
    is_required boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_name text NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    status text NOT NULL,
    message_id text,
    error text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_name text NOT NULL,
    display_name text NOT NULL,
    api_key text DEFAULT ''::text,
    api_secret text DEFAULT ''::text,
    region text DEFAULT ''::text,
    from_email text DEFAULT ''::text,
    from_name text DEFAULT ''::text,
    reply_to text DEFAULT ''::text,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    icon_emoji text DEFAULT '📧'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'Engineering'::text NOT NULL,
    level text DEFAULT 'National'::text NOT NULL,
    exam_date text DEFAULT ''::text NOT NULL,
    applicants text DEFAULT ''::text NOT NULL,
    eligibility text DEFAULT ''::text NOT NULL,
    mode text DEFAULT 'Online (CBT)'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    important_dates jsonb DEFAULT '[]'::jsonb NOT NULL,
    syllabus text[] DEFAULT '{}'::text[] NOT NULL,
    top_colleges text[] DEFAULT '{}'::text[] NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    registration_url text DEFAULT '#'::text NOT NULL,
    duration text DEFAULT ''::text NOT NULL,
    exam_type text DEFAULT ''::text NOT NULL,
    language text DEFAULT 'English'::text NOT NULL,
    frequency text DEFAULT 'Once'::text NOT NULL,
    application_mode text DEFAULT 'Online'::text NOT NULL,
    status text DEFAULT 'Upcoming'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    short_name text DEFAULT ''::text NOT NULL,
    logo text DEFAULT ''::text NOT NULL,
    application_start_date text DEFAULT ''::text NOT NULL,
    application_end_date text DEFAULT ''::text NOT NULL,
    result_date text DEFAULT ''::text NOT NULL,
    website text DEFAULT ''::text NOT NULL,
    negative_marking boolean DEFAULT false NOT NULL,
    seats text DEFAULT ''::text NOT NULL,
    age_limit text DEFAULT ''::text NOT NULL,
    sample_paper_url text DEFAULT ''::text NOT NULL,
    summary_content text DEFAULT ''::text NOT NULL,
    application_process text DEFAULT ''::text NOT NULL,
    exam_pattern text DEFAULT ''::text NOT NULL,
    cutoff_content text DEFAULT ''::text NOT NULL,
    preparation_tips text DEFAULT ''::text NOT NULL,
    counselling_content text DEFAULT ''::text NOT NULL,
    center_content text DEFAULT ''::text NOT NULL,
    question_paper text DEFAULT ''::text NOT NULL,
    gender_wise text DEFAULT ''::text NOT NULL,
    result_content text DEFAULT ''::text NOT NULL,
    cast_wise_fee text DEFAULT ''::text NOT NULL,
    dates_content text DEFAULT ''::text NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    meta_keywords text DEFAULT ''::text NOT NULL,
    is_top_exam boolean DEFAULT false NOT NULL,
    youtube_video_url text DEFAULT ''::text NOT NULL,
    question_papers jsonb DEFAULT '[]'::jsonb NOT NULL,
    brochure_url text DEFAULT ''::text NOT NULL,
    how_to_apply_video_url text,
    categories text[] DEFAULT '{}'::text[] NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    author_id uuid,
    page_summary text,
    linked_school_classes integer[] DEFAULT '{}'::integer[] NOT NULL,
    linked_college_subjects uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    short_id integer NOT NULL,
    CONSTRAINT exams_priority_range_chk CHECK (((priority >= 1) AND (priority <= 100)))
);


--
-- Name: exams_short_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exams_short_id_seq
    START WITH 30001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exams_short_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exams_short_id_seq OWNED BY public.exams.short_id;


--
-- Name: facilities_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon_emoji text DEFAULT '🏫'::text,
    description text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: faculty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text NOT NULL,
    name text NOT NULL,
    designation text DEFAULT ''::text,
    department text DEFAULT ''::text,
    qualification text DEFAULT ''::text,
    photo text DEFAULT ''::text,
    bio text DEFAULT ''::text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gender text DEFAULT 'male'::text,
    linkedin_url text DEFAULT ''::text NOT NULL
);


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    page text DEFAULT 'homepage'::text NOT NULL,
    item_slug text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_toggles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_toggles (
    feature_key text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    parent_key text,
    is_enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: featured_colleges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_colleges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text NOT NULL,
    category text,
    state text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hero_banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hero_banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    image_url text NOT NULL,
    link_url text DEFAULT '#'::text NOT NULL,
    cta_text text DEFAULT 'Explore Now'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subtitle text
);


--
-- Name: hero_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hero_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    href text DEFAULT '/'::text NOT NULL,
    tint text DEFAULT 'bg-rose-50 hover:bg-rose-100/70 border-rose-100'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hero_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hero_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_urls text[] DEFAULT '{}'::text[] NOT NULL,
    overlay_mode text DEFAULT 'dark'::text NOT NULL,
    tint_color text DEFAULT '#000000'::text NOT NULL,
    overlay_opacity numeric DEFAULT 0.45 NOT NULL,
    blur_px integer DEFAULT 3 NOT NULL,
    grayscale numeric DEFAULT 0 NOT NULL,
    brightness numeric DEFAULT 1.0 NOT NULL,
    saturation numeric DEFAULT 1.05 NOT NULL,
    rotation_seconds integer DEFAULT 11 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: intent_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intent_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    alert_type text NOT NULL,
    score integer,
    college_slug text,
    course_slug text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    delivered boolean DEFAULT false NOT NULL,
    delivery_attempts integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    delivered_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: intent_crm_exports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intent_crm_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requested_by uuid,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    row_count integer DEFAULT 0 NOT NULL,
    format text DEFAULT 'csv'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: intent_event_weights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intent_event_weights (
    event_type text NOT NULL,
    label text NOT NULL,
    weight integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    category text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: intent_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intent_events (
    id bigint NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    visitor_id uuid,
    user_id uuid,
    session_id text,
    college_slug text,
    course_slug text,
    exam_slug text,
    university_slug text,
    device_type text,
    city text,
    state text,
    country text,
    traffic_source text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    page_url text,
    referrer text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    score_delta integer DEFAULT 0 NOT NULL
);


--
-- Name: intent_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.intent_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: intent_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.intent_events_id_seq OWNED BY public.intent_events.id;


--
-- Name: intent_lead_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intent_lead_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    category text DEFAULT 'cold'::text NOT NULL,
    top_college_slug text,
    top_course_slug text,
    top_exam_slug text,
    event_count integer DEFAULT 0 NOT NULL,
    last_event_type text,
    last_event_at timestamp with time zone,
    first_event_at timestamp with time zone,
    lead_id uuid,
    signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT intent_lead_scores_subject_type_check CHECK ((subject_type = ANY (ARRAY['user'::text, 'visitor'::text])))
);


--
-- Name: intent_university_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intent_university_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    college_slug text,
    university_slug text,
    webhook_url text NOT NULL,
    secret text,
    threshold_score integer DEFAULT 80 NOT NULL,
    alert_types text[] DEFAULT ARRAY['threshold_crossed'::text, 'download_brochure'::text, 'apply_now'::text, 'call_institute'::text, 'whatsapp_institute'::text, 'compare_colleges'::text, 'fee_repeat'::text] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_delivery_at timestamp with time zone,
    failures integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: intent_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intent_visitors (
    visitor_id uuid DEFAULT gen_random_uuid() NOT NULL,
    merged_user_id uuid,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    device_type text,
    city text,
    state text,
    country text,
    user_agent text,
    utm jsonb DEFAULT '{}'::jsonb NOT NULL,
    referrer text,
    landing_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    job_slug text NOT NULL,
    job_title text,
    company text,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    current_location text,
    experience text,
    current_company text,
    current_designation text,
    expected_salary text,
    notice_period text,
    resume_url text,
    portfolio_url text,
    linkedin_url text,
    cover_letter text,
    status text DEFAULT 'new'::text NOT NULL,
    admin_notes text,
    user_id uuid,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    company text NOT NULL,
    company_logo text,
    location text,
    job_type text,
    experience text,
    salary text,
    category text,
    short_description text,
    description text,
    requirements text,
    responsibilities text,
    skills text[],
    apply_url text,
    apply_email text,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_remote boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    posted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    meta_title text,
    meta_description text,
    meta_keywords text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: landing_page_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_page_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    landing_slug text NOT NULL,
    name text NOT NULL,
    email text,
    phone text NOT NULL,
    city text,
    state text,
    course text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    gclid text,
    fbclid text,
    referrer text,
    page_url text,
    consent boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: landing_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    brand_name text DEFAULT 'KollegeApply'::text NOT NULL,
    logo_url text DEFAULT ''::text NOT NULL,
    nav_links jsonb DEFAULT '[]'::jsonb NOT NULL,
    cta_label text DEFAULT 'Get Guidance'::text NOT NULL,
    cta_href text DEFAULT '#apply-card'::text NOT NULL,
    eyebrow text DEFAULT ''::text NOT NULL,
    hero_title text DEFAULT ''::text NOT NULL,
    hero_subtitle text DEFAULT ''::text NOT NULL,
    primary_cta_label text DEFAULT 'Talk to an advisor'::text NOT NULL,
    primary_cta_href text DEFAULT '#apply-card'::text NOT NULL,
    secondary_cta_label text DEFAULT 'View application form ↓'::text NOT NULL,
    secondary_cta_href text DEFAULT '#apply-card'::text NOT NULL,
    stats jsonb DEFAULT '[]'::jsonb NOT NULL,
    form_title text DEFAULT 'Quick application'::text NOT NULL,
    form_subtitle text DEFAULT 'Tell us about you. We respond in under 24 hours.'::text NOT NULL,
    form_courses jsonb DEFAULT '[]'::jsonb NOT NULL,
    form_submit_label text DEFAULT 'SUBMIT'::text NOT NULL,
    form_consent_text text DEFAULT 'By submitting, you agree to our Privacy Policy and to receive communications about education programs. This is not an offer of credit, employment, or guaranteed admission.'::text NOT NULL,
    courses_title text DEFAULT 'Explore courses'::text NOT NULL,
    courses_subtitle text DEFAULT 'Designed with industry mentors, updated each quarter.'::text NOT NULL,
    courses jsonb DEFAULT '[]'::jsonb NOT NULL,
    why_title text DEFAULT 'Why learners pick us'::text NOT NULL,
    why_subtitle text DEFAULT ''::text NOT NULL,
    why_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    testimonials_title text DEFAULT 'Hear from learners'::text NOT NULL,
    testimonials jsonb DEFAULT '[]'::jsonb NOT NULL,
    faqs jsonb DEFAULT '[]'::jsonb NOT NULL,
    footer_text text DEFAULT ''::text NOT NULL,
    privacy_url text DEFAULT '/legal/privacy'::text NOT NULL,
    terms_url text DEFAULT '/legal/terms'::text NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    meta_keywords text DEFAULT ''::text NOT NULL,
    og_image text DEFAULT ''::text NOT NULL,
    ga_id text DEFAULT ''::text NOT NULL,
    gtm_id text DEFAULT ''::text NOT NULL,
    meta_pixel_id text DEFAULT ''::text NOT NULL,
    theme jsonb DEFAULT '{"bg": "#ffffff", "ink": "#0e2236", "accent": "#ffeae3", "primary": "#ee5a36"}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lp_type text DEFAULT 'general'::text NOT NULL,
    multiple_layout text DEFAULT 'compact'::text NOT NULL,
    multiple_colleges jsonb DEFAULT '[]'::jsonb NOT NULL,
    exam_ad jsonb DEFAULT '{"lead_only": [], "locked_gate": "form", "free_downloads": [], "lead_only_gate": "form", "locked_premium": []}'::jsonb NOT NULL,
    advertiser_name text DEFAULT ''::text NOT NULL,
    advertiser_address text DEFAULT ''::text NOT NULL,
    advertiser_contact text DEFAULT ''::text NOT NULL,
    disclosure_text text DEFAULT 'This page is an advertisement. Information shown is for educational lead generation; it is not an offer of admission, scholarship, employment, or guaranteed outcome.'::text NOT NULL,
    CONSTRAINT landing_pages_lp_type_chk CHECK ((lp_type = ANY (ARRAY['general'::text, 'multiple_colleges'::text, 'exam_ad'::text]))),
    CONSTRAINT landing_pages_multiple_layout_chk CHECK ((multiple_layout = ANY (ARRAY['compact'::text, 'accordion'::text, 'bento'::text])))
);


--
-- Name: lead_form_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_form_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    singleton boolean DEFAULT true NOT NULL,
    otp_mode text DEFAULT 'off'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    channel_preference text DEFAULT 'sms'::text NOT NULL,
    form_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT lead_form_settings_channel_preference_check CHECK ((channel_preference = ANY (ARRAY['sms'::text, 'whatsapp'::text, 'both'::text]))),
    CONSTRAINT lead_form_settings_otp_mode_check CHECK ((otp_mode = ANY (ARRAY['on'::text, 'off'::text, 'test'::text])))
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    email text,
    phone text,
    current_situation text,
    city text,
    state text,
    initial_query text,
    source text DEFAULT 'chatbot'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    interested_college_slug text,
    interested_course_slug text,
    interested_exam_slug text,
    otp_verified boolean DEFAULT false NOT NULL,
    cta text,
    page_url text,
    program_mode text DEFAULT 'regular'::text NOT NULL,
    device_type text,
    source_category text
);


--
-- Name: legal_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lp_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    api_key text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    rate_limit_per_minute integer DEFAULT 60 NOT NULL,
    allowed_ips text[] DEFAULT '{}'::text[] NOT NULL,
    default_source text DEFAULT ''::text,
    default_medium text DEFAULT ''::text,
    default_campaign text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    last_used_at timestamp with time zone,
    call_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lp_automation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_automation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    priority integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    match_cities text[] DEFAULT '{}'::text[] NOT NULL,
    match_states text[] DEFAULT '{}'::text[] NOT NULL,
    match_courses text[] DEFAULT '{}'::text[] NOT NULL,
    match_sources text[] DEFAULT '{}'::text[] NOT NULL,
    match_ctas text[] DEFAULT '{}'::text[] NOT NULL,
    match_all boolean DEFAULT false NOT NULL,
    university_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    prefills jsonb DEFAULT '{}'::jsonb NOT NULL,
    auto_dispatch boolean DEFAULT true NOT NULL
);


--
-- Name: lp_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    source text DEFAULT 'upload'::text NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    success integer DEFAULT 0 NOT NULL,
    duplicate integer DEFAULT 0 NOT NULL,
    fail integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payload jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lp_marketing_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_marketing_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    rule_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lp_multi_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_multi_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    flow_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    trigger_event text DEFAULT 'lead_insert'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lp_push_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_push_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    university_id uuid,
    rule_id uuid,
    flow_id uuid,
    multi_flow_id uuid,
    status text DEFAULT 'Pending'::text NOT NULL,
    http_status integer,
    request_payload jsonb,
    response_body text,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lp_universities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_universities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    api_url text NOT NULL,
    api_type text DEFAULT 'generic'::text NOT NULL,
    college_id text DEFAULT ''::text,
    secret_key text DEFAULT ''::text,
    source text DEFAULT ''::text,
    medium text DEFAULT ''::text,
    campaign text DEFAULT ''::text,
    auth_type text DEFAULT 'none'::text NOT NULL,
    auth_header_key text DEFAULT ''::text,
    auth_header_value text DEFAULT ''::text,
    custom_headers jsonb DEFAULT '{}'::jsonb NOT NULL,
    column_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    static_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    university_defaults jsonb DEFAULT '{}'::jsonb NOT NULL,
    payload_wrapper text DEFAULT 'object'::text NOT NULL,
    leads_per_minute integer DEFAULT 30 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    programs jsonb DEFAULT '[]'::jsonb NOT NULL,
    state_cities jsonb DEFAULT '[]'::jsonb NOT NULL,
    course_specializations jsonb DEFAULT '[]'::jsonb NOT NULL,
    default_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    utm_link text,
    publisher_panel_url text,
    publisher_id text
);


--
-- Name: lp_utm_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lp_utm_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    destination_url text NOT NULL,
    utm_source text DEFAULT ''::text,
    utm_medium text DEFAULT ''::text,
    utm_campaign text DEFAULT ''::text,
    utm_term text DEFAULT ''::text,
    utm_content text DEFAULT ''::text,
    click_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_automations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_automations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    module text DEFAULT 'Lead/Application'::text NOT NULL,
    list_name text DEFAULT 'Lead'::text NOT NULL,
    trigger_type text DEFAULT 'on_creation'::text NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_runs integer DEFAULT 0 NOT NULL,
    last_run_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: multi_push_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multi_push_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    university_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: multi_push_university_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multi_push_university_defaults (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    defaults jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: otp_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel text DEFAULT 'sms'::text NOT NULL,
    provider_name text NOT NULL,
    display_name text NOT NULL,
    api_key text DEFAULT ''::text NOT NULL,
    api_secret text DEFAULT ''::text NOT NULL,
    sender_id text DEFAULT ''::text NOT NULL,
    base_url text DEFAULT ''::text NOT NULL,
    template_id text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    icon_emoji text DEFAULT '📱'::text NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: placement_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text NOT NULL,
    course_slug text DEFAULT ''::text,
    company_id uuid,
    company_name text DEFAULT ''::text,
    package_lpa numeric DEFAULT 0,
    year text DEFAULT ''::text,
    role text DEFAULT ''::text,
    hires_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: popular_places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.popular_places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    image_url text,
    college_count integer DEFAULT 0 NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    email text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text DEFAULT ''::text,
    dob text DEFAULT ''::text,
    gender text DEFAULT ''::text,
    social_category text DEFAULT ''::text,
    marital_status text DEFAULT ''::text,
    physically_challenged boolean DEFAULT false,
    city text DEFAULT ''::text,
    state text DEFAULT ''::text,
    class_10_board text DEFAULT ''::text,
    class_10_school text DEFAULT ''::text,
    class_10_year text DEFAULT ''::text,
    class_10_marks_type text DEFAULT ''::text,
    class_10_percentage text DEFAULT ''::text,
    class_12_board text DEFAULT ''::text,
    class_12_school text DEFAULT ''::text,
    class_12_year text DEFAULT ''::text,
    class_12_marks_type text DEFAULT ''::text,
    class_12_percentage text DEFAULT ''::text,
    preferred_stream text DEFAULT ''::text,
    preferred_level text DEFAULT ''::text,
    current_status text DEFAULT ''::text,
    education_level text DEFAULT ''::text,
    profile_image_url text DEFAULT ''::text,
    kyc_completed boolean DEFAULT false,
    kyc_completed_at timestamp with time zone,
    education_status text DEFAULT ''::text,
    current_semester text DEFAULT ''::text,
    onboarding_completed boolean DEFAULT false NOT NULL,
    mask_leads boolean DEFAULT false NOT NULL
);


--
-- Name: program_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    icon_emoji text DEFAULT '🎓'::text NOT NULL,
    icon_url text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promoted_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promoted_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_name text NOT NULL,
    college_slug text DEFAULT ''::text NOT NULL,
    title text NOT NULL,
    badge text DEFAULT 'New'::text NOT NULL,
    badge_variant text DEFAULT 'default'::text NOT NULL,
    program_type text DEFAULT 'Bachelor''s Degree'::text NOT NULL,
    duration text DEFAULT '24 Months'::text NOT NULL,
    original_price numeric DEFAULT 0 NOT NULL,
    discount_percent integer DEFAULT 0 NOT NULL,
    course_slug text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tag text DEFAULT 'IIT'::text NOT NULL,
    delivery_mode text DEFAULT 'Online'::text NOT NULL,
    country text DEFAULT 'India'::text NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    slug text DEFAULT ''::text NOT NULL,
    category_slug text DEFAULT ''::text NOT NULL,
    hero_image text DEFAULT ''::text NOT NULL,
    hero_video_url text DEFAULT ''::text NOT NULL,
    brochure_url text DEFAULT ''::text NOT NULL,
    apply_url text DEFAULT ''::text NOT NULL,
    summary text DEFAULT ''::text NOT NULL,
    about_program text DEFAULT ''::text NOT NULL,
    eligibility text DEFAULT ''::text NOT NULL,
    batch_start_date text DEFAULT ''::text NOT NULL,
    schedule text DEFAULT ''::text NOT NULL,
    emi_starts_at numeric DEFAULT 0 NOT NULL,
    certificate_image text DEFAULT ''::text NOT NULL,
    highlights jsonb DEFAULT '[]'::jsonb NOT NULL,
    learning_outcomes jsonb DEFAULT '[]'::jsonb NOT NULL,
    curriculum jsonb DEFAULT '[]'::jsonb NOT NULL,
    faculty jsonb DEFAULT '[]'::jsonb NOT NULL,
    faqs jsonb DEFAULT '[]'::jsonb NOT NULL,
    fee_breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    partner_logos jsonb DEFAULT '[]'::jsonb NOT NULL,
    tools_taught jsonb DEFAULT '[]'::jsonb NOT NULL,
    placement_stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    rating numeric DEFAULT 0 NOT NULL,
    learners_count text DEFAULT ''::text NOT NULL,
    ranking_text text DEFAULT ''::text NOT NULL,
    why_this_program text DEFAULT ''::text NOT NULL,
    who_should_apply jsonb DEFAULT '[]'::jsonb NOT NULL,
    application_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    program_stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    top_companies jsonb DEFAULT '[]'::jsonb NOT NULL,
    mentors jsonb DEFAULT '[]'::jsonb NOT NULL,
    testimonials jsonb DEFAULT '[]'::jsonb NOT NULL,
    degree_image text DEFAULT ''::text NOT NULL,
    youtube_url text DEFAULT ''::text NOT NULL,
    contact_phone text DEFAULT ''::text NOT NULL,
    institute_logo text DEFAULT ''::text NOT NULL,
    institute_legacy_title text DEFAULT ''::text NOT NULL,
    institute_legacy_points jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: push_landing_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_landing_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    api_key text DEFAULT encode(extensions.gen_random_bytes(24), 'hex'::text) NOT NULL,
    routing_mode text DEFAULT 'universities'::text NOT NULL,
    university_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    preset_id uuid,
    default_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    submissions_count integer DEFAULT 0 NOT NULL,
    last_submission_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    university_id uuid NOT NULL,
    user_id uuid,
    name text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    mobile text DEFAULT ''::text NOT NULL,
    address text,
    state text,
    city text,
    course text,
    specialization text,
    lead_source text,
    lead_medium text,
    lead_campaign text,
    extra_data jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text,
    api_response text,
    retry_count integer DEFAULT 0,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    friend_name text NOT NULL,
    friend_mobile text NOT NULL,
    friend_email text NOT NULL,
    alternate_mobile text DEFAULT ''::text,
    alternate_email text DEFAULT ''::text,
    friend_state text NOT NULL,
    friend_city text NOT NULL,
    desired_city text DEFAULT ''::text,
    desired_colleges jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'submitted'::text NOT NULL,
    reward_amount numeric DEFAULT 0,
    reward_paid boolean DEFAULT false,
    admin_notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: review_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    reporter_user_id uuid,
    reporter_name text DEFAULT ''::text,
    reason text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scholarships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    provider text DEFAULT ''::text NOT NULL,
    amount text DEFAULT ''::text NOT NULL,
    eligibility text DEFAULT ''::text NOT NULL,
    deadline text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    level text DEFAULT 'UG'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    apply_url text DEFAULT ''::text NOT NULL,
    image text DEFAULT ''::text NOT NULL,
    is_live boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    meta_title text DEFAULT ''::text NOT NULL,
    meta_description text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    author_id uuid,
    page_summary text
);


--
-- Name: site_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    category text DEFAULT 'analytics'::text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: state_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    state text NOT NULL,
    city text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: states_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.states_cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state text NOT NULL,
    city text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stream_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stream_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    emoji text DEFAULT '📚'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_board_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_board_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_slug text NOT NULL,
    class_num integer NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'general'::text NOT NULL
);


--
-- Name: study_boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_boards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    icon_emoji text DEFAULT '📚'::text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text DEFAULT ''::text NOT NULL
);


--
-- Name: study_chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    chapter_number integer DEFAULT 0,
    description text DEFAULT ''::text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid,
    subject_id uuid,
    resource_type text DEFAULT 'pyq'::text NOT NULL,
    year text DEFAULT ''::text,
    title text NOT NULL,
    description text DEFAULT ''::text,
    file_url text DEFAULT ''::text,
    file_size_kb integer DEFAULT 0,
    download_count integer DEFAULT 0 NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    content_html text DEFAULT ''::text NOT NULL,
    content_images text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: study_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    class_num integer NOT NULL,
    board_slug text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    icon_emoji text DEFAULT '📖'::text,
    cover_image text DEFAULT ''::text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    author_id uuid,
    CONSTRAINT study_subjects_class_num_check CHECK (((class_num >= 8) AND (class_num <= 12)))
);


--
-- Name: study_toppers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_toppers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_num integer NOT NULL,
    board_slug text NOT NULL,
    stream text DEFAULT 'Science'::text NOT NULL,
    year integer DEFAULT (EXTRACT(year FROM now()))::integer NOT NULL,
    rank integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    marks text DEFAULT ''::text NOT NULL,
    percentage numeric DEFAULT 0 NOT NULL,
    school text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    photo text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sub_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_user_id uuid NOT NULL,
    type text DEFAULT 'family'::text NOT NULL,
    name text NOT NULL,
    email text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    role text DEFAULT 'viewer'::text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    function_name text NOT NULL,
    level text DEFAULT 'info'::text NOT NULL,
    flow text,
    method text,
    message text NOT NULL,
    context jsonb,
    request_id text
);


--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    phone text,
    display_name text,
    role text DEFAULT 'editor'::text NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    mask_leads boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    accepted_user_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_invites_check CHECK (((email IS NOT NULL) OR (phone IS NOT NULL)))
);


--
-- Name: trusted_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trusted_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    college_slug text DEFAULT ''::text NOT NULL,
    name text NOT NULL,
    logo_url text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: universities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    api_url text DEFAULT ''::text NOT NULL,
    college_id text DEFAULT ''::text NOT NULL,
    secret_key text DEFAULT ''::text NOT NULL,
    source text DEFAULT 'dekhocampus'::text,
    medium text DEFAULT 'dekhocampus'::text,
    campaign text DEFAULT 'API'::text,
    api_type text DEFAULT 'nopaperforms'::text,
    leads_per_minute integer DEFAULT 5,
    column_mapping jsonb DEFAULT '{}'::jsonb,
    default_values jsonb DEFAULT '{}'::jsonb,
    utm_link text,
    daily_limit integer,
    admission_commitment integer,
    contact_person_name text,
    contact_person_mobile text,
    contact_person_email text,
    whatsapp_group_link text,
    deal_price numeric,
    gst_inclusive boolean DEFAULT true,
    city text,
    state text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: university_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.university_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    api_key text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    name text DEFAULT 'Default API Key'::text NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    request_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upload_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    user_id uuid,
    file_name text NOT NULL,
    total_leads integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    fail_count integer DEFAULT 0 NOT NULL,
    duplicate_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    csv_data text,
    scheduled_at timestamp with time zone,
    leads_per_minute integer DEFAULT 5,
    api_config jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    is_paused boolean DEFAULT false,
    is_cancelled boolean DEFAULT false,
    processed_count integer DEFAULT 0,
    current_lead_index integer DEFAULT 0,
    error_message text
);


--
-- Name: user_consent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_consent (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    essential boolean DEFAULT true NOT NULL,
    analytics boolean DEFAULT false NOT NULL,
    marketing boolean DEFAULT false NOT NULL,
    prefill boolean DEFAULT false NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    doc_type text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_education_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_education_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    level text NOT NULL,
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
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_education_entries_level_check CHECK ((level = ANY (ARRAY['graduation'::text, 'master'::text, 'phd'::text, 'diploma'::text])))
);


--
-- Name: user_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text NOT NULL,
    event_type text NOT NULL,
    path text,
    element text,
    metadata jsonb DEFAULT '{}'::jsonb,
    user_agent text,
    referrer text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    x integer,
    y integer,
    vw integer,
    vh integer
);


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    college_slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module text,
    action text,
    allow boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resource text NOT NULL,
    can_view boolean DEFAULT true NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    scope text DEFAULT 'own'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    can_publish boolean DEFAULT false NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    pages_visited integer DEFAULT 0 NOT NULL,
    total_events integer DEFAULT 0 NOT NULL,
    device text,
    last_path text,
    referrer text,
    utm jsonb DEFAULT '{}'::jsonb,
    ai_summary text,
    ai_summary_at timestamp with time zone,
    lead_id uuid,
    lead_name text,
    lead_email text,
    lead_phone text,
    viewport text,
    screen text,
    language text,
    timezone text,
    total_time_ms bigint DEFAULT 0,
    max_scroll_pct integer DEFAULT 0,
    country text,
    city text,
    opt_in jsonb DEFAULT '{}'::jsonb,
    entry_path text,
    exit_path text,
    conversion boolean DEFAULT false
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text DEFAULT 'credit'::text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    description text DEFAULT ''::text,
    referral_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses short_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses ALTER COLUMN short_id SET DEFAULT nextval('public.courses_short_id_seq'::regclass);


--
-- Name: exams short_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams ALTER COLUMN short_id SET DEFAULT nextval('public.exams_short_id_seq'::regclass);


--
-- Name: intent_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_events ALTER COLUMN id SET DEFAULT nextval('public.intent_events_id_seq'::regclass);


--
-- Name: about_founders about_founders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_founders
    ADD CONSTRAINT about_founders_pkey PRIMARY KEY (id);


--
-- Name: about_milestones about_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_milestones
    ADD CONSTRAINT about_milestones_pkey PRIMARY KEY (id);


--
-- Name: about_page about_page_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_page
    ADD CONSTRAINT about_page_pkey PRIMARY KEY (id);


--
-- Name: about_press about_press_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_press
    ADD CONSTRAINT about_press_pkey PRIMARY KEY (id);


--
-- Name: about_stats about_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_stats
    ADD CONSTRAINT about_stats_pkey PRIMARY KEY (id);


--
-- Name: about_team about_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_team
    ADD CONSTRAINT about_team_pkey PRIMARY KEY (id);


--
-- Name: about_values about_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.about_values
    ADD CONSTRAINT about_values_pkey PRIMARY KEY (id);


--
-- Name: ad_analytics_events ad_analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_analytics_events
    ADD CONSTRAINT ad_analytics_events_pkey PRIMARY KEY (id);


--
-- Name: ad_scripts ad_scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_scripts
    ADD CONSTRAINT ad_scripts_pkey PRIMARY KEY (id);


--
-- Name: ad_units ad_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_units
    ADD CONSTRAINT ad_units_pkey PRIMARY KEY (id);


--
-- Name: ads ads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_pkey PRIMARY KEY (id);


--
-- Name: adsense_settings adsense_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adsense_settings
    ADD CONSTRAINT adsense_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_provider_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_provider_name_key UNIQUE (provider_name);


--
-- Name: also_check_modules also_check_modules_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.also_check_modules
    ADD CONSTRAINT also_check_modules_key_key UNIQUE (key);


--
-- Name: also_check_modules also_check_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.also_check_modules
    ADD CONSTRAINT also_check_modules_pkey PRIMARY KEY (id);


--
-- Name: api_logs api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: approval_bodies approval_bodies_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_bodies
    ADD CONSTRAINT approval_bodies_code_key UNIQUE (code);


--
-- Name: approval_bodies approval_bodies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_bodies
    ADD CONSTRAINT approval_bodies_pkey PRIMARY KEY (id);


--
-- Name: article_categories article_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_categories
    ADD CONSTRAINT article_categories_pkey PRIMARY KEY (id);


--
-- Name: article_categories article_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_categories
    ADD CONSTRAINT article_categories_slug_key UNIQUE (slug);


--
-- Name: article_links article_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_links
    ADD CONSTRAINT article_links_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: articles articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_slug_key UNIQUE (slug);


--
-- Name: authors authors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authors
    ADD CONSTRAINT authors_pkey PRIMARY KEY (id);


--
-- Name: authors authors_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authors
    ADD CONSTRAINT authors_slug_key UNIQUE (slug);


--
-- Name: career_course_links career_course_links_career_slug_course_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_course_links
    ADD CONSTRAINT career_course_links_career_slug_course_slug_key UNIQUE (career_slug, course_slug);


--
-- Name: career_course_links career_course_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_course_links
    ADD CONSTRAINT career_course_links_pkey PRIMARY KEY (id);


--
-- Name: career_profiles career_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_profiles
    ADD CONSTRAINT career_profiles_pkey PRIMARY KEY (id);


--
-- Name: career_profiles career_profiles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_profiles
    ADD CONSTRAINT career_profiles_slug_key UNIQUE (slug);


--
-- Name: college_applications college_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_applications
    ADD CONSTRAINT college_applications_pkey PRIMARY KEY (id);


--
-- Name: college_contacts college_contacts_college_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_contacts
    ADD CONSTRAINT college_contacts_college_slug_key UNIQUE (college_slug);


--
-- Name: college_contacts college_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_contacts
    ADD CONSTRAINT college_contacts_pkey PRIMARY KEY (id);


--
-- Name: college_facilities college_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_facilities
    ADD CONSTRAINT college_facilities_pkey PRIMARY KEY (id);


--
-- Name: college_few_links college_few_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_few_links
    ADD CONSTRAINT college_few_links_pkey PRIMARY KEY (id);


--
-- Name: college_programs college_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_programs
    ADD CONSTRAINT college_programs_pkey PRIMARY KEY (id);


--
-- Name: college_programs college_programs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_programs
    ADD CONSTRAINT college_programs_slug_key UNIQUE (slug);


--
-- Name: college_quick_links college_quick_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_quick_links
    ADD CONSTRAINT college_quick_links_pkey PRIMARY KEY (id);


--
-- Name: college_resources college_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_resources
    ADD CONSTRAINT college_resources_pkey PRIMARY KEY (id);


--
-- Name: college_reviews college_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_reviews
    ADD CONSTRAINT college_reviews_pkey PRIMARY KEY (id);


--
-- Name: college_semesters college_semesters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_semesters
    ADD CONSTRAINT college_semesters_pkey PRIMARY KEY (id);


--
-- Name: college_semesters college_semesters_program_slug_university_slug_semester_num_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_semesters
    ADD CONSTRAINT college_semesters_program_slug_university_slug_semester_num_key UNIQUE (program_slug, university_slug, semester_num);


--
-- Name: college_subjects college_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_subjects
    ADD CONSTRAINT college_subjects_pkey PRIMARY KEY (id);


--
-- Name: college_subjects college_subjects_program_slug_university_slug_semester_num__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_subjects
    ADD CONSTRAINT college_subjects_program_slug_university_slug_semester_num__key UNIQUE (program_slug, university_slug, semester_num, branch, slug);


--
-- Name: college_toppers college_toppers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_toppers
    ADD CONSTRAINT college_toppers_pkey PRIMARY KEY (id);


--
-- Name: college_universities college_universities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_universities
    ADD CONSTRAINT college_universities_pkey PRIMARY KEY (id);


--
-- Name: college_universities college_universities_program_slug_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_universities
    ADD CONSTRAINT college_universities_program_slug_slug_key UNIQUE (program_slug, slug);


--
-- Name: colleges colleges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_pkey PRIMARY KEY (id);


--
-- Name: colleges colleges_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_slug_key UNIQUE (slug);


--
-- Name: companies companies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_key UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: course_fees course_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_fees
    ADD CONSTRAINT course_fees_pkey PRIMARY KEY (id);


--
-- Name: course_specializations course_specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_specializations
    ADD CONSTRAINT course_specializations_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_slug_key UNIQUE (slug);


--
-- Name: cta_events cta_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cta_events
    ADD CONSTRAINT cta_events_pkey PRIMARY KEY (id);


--
-- Name: custom_column_values custom_column_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_column_values
    ADD CONSTRAINT custom_column_values_pkey PRIMARY KEY (id);


--
-- Name: custom_columns custom_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_columns
    ADD CONSTRAINT custom_columns_pkey PRIMARY KEY (id);


--
-- Name: email_log email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_pkey PRIMARY KEY (id);


--
-- Name: email_providers email_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_providers
    ADD CONSTRAINT email_providers_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: exams exams_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_slug_key UNIQUE (slug);


--
-- Name: facilities_library facilities_library_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities_library
    ADD CONSTRAINT facilities_library_name_key UNIQUE (name);


--
-- Name: facilities_library facilities_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities_library
    ADD CONSTRAINT facilities_library_pkey PRIMARY KEY (id);


--
-- Name: faculty faculty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: feature_toggles feature_toggles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_toggles
    ADD CONSTRAINT feature_toggles_pkey PRIMARY KEY (feature_key);


--
-- Name: featured_colleges featured_colleges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_colleges
    ADD CONSTRAINT featured_colleges_pkey PRIMARY KEY (id);


--
-- Name: hero_banners hero_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_banners
    ADD CONSTRAINT hero_banners_pkey PRIMARY KEY (id);


--
-- Name: hero_categories hero_categories_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_categories
    ADD CONSTRAINT hero_categories_key_key UNIQUE (key);


--
-- Name: hero_categories hero_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_categories
    ADD CONSTRAINT hero_categories_pkey PRIMARY KEY (id);


--
-- Name: hero_settings hero_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_settings
    ADD CONSTRAINT hero_settings_pkey PRIMARY KEY (id);


--
-- Name: intent_alerts intent_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_alerts
    ADD CONSTRAINT intent_alerts_pkey PRIMARY KEY (id);


--
-- Name: intent_crm_exports intent_crm_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_crm_exports
    ADD CONSTRAINT intent_crm_exports_pkey PRIMARY KEY (id);


--
-- Name: intent_event_weights intent_event_weights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_event_weights
    ADD CONSTRAINT intent_event_weights_pkey PRIMARY KEY (event_type);


--
-- Name: intent_events intent_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_events
    ADD CONSTRAINT intent_events_pkey PRIMARY KEY (id);


--
-- Name: intent_lead_scores intent_lead_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_lead_scores
    ADD CONSTRAINT intent_lead_scores_pkey PRIMARY KEY (id);


--
-- Name: intent_lead_scores intent_lead_scores_subject_type_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_lead_scores
    ADD CONSTRAINT intent_lead_scores_subject_type_subject_id_key UNIQUE (subject_type, subject_id);


--
-- Name: intent_university_webhooks intent_university_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_university_webhooks
    ADD CONSTRAINT intent_university_webhooks_pkey PRIMARY KEY (id);


--
-- Name: intent_visitors intent_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_visitors
    ADD CONSTRAINT intent_visitors_pkey PRIMARY KEY (visitor_id);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_slug_key UNIQUE (slug);


--
-- Name: landing_page_leads landing_page_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_page_leads
    ADD CONSTRAINT landing_page_leads_pkey PRIMARY KEY (id);


--
-- Name: landing_pages landing_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_pkey PRIMARY KEY (id);


--
-- Name: landing_pages landing_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_slug_key UNIQUE (slug);


--
-- Name: lead_form_settings lead_form_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_form_settings
    ADD CONSTRAINT lead_form_settings_pkey PRIMARY KEY (id);


--
-- Name: lead_form_settings lead_form_settings_singleton_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_form_settings
    ADD CONSTRAINT lead_form_settings_singleton_key UNIQUE (singleton);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: legal_pages legal_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_pages
    ADD CONSTRAINT legal_pages_pkey PRIMARY KEY (id);


--
-- Name: legal_pages legal_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_pages
    ADD CONSTRAINT legal_pages_slug_key UNIQUE (slug);


--
-- Name: lp_api_keys lp_api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_api_keys
    ADD CONSTRAINT lp_api_keys_api_key_key UNIQUE (api_key);


--
-- Name: lp_api_keys lp_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_api_keys
    ADD CONSTRAINT lp_api_keys_pkey PRIMARY KEY (id);


--
-- Name: lp_automation_rules lp_automation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_automation_rules
    ADD CONSTRAINT lp_automation_rules_pkey PRIMARY KEY (id);


--
-- Name: lp_batches lp_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_batches
    ADD CONSTRAINT lp_batches_pkey PRIMARY KEY (id);


--
-- Name: lp_marketing_flows lp_marketing_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_marketing_flows
    ADD CONSTRAINT lp_marketing_flows_pkey PRIMARY KEY (id);


--
-- Name: lp_multi_flows lp_multi_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_multi_flows
    ADD CONSTRAINT lp_multi_flows_pkey PRIMARY KEY (id);


--
-- Name: lp_push_logs lp_push_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_push_logs
    ADD CONSTRAINT lp_push_logs_pkey PRIMARY KEY (id);


--
-- Name: lp_universities lp_universities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_universities
    ADD CONSTRAINT lp_universities_pkey PRIMARY KEY (id);


--
-- Name: lp_utm_links lp_utm_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_utm_links
    ADD CONSTRAINT lp_utm_links_pkey PRIMARY KEY (id);


--
-- Name: lp_utm_links lp_utm_links_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lp_utm_links
    ADD CONSTRAINT lp_utm_links_slug_key UNIQUE (slug);


--
-- Name: marketing_automations marketing_automations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_automations
    ADD CONSTRAINT marketing_automations_pkey PRIMARY KEY (id);


--
-- Name: multi_push_presets multi_push_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_push_presets
    ADD CONSTRAINT multi_push_presets_pkey PRIMARY KEY (id);


--
-- Name: multi_push_university_defaults multi_push_university_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_push_university_defaults
    ADD CONSTRAINT multi_push_university_defaults_pkey PRIMARY KEY (id);


--
-- Name: multi_push_university_defaults multi_push_university_defaults_university_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_push_university_defaults
    ADD CONSTRAINT multi_push_university_defaults_university_id_key UNIQUE (university_id);


--
-- Name: otp_providers otp_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_providers
    ADD CONSTRAINT otp_providers_pkey PRIMARY KEY (id);


--
-- Name: placement_records placement_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_records
    ADD CONSTRAINT placement_records_pkey PRIMARY KEY (id);


--
-- Name: popular_places popular_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.popular_places
    ADD CONSTRAINT popular_places_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: program_categories program_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_categories
    ADD CONSTRAINT program_categories_pkey PRIMARY KEY (id);


--
-- Name: program_categories program_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_categories
    ADD CONSTRAINT program_categories_slug_key UNIQUE (slug);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: promoted_programs promoted_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promoted_programs
    ADD CONSTRAINT promoted_programs_pkey PRIMARY KEY (id);


--
-- Name: push_landing_pages push_landing_pages_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_landing_pages
    ADD CONSTRAINT push_landing_pages_api_key_key UNIQUE (api_key);


--
-- Name: push_landing_pages push_landing_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_landing_pages
    ADD CONSTRAINT push_landing_pages_pkey PRIMARY KEY (id);


--
-- Name: push_leads push_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_leads
    ADD CONSTRAINT push_leads_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: review_reports review_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT review_reports_pkey PRIMARY KEY (id);


--
-- Name: scholarships scholarships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_pkey PRIMARY KEY (id);


--
-- Name: scholarships scholarships_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_slug_key UNIQUE (slug);


--
-- Name: site_integrations site_integrations_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_integrations
    ADD CONSTRAINT site_integrations_key_key UNIQUE (key);


--
-- Name: site_integrations site_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_integrations
    ADD CONSTRAINT site_integrations_pkey PRIMARY KEY (id);


--
-- Name: state_cities state_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_cities
    ADD CONSTRAINT state_cities_pkey PRIMARY KEY (id);


--
-- Name: states_cities states_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states_cities
    ADD CONSTRAINT states_cities_pkey PRIMARY KEY (id);


--
-- Name: stream_categories stream_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_categories
    ADD CONSTRAINT stream_categories_pkey PRIMARY KEY (id);


--
-- Name: stream_categories stream_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_categories
    ADD CONSTRAINT stream_categories_slug_key UNIQUE (slug);


--
-- Name: study_board_links study_board_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_board_links
    ADD CONSTRAINT study_board_links_pkey PRIMARY KEY (id);


--
-- Name: study_boards study_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_boards
    ADD CONSTRAINT study_boards_pkey PRIMARY KEY (id);


--
-- Name: study_boards study_boards_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_boards
    ADD CONSTRAINT study_boards_slug_key UNIQUE (slug);


--
-- Name: study_chapters study_chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_chapters
    ADD CONSTRAINT study_chapters_pkey PRIMARY KEY (id);


--
-- Name: study_chapters study_chapters_subject_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_chapters
    ADD CONSTRAINT study_chapters_subject_id_slug_key UNIQUE (subject_id, slug);


--
-- Name: study_resources study_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_resources
    ADD CONSTRAINT study_resources_pkey PRIMARY KEY (id);


--
-- Name: study_subjects study_subjects_class_num_board_slug_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_subjects
    ADD CONSTRAINT study_subjects_class_num_board_slug_slug_key UNIQUE (class_num, board_slug, slug);


--
-- Name: study_subjects study_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_subjects
    ADD CONSTRAINT study_subjects_pkey PRIMARY KEY (id);


--
-- Name: study_toppers study_toppers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_toppers
    ADD CONSTRAINT study_toppers_pkey PRIMARY KEY (id);


--
-- Name: sub_users sub_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_users
    ADD CONSTRAINT sub_users_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: trusted_partners trusted_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trusted_partners
    ADD CONSTRAINT trusted_partners_pkey PRIMARY KEY (id);


--
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- Name: university_api_keys university_api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.university_api_keys
    ADD CONSTRAINT university_api_keys_api_key_key UNIQUE (api_key);


--
-- Name: university_api_keys university_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.university_api_keys
    ADD CONSTRAINT university_api_keys_pkey PRIMARY KEY (id);


--
-- Name: upload_batches upload_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_batches
    ADD CONSTRAINT upload_batches_pkey PRIMARY KEY (id);


--
-- Name: user_consent user_consent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consent
    ADD CONSTRAINT user_consent_pkey PRIMARY KEY (id);


--
-- Name: user_documents user_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_pkey PRIMARY KEY (id);


--
-- Name: user_education_entries user_education_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_education_entries
    ADD CONSTRAINT user_education_entries_pkey PRIMARY KEY (id);


--
-- Name: user_events user_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_events
    ADD CONSTRAINT user_events_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_user_id_college_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_college_slug_key UNIQUE (user_id, college_slug);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_module_action_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_module_action_key UNIQUE (user_id, module, action);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: colleges_short_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX colleges_short_id_key ON public.colleges USING btree (short_id);


--
-- Name: courses_short_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX courses_short_id_unique ON public.courses USING btree (short_id);


--
-- Name: exams_short_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX exams_short_id_unique ON public.exams USING btree (short_id);


--
-- Name: idx_ad_events_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_events_type_time ON public.ad_analytics_events USING btree (event_type, created_at DESC);


--
-- Name: idx_ad_events_unit_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_events_unit_time ON public.ad_analytics_events USING btree (ad_unit_id, created_at DESC);


--
-- Name: idx_ad_units_placement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_units_placement ON public.ad_units USING btree (placement, "position") WHERE (is_active = true);


--
-- Name: idx_ads_active_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ads_active_priority ON public.ads USING btree (is_active, priority DESC);


--
-- Name: idx_api_logs_uni; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_uni ON public.api_logs USING btree (university_id);


--
-- Name: idx_article_links_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_links_article_id ON public.article_links USING btree (article_id);


--
-- Name: idx_article_links_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_links_entity ON public.article_links USING btree (entity_type, entity_slug);


--
-- Name: idx_articles_active_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_active_created ON public.articles USING btree (is_active, created_at DESC);


--
-- Name: idx_articles_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_author ON public.articles USING btree (author_id);


--
-- Name: idx_articles_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_category ON public.articles USING btree (category);


--
-- Name: idx_articles_featured_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_featured_rank ON public.articles USING btree (featured_rank) WHERE (featured_rank IS NOT NULL);


--
-- Name: idx_articles_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_slug ON public.articles USING btree (slug);


--
-- Name: idx_articles_title_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_title_lower ON public.articles USING btree (lower(title));


--
-- Name: idx_authors_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authors_user_id ON public.authors USING btree (user_id);


--
-- Name: idx_career_profiles_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_career_profiles_name_lower ON public.career_profiles USING btree (lower(name));


--
-- Name: idx_careers_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_careers_author ON public.career_profiles USING btree (author_id);


--
-- Name: idx_cfl_pu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cfl_pu ON public.college_few_links USING btree (program_slug, university_slug);


--
-- Name: idx_chapters_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_subject ON public.study_chapters USING btree (subject_id, is_active);


--
-- Name: idx_college_applications_college; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_applications_college ON public.college_applications USING btree (college_slug);


--
-- Name: idx_college_applications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_applications_user ON public.college_applications USING btree (user_id);


--
-- Name: idx_college_reviews_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_college_reviews_slug ON public.college_reviews USING btree (college_slug);


--
-- Name: idx_colleges_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_active ON public.colleges USING btree (is_active);


--
-- Name: idx_colleges_active_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_active_rating ON public.colleges USING btree (is_active, rating DESC);


--
-- Name: idx_colleges_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_author ON public.colleges USING btree (author_id);


--
-- Name: idx_colleges_categories; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_categories ON public.colleges USING gin (categories);


--
-- Name: idx_colleges_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_category ON public.colleges USING btree (category);


--
-- Name: idx_colleges_featured_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_featured_rank ON public.colleges USING btree (featured_rank) WHERE (featured_rank IS NOT NULL);


--
-- Name: idx_colleges_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_name_lower ON public.colleges USING btree (lower(name));


--
-- Name: idx_colleges_parent_university_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_parent_university_slug ON public.colleges USING btree (parent_university_slug) WHERE (parent_university_slug IS NOT NULL);


--
-- Name: idx_colleges_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_priority ON public.colleges USING btree (priority DESC);


--
-- Name: idx_colleges_priority_recency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_priority_recency ON public.colleges USING btree (priority DESC, priority_updated_at DESC);


--
-- Name: idx_colleges_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_slug ON public.colleges USING btree (slug);


--
-- Name: idx_colleges_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_state ON public.colleges USING btree (state);


--
-- Name: idx_colleges_state_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_state_city ON public.colleges USING btree (state, city);


--
-- Name: idx_colleges_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_type ON public.colleges USING btree (type);


--
-- Name: idx_courses_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_active ON public.courses USING btree (is_active);


--
-- Name: idx_courses_active_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_active_name ON public.courses USING btree (is_active, name);


--
-- Name: idx_courses_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_author ON public.courses USING btree (author_id);


--
-- Name: idx_courses_categories; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_categories ON public.courses USING gin (categories);


--
-- Name: idx_courses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_category ON public.courses USING btree (category);


--
-- Name: idx_courses_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_level ON public.courses USING btree (level);


--
-- Name: idx_courses_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_mode ON public.courses USING btree (mode);


--
-- Name: idx_courses_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_name_lower ON public.courses USING btree (lower(name));


--
-- Name: idx_courses_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_priority ON public.courses USING btree (priority DESC);


--
-- Name: idx_courses_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_slug ON public.courses USING btree (slug);


--
-- Name: idx_cql_pus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cql_pus ON public.college_quick_links USING btree (program_slug, university_slug, semester_num);


--
-- Name: idx_cres_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cres_subject ON public.college_resources USING btree (subject_id);


--
-- Name: idx_csem_pu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_csem_pu ON public.college_semesters USING btree (program_slug, university_slug);


--
-- Name: idx_csub_pus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_csub_pus ON public.college_subjects USING btree (program_slug, university_slug, semester_num);


--
-- Name: idx_cta_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cta_events_created_at ON public.cta_events USING btree (created_at DESC);


--
-- Name: idx_cta_events_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cta_events_entity ON public.cta_events USING btree (page, entity_slug);


--
-- Name: idx_cta_events_page_cta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cta_events_page_cta ON public.cta_events USING btree (page, cta);


--
-- Name: idx_ctop_pu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctop_pu ON public.college_toppers USING btree (program_slug, university_slug);


--
-- Name: idx_cu_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cu_program ON public.college_universities USING btree (program_slug);


--
-- Name: idx_exams_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_active ON public.exams USING btree (is_active);


--
-- Name: idx_exams_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_author ON public.exams USING btree (author_id);


--
-- Name: idx_exams_categories; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_categories ON public.exams USING gin (categories);


--
-- Name: idx_exams_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_category ON public.exams USING btree (category);


--
-- Name: idx_exams_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_name_lower ON public.exams USING btree (lower(name));


--
-- Name: idx_exams_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_priority ON public.exams USING btree (priority DESC);


--
-- Name: idx_exams_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_slug ON public.exams USING btree (slug);


--
-- Name: idx_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_status ON public.exams USING btree (status);


--
-- Name: idx_exams_top; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_top ON public.exams USING btree (is_top_exam) WHERE (is_top_exam = true);


--
-- Name: idx_featured_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_featured_active_order ON public.featured_colleges USING btree (is_active, display_order);


--
-- Name: idx_intent_alerts_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_alerts_pending ON public.intent_alerts USING btree (delivered, created_at) WHERE (delivered = false);


--
-- Name: idx_intent_alerts_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_alerts_subject ON public.intent_alerts USING btree (subject_type, subject_id);


--
-- Name: idx_intent_events_college; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_events_college ON public.intent_events USING btree (college_slug, occurred_at DESC);


--
-- Name: idx_intent_events_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_events_course ON public.intent_events USING btree (course_slug, occurred_at DESC);


--
-- Name: idx_intent_events_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_events_time ON public.intent_events USING btree (occurred_at DESC);


--
-- Name: idx_intent_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_events_type ON public.intent_events USING btree (event_type, occurred_at DESC);


--
-- Name: idx_intent_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_events_user ON public.intent_events USING btree (user_id, occurred_at DESC);


--
-- Name: idx_intent_events_utm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_events_utm ON public.intent_events USING btree (utm_source, utm_campaign);


--
-- Name: idx_intent_events_visitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_events_visitor ON public.intent_events USING btree (visitor_id, occurred_at DESC);


--
-- Name: idx_intent_hooks_college; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_hooks_college ON public.intent_university_webhooks USING btree (college_slug) WHERE is_active;


--
-- Name: idx_intent_scores_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_scores_category ON public.intent_lead_scores USING btree (category, score DESC);


--
-- Name: idx_intent_scores_college; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_scores_college ON public.intent_lead_scores USING btree (top_college_slug);


--
-- Name: idx_intent_scores_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_scores_lead ON public.intent_lead_scores USING btree (lead_id);


--
-- Name: idx_intent_scores_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_scores_updated ON public.intent_lead_scores USING btree (updated_at DESC);


--
-- Name: idx_intent_visitors_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_visitors_seen ON public.intent_visitors USING btree (last_seen_at DESC);


--
-- Name: idx_intent_visitors_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intent_visitors_user ON public.intent_visitors USING btree (merged_user_id);


--
-- Name: idx_job_apps_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_apps_created ON public.job_applications USING btree (created_at DESC);


--
-- Name: idx_job_apps_job_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_apps_job_slug ON public.job_applications USING btree (job_slug);


--
-- Name: idx_job_apps_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_apps_status ON public.job_applications USING btree (status);


--
-- Name: idx_jobs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_active ON public.jobs USING btree (is_active, posted_at DESC);


--
-- Name: idx_jobs_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_slug ON public.jobs USING btree (slug);


--
-- Name: idx_leads_city_state_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_city_state_course ON public.leads USING btree (city, state, interested_course_slug);


--
-- Name: idx_leads_created_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created_at_desc ON public.leads USING btree (created_at DESC);


--
-- Name: idx_leads_device_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_device_type ON public.leads USING btree (device_type);


--
-- Name: idx_leads_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_email ON public.leads USING btree (email);


--
-- Name: idx_leads_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_phone ON public.leads USING btree (phone);


--
-- Name: idx_leads_program_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_program_mode ON public.leads USING btree (program_mode);


--
-- Name: idx_leads_source_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_source_category ON public.leads USING btree (source_category);


--
-- Name: idx_lp_logs_lead_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_logs_lead_created ON public.lp_push_logs USING btree (lead_id, created_at DESC);


--
-- Name: idx_lp_logs_uni_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_logs_uni_created ON public.lp_push_logs USING btree (university_id, created_at DESC);


--
-- Name: idx_lp_push_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_push_logs_created ON public.lp_push_logs USING btree (created_at DESC);


--
-- Name: idx_lp_push_logs_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_push_logs_lead ON public.lp_push_logs USING btree (lead_id);


--
-- Name: idx_lp_push_logs_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_push_logs_university ON public.lp_push_logs USING btree (university_id);


--
-- Name: idx_lp_rules_active_auto_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_rules_active_auto_priority ON public.lp_automation_rules USING btree (is_active, auto_dispatch, priority);


--
-- Name: idx_popular_places_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_popular_places_active ON public.popular_places USING btree (is_active, display_order);


--
-- Name: idx_promoted_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promoted_active_order ON public.promoted_programs USING btree (is_active, display_order);


--
-- Name: idx_promoted_programs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promoted_programs_category ON public.promoted_programs USING btree (category_slug);


--
-- Name: idx_promoted_programs_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_promoted_programs_slug ON public.promoted_programs USING btree (slug) WHERE (slug <> ''::text);


--
-- Name: idx_push_leads_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_leads_batch ON public.push_leads USING btree (batch_id);


--
-- Name: idx_referrals_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);


--
-- Name: idx_referrals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_status ON public.referrals USING btree (status);


--
-- Name: idx_resources_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resources_chapter ON public.study_resources USING btree (chapter_id, is_active);


--
-- Name: idx_resources_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resources_subject ON public.study_resources USING btree (subject_id, is_active);


--
-- Name: idx_scholarships_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scholarships_author ON public.scholarships USING btree (author_id);


--
-- Name: idx_scholarships_title_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scholarships_title_lower ON public.scholarships USING btree (lower(title));


--
-- Name: idx_states_cities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_states_cities_active ON public.states_cities USING btree (is_active);


--
-- Name: idx_states_cities_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_states_cities_state ON public.states_cities USING btree (state);


--
-- Name: idx_study_board_links_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_board_links_lookup ON public.study_board_links USING btree (board_slug, class_num, display_order);


--
-- Name: idx_study_toppers_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_toppers_lookup ON public.study_toppers USING btree (class_num, board_slug, stream, rank);


--
-- Name: idx_subjects_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_author ON public.study_subjects USING btree (author_id);


--
-- Name: idx_subjects_class_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_class_board ON public.study_subjects USING btree (class_num, board_slug, is_active);


--
-- Name: idx_system_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at DESC);


--
-- Name: idx_system_logs_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_function ON public.system_logs USING btree (function_name, created_at DESC);


--
-- Name: idx_system_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_level ON public.system_logs USING btree (level, created_at DESC);


--
-- Name: idx_user_documents_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_user ON public.user_documents USING btree (user_id);


--
-- Name: idx_user_education_entries_user_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_education_entries_user_level ON public.user_education_entries USING btree (user_id, level, sort_order);


--
-- Name: idx_user_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_events_created ON public.user_events USING btree (created_at DESC);


--
-- Name: idx_user_events_event_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_events_event_path ON public.user_events USING btree (event_type, path);


--
-- Name: idx_user_events_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_events_path ON public.user_events USING btree (path);


--
-- Name: idx_user_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_events_session ON public.user_events USING btree (session_id);


--
-- Name: idx_user_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_events_type ON public.user_events USING btree (event_type);


--
-- Name: idx_user_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_events_user ON public.user_events USING btree (user_id);


--
-- Name: idx_user_favorites_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_slug ON public.user_favorites USING btree (college_slug);


--
-- Name: idx_user_favorites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_user ON public.user_favorites USING btree (user_id);


--
-- Name: idx_user_sessions_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_last_seen ON public.user_sessions USING btree (last_seen_at DESC);


--
-- Name: idx_user_sessions_lead_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_lead_email ON public.user_sessions USING btree (lead_email);


--
-- Name: idx_user_sessions_lead_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_lead_phone ON public.user_sessions USING btree (lead_phone);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_wallet_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_user ON public.wallet_transactions USING btree (user_id);


--
-- Name: team_invites_email_pending_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_invites_email_pending_uk ON public.team_invites USING btree (lower(email)) WHERE ((status = 'pending'::text) AND (email IS NOT NULL));


--
-- Name: team_invites_phone_pending_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_invites_phone_pending_uk ON public.team_invites USING btree (phone) WHERE ((status = 'pending'::text) AND (phone IS NOT NULL));


--
-- Name: uq_article_links_article_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_article_links_article_entity ON public.article_links USING btree (article_id, entity_type, entity_slug);


--
-- Name: uq_user_permissions_user_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_permissions_user_resource ON public.user_permissions USING btree (user_id, resource);


--
-- Name: colleges lock_short_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lock_short_id BEFORE UPDATE ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.prevent_short_id_change();


--
-- Name: courses lock_short_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lock_short_id BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.prevent_short_id_change();


--
-- Name: exams lock_short_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lock_short_id BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.prevent_short_id_change();


--
-- Name: referrals set_referrals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_documents set_user_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_user_documents_updated_at BEFORE UPDATE ON public.user_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_invites team_invites_set_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER team_invites_set_updated BEFORE UPDATE ON public.team_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_scripts trg_ad_scripts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ad_scripts_updated BEFORE UPDATE ON public.ad_scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_units trg_ad_units_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ad_units_updated BEFORE UPDATE ON public.ad_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: adsense_settings trg_adsense_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_adsense_settings_updated BEFORE UPDATE ON public.adsense_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_bodies trg_approval_bodies_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_approval_bodies_updated BEFORE UPDATE ON public.approval_bodies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: article_categories trg_article_categories_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_article_categories_updated BEFORE UPDATE ON public.article_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: articles trg_articles_created_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_articles_created_by BEFORE INSERT ON public.articles FOR EACH ROW EXECUTE FUNCTION public.set_created_by_articles();


--
-- Name: authors trg_authors_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_authors_updated BEFORE UPDATE ON public.authors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: career_profiles trg_career_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_career_profiles_updated BEFORE UPDATE ON public.career_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_few_links trg_cfl_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cfl_upd BEFORE UPDATE ON public.college_few_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_contacts trg_college_contacts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_college_contacts_updated BEFORE UPDATE ON public.college_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_reviews trg_college_reviews_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_college_reviews_updated BEFORE UPDATE ON public.college_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: colleges trg_colleges_priority_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_colleges_priority_touch BEFORE INSERT OR UPDATE OF priority ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.touch_college_priority_updated_at();


--
-- Name: companies trg_companies_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_programs trg_cp_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cp_upd BEFORE UPDATE ON public.college_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_quick_links trg_cql_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cql_upd BEFORE UPDATE ON public.college_quick_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_resources trg_cres_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cres_upd BEFORE UPDATE ON public.college_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_semesters trg_csem_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_csem_upd BEFORE UPDATE ON public.college_semesters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_subjects trg_csub_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_csub_upd BEFORE UPDATE ON public.college_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_toppers trg_ctop_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ctop_upd BEFORE UPDATE ON public.college_toppers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_universities trg_cu_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cu_upd BEFORE UPDATE ON public.college_universities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_providers trg_email_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_email_providers_updated_at BEFORE UPDATE ON public.email_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: faculty trg_faculty_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_faculty_updated BEFORE UPDATE ON public.faculty FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hero_categories trg_hero_categories_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hero_categories_updated BEFORE UPDATE ON public.hero_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hero_settings trg_hero_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hero_settings_updated_at BEFORE UPDATE ON public.hero_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: intent_university_webhooks trg_intent_hooks_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_intent_hooks_updated BEFORE UPDATE ON public.intent_university_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: intent_events trg_intent_on_event_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_intent_on_event_insert BEFORE INSERT ON public.intent_events FOR EACH ROW EXECUTE FUNCTION public.intent_on_event_insert();


--
-- Name: intent_lead_scores trg_intent_scores_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_intent_scores_updated BEFORE UPDATE ON public.intent_lead_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: intent_visitors trg_intent_visitors_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_intent_visitors_updated BEFORE UPDATE ON public.intent_visitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: intent_event_weights trg_intent_weights_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_intent_weights_updated BEFORE UPDATE ON public.intent_event_weights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: landing_pages trg_landing_pages_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_landing_pages_updated BEFORE UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_pages trg_legal_pages_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_legal_pages_updated BEFORE UPDATE ON public.legal_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads trg_lp_dispatch_on_lead_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lp_dispatch_on_lead_insert AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.lp_dispatch_on_lead_insert();


--
-- Name: marketing_automations trg_ma_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ma_updated_at BEFORE UPDATE ON public.marketing_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: multi_push_university_defaults trg_mp_defaults_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mp_defaults_updated BEFORE UPDATE ON public.multi_push_university_defaults FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: multi_push_presets trg_mp_presets_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mp_presets_updated BEFORE UPDATE ON public.multi_push_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: program_categories trg_program_categories_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_program_categories_updated BEFORE UPDATE ON public.program_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: push_landing_pages trg_push_landing_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_push_landing_updated BEFORE UPDATE ON public.push_landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scholarships trg_scholarships_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_scholarships_updated BEFORE UPDATE ON public.scholarships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_integrations trg_site_integrations_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_site_integrations_updated BEFORE UPDATE ON public.site_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stream_categories trg_stream_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stream_categories_updated_at BEFORE UPDATE ON public.stream_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: study_chapters trg_study_chapters_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_study_chapters_updated BEFORE UPDATE ON public.study_chapters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: study_resources trg_study_resources_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_study_resources_updated BEFORE UPDATE ON public.study_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: study_subjects trg_study_subjects_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_study_subjects_updated BEFORE UPDATE ON public.study_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: study_toppers trg_study_toppers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_study_toppers_updated_at BEFORE UPDATE ON public.study_toppers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_users trg_sub_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sub_users_updated_at BEFORE UPDATE ON public.sub_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: colleges trg_touch_college_priority_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_college_priority_updated_at BEFORE INSERT OR UPDATE OF priority ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.touch_college_priority_updated_at();


--
-- Name: universities trg_universities_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_universities_updated BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_education_entries trg_user_education_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_education_entries_updated_at BEFORE UPDATE ON public.user_education_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: article_links trg_validate_article_link; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_article_link BEFORE INSERT OR UPDATE ON public.article_links FOR EACH ROW EXECUTE FUNCTION public.validate_article_link();


--
-- Name: colleges trg_validate_college_affiliation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_college_affiliation BEFORE INSERT OR UPDATE OF affiliation_kind, parent_university_slug, slug ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.validate_college_affiliation();


--
-- Name: colleges trg_validate_college_related_arrays; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_college_related_arrays BEFORE INSERT OR UPDATE OF related_courses, related_exams ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.validate_college_related_arrays();


--
-- Name: ads update_ads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_providers update_ai_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: also_check_modules update_also_check_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_also_check_modules_updated_at BEFORE UPDATE ON public.also_check_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: articles update_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: college_applications update_college_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_college_applications_updated_at BEFORE UPDATE ON public.college_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: colleges update_colleges_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exams update_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: faqs update_faqs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: featured_colleges update_featured_colleges_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_featured_colleges_updated_at BEFORE UPDATE ON public.featured_colleges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hero_banners update_hero_banners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hero_banners_updated_at BEFORE UPDATE ON public.hero_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_applications update_job_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_form_settings update_lead_form_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lead_form_settings_updated_at BEFORE UPDATE ON public.lead_form_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lp_api_keys update_lp_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lp_api_keys_updated_at BEFORE UPDATE ON public.lp_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lp_automation_rules update_lp_automation_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lp_automation_rules_updated_at BEFORE UPDATE ON public.lp_automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lp_batches update_lp_batches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lp_batches_updated_at BEFORE UPDATE ON public.lp_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lp_marketing_flows update_lp_marketing_flows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lp_marketing_flows_updated_at BEFORE UPDATE ON public.lp_marketing_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lp_multi_flows update_lp_multi_flows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lp_multi_flows_updated_at BEFORE UPDATE ON public.lp_multi_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lp_universities update_lp_universities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lp_universities_updated_at BEFORE UPDATE ON public.lp_universities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lp_utm_links update_lp_utm_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lp_utm_links_updated_at BEFORE UPDATE ON public.lp_utm_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: otp_providers update_otp_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_otp_providers_updated_at BEFORE UPDATE ON public.otp_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: popular_places update_popular_places_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_popular_places_updated_at BEFORE UPDATE ON public.popular_places FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: promoted_programs update_promoted_programs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_promoted_programs_updated_at BEFORE UPDATE ON public.promoted_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: study_board_links update_study_board_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_study_board_links_updated_at BEFORE UPDATE ON public.study_board_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trusted_partners update_trusted_partners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trusted_partners_updated_at BEFORE UPDATE ON public.trusted_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_analytics_events ad_analytics_events_ad_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_analytics_events
    ADD CONSTRAINT ad_analytics_events_ad_unit_id_fkey FOREIGN KEY (ad_unit_id) REFERENCES public.ad_units(id) ON DELETE CASCADE;


--
-- Name: article_links article_links_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_links
    ADD CONSTRAINT article_links_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: articles articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: career_profiles career_profiles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_profiles
    ADD CONSTRAINT career_profiles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: college_facilities college_facilities_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_facilities
    ADD CONSTRAINT college_facilities_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities_library(id) ON DELETE CASCADE;


--
-- Name: colleges colleges_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: courses courses_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: exams exams_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: intent_lead_scores intent_lead_scores_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intent_lead_scores
    ADD CONSTRAINT intent_lead_scores_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: job_applications job_applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: placement_records placement_records_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_records
    ADD CONSTRAINT placement_records_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_landing_pages push_landing_pages_preset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_landing_pages
    ADD CONSTRAINT push_landing_pages_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.multi_push_presets(id) ON DELETE SET NULL;


--
-- Name: push_leads push_leads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_leads
    ADD CONSTRAINT push_leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: scholarships scholarships_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: study_chapters study_chapters_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_chapters
    ADD CONSTRAINT study_chapters_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.study_subjects(id) ON DELETE CASCADE;


--
-- Name: study_resources study_resources_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_resources
    ADD CONSTRAINT study_resources_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.study_chapters(id) ON DELETE CASCADE;


--
-- Name: study_resources study_resources_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_resources
    ADD CONSTRAINT study_resources_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.study_subjects(id) ON DELETE CASCADE;


--
-- Name: study_subjects study_subjects_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_subjects
    ADD CONSTRAINT study_subjects_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;


--
-- Name: university_api_keys university_api_keys_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.university_api_keys
    ADD CONSTRAINT university_api_keys_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: upload_batches upload_batches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_batches
    ADD CONSTRAINT upload_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_documents user_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: job_applications Admins can delete applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete applications" ON public.job_applications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_board_links Admins can delete board links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete board links" ON public.study_board_links FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jobs Admins can delete jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete jobs" ON public.jobs FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_logs Admins can delete system logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete system logs" ON public.system_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_board_links Admins can insert board links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert board links" ON public.study_board_links FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jobs Admins can insert jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert jobs" ON public.jobs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_form_settings Admins can insert lead_form_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert lead_form_settings" ON public.lead_form_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_providers Admins can manage ai_providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ai_providers" ON public.ai_providers USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_documents Admins can manage all documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all documents" ON public.user_documents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referrals Admins can manage all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all referrals" ON public.referrals TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: wallet_transactions Admins can manage all transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all transactions" ON public.wallet_transactions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: otp_providers Admins can manage otp_providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage otp_providers" ON public.otp_providers USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: otp_providers Admins can read otp_providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read otp_providers" ON public.otp_providers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_applications Admins can update applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update applications" ON public.job_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_board_links Admins can update board links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update board links" ON public.study_board_links FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jobs Admins can update jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update jobs" ON public.jobs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_form_settings Admins can update lead_form_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update lead_form_settings" ON public.lead_form_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_applications Admins can view all applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all applications" ON public.job_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cta_events Admins can view cta events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view cta events" ON public.cta_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_logs Admins can view system logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view system logs" ON public.system_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_events Admins can view user events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view user events" ON public.user_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_sessions Admins can view user sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view user sessions" ON public.user_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ad_analytics_events Admins delete ad analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete ad analytics" ON public.ad_analytics_events FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: about_founders Admins manage about_founders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage about_founders" ON public.about_founders USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: about_milestones Admins manage about_milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage about_milestones" ON public.about_milestones USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: about_page Admins manage about_page; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage about_page" ON public.about_page USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: about_press Admins manage about_press; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage about_press" ON public.about_press USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: about_stats Admins manage about_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage about_stats" ON public.about_stats USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: about_team Admins manage about_team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage about_team" ON public.about_team USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: about_values Admins manage about_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage about_values" ON public.about_values USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ad_scripts Admins manage ad scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage ad scripts" ON public.ad_scripts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ad_units Admins manage ad units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage ad units" ON public.ad_units USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ads Admins manage ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage ads" ON public.ads USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: adsense_settings Admins manage adsense settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage adsense settings" ON public.adsense_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: also_check_modules Admins manage also_check_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage also_check_modules" ON public.also_check_modules TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_applications Admins manage applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage applications" ON public.college_applications USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: approval_bodies Admins manage approval_bodies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage approval_bodies" ON public.approval_bodies USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: article_categories Admins manage article_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage article_categories" ON public.article_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: article_links Admins manage article_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage article_links" ON public.article_links USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: articles Admins manage articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage articles" ON public.articles USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: authors Admins manage authors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage authors" ON public.authors USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: career_course_links Admins manage career_course_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage career_course_links" ON public.career_course_links USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: career_profiles Admins manage career_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage career_profiles" ON public.career_profiles USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_contacts Admins manage college_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_contacts" ON public.college_contacts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_facilities Admins manage college_facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_facilities" ON public.college_facilities USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_few_links Admins manage college_few_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_few_links" ON public.college_few_links USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_programs Admins manage college_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_programs" ON public.college_programs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_quick_links Admins manage college_quick_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_quick_links" ON public.college_quick_links USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_resources Admins manage college_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_resources" ON public.college_resources USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_semesters Admins manage college_semesters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_semesters" ON public.college_semesters USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_subjects Admins manage college_subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_subjects" ON public.college_subjects USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_toppers Admins manage college_toppers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_toppers" ON public.college_toppers USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_universities Admins manage college_universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage college_universities" ON public.college_universities USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: colleges Admins manage colleges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage colleges" ON public.colleges USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: companies Admins manage companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage companies" ON public.companies USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_fees Admins manage course_fees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage course_fees" ON public.course_fees USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Admins manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage courses" ON public.courses USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_providers Admins manage email providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage email providers" ON public.email_providers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: exams Admins manage exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage exams" ON public.exams USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: facilities_library Admins manage facilities_library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage facilities_library" ON public.facilities_library USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: faculty Admins manage faculty; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage faculty" ON public.faculty USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: faqs Admins manage faqs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage faqs" ON public.faqs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: featured_colleges Admins manage featured_colleges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage featured_colleges" ON public.featured_colleges USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: hero_banners Admins manage hero_banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage hero_banners" ON public.hero_banners USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: hero_categories Admins manage hero_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage hero_categories" ON public.hero_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: hero_settings Admins manage hero_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage hero_settings" ON public.hero_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: landing_pages Admins manage landing_pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage landing_pages" ON public.landing_pages USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: leads Admins manage leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage leads" ON public.leads USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: legal_pages Admins manage legal_pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage legal_pages" ON public.legal_pages USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_api_keys Admins manage lp_api_keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_api_keys" ON public.lp_api_keys USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_automation_rules Admins manage lp_automation_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_automation_rules" ON public.lp_automation_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_batches Admins manage lp_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_batches" ON public.lp_batches USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_marketing_flows Admins manage lp_marketing_flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_marketing_flows" ON public.lp_marketing_flows USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_multi_flows Admins manage lp_multi_flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_multi_flows" ON public.lp_multi_flows USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_push_logs Admins manage lp_push_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_push_logs" ON public.lp_push_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_universities Admins manage lp_universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_universities" ON public.lp_universities USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lp_utm_links Admins manage lp_utm_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage lp_utm_links" ON public.lp_utm_links USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: placement_records Admins manage placement_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage placement_records" ON public.placement_records USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: popular_places Admins manage popular_places; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage popular_places" ON public.popular_places USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: program_categories Admins manage program_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage program_categories" ON public.program_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: promoted_programs Admins manage promoted_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage promoted_programs" ON public.promoted_programs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: review_reports Admins manage review_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage review_reports" ON public.review_reports USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: college_reviews Admins manage reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage reviews" ON public.college_reviews USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scholarships Admins manage scholarships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage scholarships" ON public.scholarships USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_integrations Admins manage site_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage site_integrations" ON public.site_integrations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: states_cities Admins manage states_cities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage states_cities" ON public.states_cities USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stream_categories Admins manage stream_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage stream_categories" ON public.stream_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_boards Admins manage study_boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage study_boards" ON public.study_boards USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_chapters Admins manage study_chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage study_chapters" ON public.study_chapters USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_resources Admins manage study_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage study_resources" ON public.study_resources USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_subjects Admins manage study_subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage study_subjects" ON public.study_subjects USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: study_toppers Admins manage study_toppers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage study_toppers" ON public.study_toppers USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_invites Admins manage team_invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage team_invites" ON public.team_invites TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: trusted_partners Admins manage trusted_partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage trusted_partners" ON public.trusted_partners USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_permissions Admins manage user_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage user_permissions" ON public.user_permissions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ad_analytics_events Admins read ad analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read ad analytics" ON public.ad_analytics_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_log Admins read email log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read email log" ON public.email_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: landing_page_leads Admins read lp leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read lp leads" ON public.landing_page_leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_consent Admins view consent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view consent" ON public.user_consent FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_consent Anyone can insert consent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert consent" ON public.user_consent FOR INSERT WITH CHECK (true);


--
-- Name: cta_events Anyone can insert cta events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert cta events" ON public.cta_events FOR INSERT WITH CHECK (true);


--
-- Name: user_events Anyone can insert user events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert user events" ON public.user_events FOR INSERT WITH CHECK (true);


--
-- Name: ad_scripts Anyone can read active ad scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active ad scripts" ON public.ad_scripts FOR SELECT USING ((is_active = true));


--
-- Name: ad_units Anyone can read active ad units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active ad units" ON public.ad_units FOR SELECT USING ((is_active = true));


--
-- Name: adsense_settings Anyone can read adsense settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read adsense settings" ON public.adsense_settings FOR SELECT USING (true);


--
-- Name: lead_form_settings Anyone can read lead_form_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read lead_form_settings" ON public.lead_form_settings FOR SELECT USING (true);


--
-- Name: ad_analytics_events Anyone can record ad analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can record ad analytics" ON public.ad_analytics_events FOR INSERT WITH CHECK (true);


--
-- Name: job_applications Anyone can submit an application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit an application" ON public.job_applications FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: user_sessions Anyone can upsert user sessions insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can upsert user sessions insert" ON public.user_sessions FOR INSERT WITH CHECK (true);


--
-- Name: study_board_links Anyone can view active board links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active board links" ON public.study_board_links FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: jobs Anyone can view active jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active jobs" ON public.jobs FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: college_reviews Authenticated can create reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can create reviews" ON public.college_reviews FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)));


--
-- Name: sub_users Parent manages own sub_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Parent manages own sub_users" ON public.sub_users USING (((auth.uid() = parent_user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((auth.uid() = parent_user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: college_applications Public can insert applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert applications" ON public.college_applications FOR INSERT WITH CHECK (true);


--
-- Name: review_reports Public can submit report; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can submit report" ON public.review_reports FOR INSERT WITH CHECK (true);


--
-- Name: also_check_modules Public can view enabled also_check_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view enabled also_check_modules" ON public.also_check_modules FOR SELECT USING (true);


--
-- Name: leads Public insert leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public insert leads" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: landing_page_leads Public insert lp leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public insert lp leads" ON public.landing_page_leads FOR INSERT WITH CHECK (true);


--
-- Name: about_founders Public read about_founders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read about_founders" ON public.about_founders FOR SELECT USING (true);


--
-- Name: about_milestones Public read about_milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read about_milestones" ON public.about_milestones FOR SELECT USING (true);


--
-- Name: about_page Public read about_page; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read about_page" ON public.about_page FOR SELECT USING (true);


--
-- Name: about_press Public read about_press; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read about_press" ON public.about_press FOR SELECT USING (true);


--
-- Name: about_stats Public read about_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read about_stats" ON public.about_stats FOR SELECT USING (true);


--
-- Name: about_team Public read about_team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read about_team" ON public.about_team FOR SELECT USING (true);


--
-- Name: about_values Public read about_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read about_values" ON public.about_values FOR SELECT USING (true);


--
-- Name: ads Public read ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read ads" ON public.ads FOR SELECT USING (true);


--
-- Name: ads Public read all ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read all ads" ON public.ads FOR SELECT USING (true);


--
-- Name: approval_bodies Public read approval_bodies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read approval_bodies" ON public.approval_bodies FOR SELECT USING (true);


--
-- Name: college_reviews Public read approved reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read approved reviews" ON public.college_reviews FOR SELECT USING (((status = 'approved'::text) OR (auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: article_categories Public read article_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read article_categories" ON public.article_categories FOR SELECT USING (true);


--
-- Name: article_links Public read article_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read article_links" ON public.article_links FOR SELECT USING (true);


--
-- Name: articles Public read articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read articles" ON public.articles FOR SELECT USING (true);


--
-- Name: authors Public read authors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read authors" ON public.authors FOR SELECT USING (true);


--
-- Name: career_course_links Public read career_course_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read career_course_links" ON public.career_course_links FOR SELECT USING (true);


--
-- Name: career_profiles Public read career_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read career_profiles" ON public.career_profiles FOR SELECT USING (true);


--
-- Name: college_contacts Public read college_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_contacts" ON public.college_contacts FOR SELECT USING (true);


--
-- Name: college_facilities Public read college_facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_facilities" ON public.college_facilities FOR SELECT USING (true);


--
-- Name: college_few_links Public read college_few_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_few_links" ON public.college_few_links FOR SELECT USING (true);


--
-- Name: college_programs Public read college_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_programs" ON public.college_programs FOR SELECT USING (true);


--
-- Name: college_quick_links Public read college_quick_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_quick_links" ON public.college_quick_links FOR SELECT USING (true);


--
-- Name: college_resources Public read college_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_resources" ON public.college_resources FOR SELECT USING (true);


--
-- Name: college_semesters Public read college_semesters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_semesters" ON public.college_semesters FOR SELECT USING (true);


--
-- Name: college_subjects Public read college_subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_subjects" ON public.college_subjects FOR SELECT USING (true);


--
-- Name: college_toppers Public read college_toppers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_toppers" ON public.college_toppers FOR SELECT USING (true);


--
-- Name: college_universities Public read college_universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read college_universities" ON public.college_universities FOR SELECT USING (true);


--
-- Name: colleges Public read colleges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read colleges" ON public.colleges FOR SELECT USING (true);


--
-- Name: companies Public read companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read companies" ON public.companies FOR SELECT USING (true);


--
-- Name: course_fees Public read course_fees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read course_fees" ON public.course_fees FOR SELECT USING (true);


--
-- Name: courses Public read courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);


--
-- Name: exams Public read exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read exams" ON public.exams FOR SELECT USING (true);


--
-- Name: facilities_library Public read facilities_library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read facilities_library" ON public.facilities_library FOR SELECT USING (true);


--
-- Name: faculty Public read faculty; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read faculty" ON public.faculty FOR SELECT USING (true);


--
-- Name: faqs Public read faqs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);


--
-- Name: featured_colleges Public read featured colleges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read featured colleges" ON public.featured_colleges FOR SELECT USING (true);


--
-- Name: hero_banners Public read hero_banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read hero_banners" ON public.hero_banners FOR SELECT USING (true);


--
-- Name: hero_categories Public read hero_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read hero_categories" ON public.hero_categories FOR SELECT USING (true);


--
-- Name: hero_settings Public read hero_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read hero_settings" ON public.hero_settings FOR SELECT USING (true);


--
-- Name: landing_pages Public read landing_pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read landing_pages" ON public.landing_pages FOR SELECT USING (true);


--
-- Name: legal_pages Public read legal_pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read legal_pages" ON public.legal_pages FOR SELECT USING (true);


--
-- Name: placement_records Public read placement_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read placement_records" ON public.placement_records FOR SELECT USING (true);


--
-- Name: placement_records Public read placements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read placements" ON public.placement_records FOR SELECT USING (true);


--
-- Name: popular_places Public read popular_places; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read popular_places" ON public.popular_places FOR SELECT USING (true);


--
-- Name: program_categories Public read program_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read program_categories" ON public.program_categories FOR SELECT USING (true);


--
-- Name: promoted_programs Public read promoted_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read promoted_programs" ON public.promoted_programs FOR SELECT USING (true);


--
-- Name: scholarships Public read scholarships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read scholarships" ON public.scholarships FOR SELECT USING (true);


--
-- Name: site_integrations Public read site_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read site_integrations" ON public.site_integrations FOR SELECT USING (true);


--
-- Name: states_cities Public read states_cities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read states_cities" ON public.states_cities FOR SELECT USING (true);


--
-- Name: stream_categories Public read stream_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read stream_categories" ON public.stream_categories FOR SELECT USING (true);


--
-- Name: study_boards Public read study_boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read study_boards" ON public.study_boards FOR SELECT USING (true);


--
-- Name: study_chapters Public read study_chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read study_chapters" ON public.study_chapters FOR SELECT USING (true);


--
-- Name: study_resources Public read study_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read study_resources" ON public.study_resources FOR SELECT USING (true);


--
-- Name: study_subjects Public read study_subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read study_subjects" ON public.study_subjects FOR SELECT USING (true);


--
-- Name: study_toppers Public read study_toppers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read study_toppers" ON public.study_toppers FOR SELECT USING (true);


--
-- Name: trusted_partners Public read trusted_partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read trusted_partners" ON public.trusted_partners FOR SELECT USING (true);


--
-- Name: user_documents Users can delete own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own documents" ON public.user_documents FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_documents Users can insert own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own documents" ON public.user_documents FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referrals Users can insert own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK ((auth.uid() = referrer_id));


--
-- Name: user_documents Users can read own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own documents" ON public.user_documents FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: referrals Users can read own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own referrals" ON public.referrals FOR SELECT TO authenticated USING ((auth.uid() = referrer_id));


--
-- Name: user_roles Users can read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wallet_transactions Users can read own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_favorites Users delete own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own favorites" ON public.user_favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_favorites Users insert own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own favorites" ON public.user_favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: college_applications Users read own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own applications" ON public.college_applications FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_permissions Users read own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own permissions" ON public.user_permissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: college_reviews Users update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own reviews" ON public.college_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_favorites Users view own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own favorites" ON public.user_favorites FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: about_founders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.about_founders ENABLE ROW LEVEL SECURITY;

--
-- Name: about_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.about_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: about_page; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.about_page ENABLE ROW LEVEL SECURITY;

--
-- Name: about_press; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.about_press ENABLE ROW LEVEL SECURITY;

--
-- Name: about_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.about_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: about_team; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.about_team ENABLE ROW LEVEL SECURITY;

--
-- Name: about_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.about_values ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_scripts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_scripts ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_units ENABLE ROW LEVEL SECURITY;

--
-- Name: api_logs admin all api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all api_logs" ON public.api_logs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings admin all app_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all app_settings" ON public.app_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_specializations admin all course_specializations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all course_specializations" ON public.course_specializations TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: custom_column_values admin all custom_column_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all custom_column_values" ON public.custom_column_values TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: custom_columns admin all custom_columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all custom_columns" ON public.custom_columns TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: multi_push_university_defaults admin all mp_defaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all mp_defaults" ON public.multi_push_university_defaults TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: multi_push_presets admin all mp_presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all mp_presets" ON public.multi_push_presets TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: programs admin all programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all programs" ON public.programs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: push_landing_pages admin all push_landing_pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all push_landing_pages" ON public.push_landing_pages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: push_leads admin all push_leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all push_leads" ON public.push_leads TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: state_cities admin all state_cities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all state_cities" ON public.state_cities TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: universities admin all universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all universities" ON public.universities TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: university_api_keys admin all university_api_keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all university_api_keys" ON public.university_api_keys TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: upload_batches admin all upload_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin all upload_batches" ON public.upload_batches TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_toggles admin write feature_toggles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin write feature_toggles" ON public.feature_toggles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_permissions admin write user_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin write user_permissions" ON public.user_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_crm_exports admins insert exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins insert exports" ON public.intent_crm_exports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: marketing_automations admins manage automations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage automations" ON public.marketing_automations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_lead_scores admins manage scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage scores" ON public.intent_lead_scores TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_visitors admins manage visitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage visitors" ON public.intent_visitors TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_university_webhooks admins manage webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage webhooks" ON public.intent_university_webhooks TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_event_weights admins manage weights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage weights" ON public.intent_event_weights TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_alerts admins read alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins read alerts" ON public.intent_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_events admins read events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins read events" ON public.intent_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_crm_exports admins read exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins read exports" ON public.intent_crm_exports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: intent_alerts admins update alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins update alerts" ON public.intent_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

--
-- Name: adsense_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.adsense_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: also_check_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.also_check_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions anon update unowned session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon update unowned session" ON public.user_sessions FOR UPDATE TO anon USING ((user_id IS NULL)) WITH CHECK ((user_id IS NULL));


--
-- Name: intent_visitors anon update unowned visitor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon update unowned visitor" ON public.intent_visitors FOR UPDATE TO anon USING ((merged_user_id IS NULL)) WITH CHECK ((merged_user_id IS NULL));


--
-- Name: intent_visitors anyone can insert visitor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can insert visitor" ON public.intent_visitors FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: intent_visitors anyone can select visitor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone can select visitor" ON public.intent_visitors FOR SELECT TO authenticated, anon USING (true);


--
-- Name: intent_events anyone insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone insert events" ON public.intent_events FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: app_settings anyone read app_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone read app_settings" ON public.app_settings FOR SELECT USING (true);


--
-- Name: feature_toggles anyone read feature_toggles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anyone read feature_toggles" ON public.feature_toggles FOR SELECT USING (true);


--
-- Name: api_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_bodies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_bodies ENABLE ROW LEVEL SECURITY;

--
-- Name: article_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: article_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_links ENABLE ROW LEVEL SECURITY;

--
-- Name: articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_visitors auth update own or unowned visitor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth update own or unowned visitor" ON public.intent_visitors FOR UPDATE TO authenticated USING (((merged_user_id IS NULL) OR (auth.uid() = merged_user_id))) WITH CHECK (((merged_user_id IS NULL) OR (auth.uid() = merged_user_id)));


--
-- Name: user_sessions auth update own session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth update own session" ON public.user_sessions FOR UPDATE TO authenticated USING (((user_id IS NULL) OR (auth.uid() = user_id))) WITH CHECK (((user_id IS NULL) OR (auth.uid() = user_id)));


--
-- Name: authors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

--
-- Name: career_course_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.career_course_links ENABLE ROW LEVEL SECURITY;

--
-- Name: career_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: college_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: college_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: college_facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: college_few_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_few_links ENABLE ROW LEVEL SECURITY;

--
-- Name: college_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_programs ENABLE ROW LEVEL SECURITY;

--
-- Name: college_quick_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_quick_links ENABLE ROW LEVEL SECURITY;

--
-- Name: college_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: college_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: college_semesters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_semesters ENABLE ROW LEVEL SECURITY;

--
-- Name: college_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: college_toppers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_toppers ENABLE ROW LEVEL SECURITY;

--
-- Name: college_universities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.college_universities ENABLE ROW LEVEL SECURITY;

--
-- Name: colleges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: course_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: course_specializations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_specializations ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: cta_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_column_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_column_values ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: email_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

--
-- Name: email_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

--
-- Name: facilities_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facilities_library ENABLE ROW LEVEL SECURITY;

--
-- Name: faculty; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

--
-- Name: faqs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_toggles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

--
-- Name: featured_colleges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.featured_colleges ENABLE ROW LEVEL SECURITY;

--
-- Name: hero_banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

--
-- Name: hero_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hero_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: hero_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intent_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_crm_exports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intent_crm_exports ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_event_weights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intent_event_weights ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intent_events ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_lead_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intent_lead_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_university_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intent_university_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_visitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intent_visitors ENABLE ROW LEVEL SECURITY;

--
-- Name: job_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_page_leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_form_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_form_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_automation_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_automation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_marketing_flows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_marketing_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_multi_flows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_multi_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_push_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_push_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_universities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_universities ENABLE ROW LEVEL SECURITY;

--
-- Name: lp_utm_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lp_utm_links ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_automations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

--
-- Name: multi_push_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.multi_push_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: multi_push_university_defaults; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.multi_push_university_defaults ENABLE ROW LEVEL SECURITY;

--
-- Name: otp_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otp_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: placement_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.placement_records ENABLE ROW LEVEL SECURITY;

--
-- Name: popular_places; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.popular_places ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: program_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

--
-- Name: promoted_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promoted_programs ENABLE ROW LEVEL SECURITY;

--
-- Name: intent_event_weights public read weights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read weights" ON public.intent_event_weights FOR SELECT TO authenticated, anon USING (true);


--
-- Name: push_landing_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_landing_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: push_leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_leads ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: review_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: scholarships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions self read user_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "self read user_permissions" ON public.user_permissions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: site_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: state_cities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.state_cities ENABLE ROW LEVEL SECURITY;

--
-- Name: states_cities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.states_cities ENABLE ROW LEVEL SECURITY;

--
-- Name: stream_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stream_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: study_board_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_board_links ENABLE ROW LEVEL SECURITY;

--
-- Name: study_boards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_boards ENABLE ROW LEVEL SECURITY;

--
-- Name: study_chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: study_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: study_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: study_toppers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_toppers ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_users ENABLE ROW LEVEL SECURITY;

--
-- Name: system_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: trusted_partners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trusted_partners ENABLE ROW LEVEL SECURITY;

--
-- Name: universities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

--
-- Name: university_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.university_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: upload_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: user_consent; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

--
-- Name: user_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: user_education_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_education_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: user_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

--
-- Name: user_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_education_entries users manage own education entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users manage own education entries" ON public.user_education_entries TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO sandbox_exec;


--
-- Name: FUNCTION clear_featured_rank(_table text, _id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.clear_featured_rank(_table text, _id uuid) TO anon;
GRANT ALL ON FUNCTION public.clear_featured_rank(_table text, _id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.clear_featured_rank(_table text, _id uuid) TO service_role;
GRANT ALL ON FUNCTION public.clear_featured_rank(_table text, _id uuid) TO sandbox_exec;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO sandbox_exec;


--
-- Name: FUNCTION has_permission(_user_id uuid, _resource text, _action text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_permission(_user_id uuid, _resource text, _action text) TO anon;
GRANT ALL ON FUNCTION public.has_permission(_user_id uuid, _resource text, _action text) TO authenticated;
GRANT ALL ON FUNCTION public.has_permission(_user_id uuid, _resource text, _action text) TO service_role;
GRANT ALL ON FUNCTION public.has_permission(_user_id uuid, _resource text, _action text) TO sandbox_exec;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO sandbox_exec;


--
-- Name: FUNCTION increment_batch_duplicate(batch_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_batch_duplicate(batch_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_batch_duplicate(batch_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_batch_duplicate(batch_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.increment_batch_duplicate(batch_uuid uuid) TO sandbox_exec;


--
-- Name: FUNCTION increment_batch_fail(batch_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_batch_fail(batch_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_batch_fail(batch_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_batch_fail(batch_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.increment_batch_fail(batch_uuid uuid) TO sandbox_exec;


--
-- Name: FUNCTION increment_batch_success(batch_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_batch_success(batch_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_batch_success(batch_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_batch_success(batch_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.increment_batch_success(batch_uuid uuid) TO sandbox_exec;


--
-- Name: FUNCTION increment_push_landing_submission(lp_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_push_landing_submission(lp_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_push_landing_submission(lp_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_push_landing_submission(lp_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.increment_push_landing_submission(lp_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION intent_category_for(_score integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.intent_category_for(_score integer) TO anon;
GRANT ALL ON FUNCTION public.intent_category_for(_score integer) TO authenticated;
GRANT ALL ON FUNCTION public.intent_category_for(_score integer) TO service_role;
GRANT ALL ON FUNCTION public.intent_category_for(_score integer) TO sandbox_exec;


--
-- Name: FUNCTION intent_merge_visitor(_visitor_id uuid, _user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.intent_merge_visitor(_visitor_id uuid, _user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.intent_merge_visitor(_visitor_id uuid, _user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.intent_merge_visitor(_visitor_id uuid, _user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.intent_merge_visitor(_visitor_id uuid, _user_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION intent_on_event_insert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.intent_on_event_insert() TO anon;
GRANT ALL ON FUNCTION public.intent_on_event_insert() TO authenticated;
GRANT ALL ON FUNCTION public.intent_on_event_insert() TO service_role;
GRANT ALL ON FUNCTION public.intent_on_event_insert() TO sandbox_exec;


--
-- Name: FUNCTION list_public_tables(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.list_public_tables() TO anon;
GRANT ALL ON FUNCTION public.list_public_tables() TO authenticated;
GRANT ALL ON FUNCTION public.list_public_tables() TO service_role;
GRANT ALL ON FUNCTION public.list_public_tables() TO sandbox_exec;


--
-- Name: FUNCTION lp_dispatch_on_lead_insert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.lp_dispatch_on_lead_insert() TO anon;
GRANT ALL ON FUNCTION public.lp_dispatch_on_lead_insert() TO authenticated;
GRANT ALL ON FUNCTION public.lp_dispatch_on_lead_insert() TO service_role;
GRANT ALL ON FUNCTION public.lp_dispatch_on_lead_insert() TO sandbox_exec;


--
-- Name: FUNCTION lp_increment_batch_duplicate(batch_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.lp_increment_batch_duplicate(batch_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.lp_increment_batch_duplicate(batch_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.lp_increment_batch_duplicate(batch_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.lp_increment_batch_duplicate(batch_uuid uuid) TO sandbox_exec;


--
-- Name: FUNCTION lp_increment_batch_fail(batch_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.lp_increment_batch_fail(batch_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.lp_increment_batch_fail(batch_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.lp_increment_batch_fail(batch_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.lp_increment_batch_fail(batch_uuid uuid) TO sandbox_exec;


--
-- Name: FUNCTION lp_increment_batch_success(batch_uuid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.lp_increment_batch_success(batch_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.lp_increment_batch_success(batch_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.lp_increment_batch_success(batch_uuid uuid) TO service_role;
GRANT ALL ON FUNCTION public.lp_increment_batch_success(batch_uuid uuid) TO sandbox_exec;


--
-- Name: FUNCTION prevent_short_id_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.prevent_short_id_change() TO anon;
GRANT ALL ON FUNCTION public.prevent_short_id_change() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_short_id_change() TO service_role;
GRANT ALL ON FUNCTION public.prevent_short_id_change() TO sandbox_exec;


--
-- Name: FUNCTION set_created_by_articles(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_created_by_articles() TO anon;
GRANT ALL ON FUNCTION public.set_created_by_articles() TO authenticated;
GRANT ALL ON FUNCTION public.set_created_by_articles() TO service_role;
GRANT ALL ON FUNCTION public.set_created_by_articles() TO sandbox_exec;


--
-- Name: FUNCTION set_featured_rank(_table text, _id uuid, _rank integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_featured_rank(_table text, _id uuid, _rank integer) TO anon;
GRANT ALL ON FUNCTION public.set_featured_rank(_table text, _id uuid, _rank integer) TO authenticated;
GRANT ALL ON FUNCTION public.set_featured_rank(_table text, _id uuid, _rank integer) TO service_role;
GRANT ALL ON FUNCTION public.set_featured_rank(_table text, _id uuid, _rank integer) TO sandbox_exec;


--
-- Name: FUNCTION touch_college_priority_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.touch_college_priority_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_college_priority_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_college_priority_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.touch_college_priority_updated_at() TO sandbox_exec;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO sandbox_exec;


--
-- Name: FUNCTION validate_article_link(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_article_link() TO anon;
GRANT ALL ON FUNCTION public.validate_article_link() TO authenticated;
GRANT ALL ON FUNCTION public.validate_article_link() TO service_role;
GRANT ALL ON FUNCTION public.validate_article_link() TO sandbox_exec;


--
-- Name: FUNCTION validate_college_affiliation(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_college_affiliation() TO anon;
GRANT ALL ON FUNCTION public.validate_college_affiliation() TO authenticated;
GRANT ALL ON FUNCTION public.validate_college_affiliation() TO service_role;
GRANT ALL ON FUNCTION public.validate_college_affiliation() TO sandbox_exec;


--
-- Name: FUNCTION validate_college_related_arrays(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_college_related_arrays() TO anon;
GRANT ALL ON FUNCTION public.validate_college_related_arrays() TO authenticated;
GRANT ALL ON FUNCTION public.validate_college_related_arrays() TO service_role;
GRANT ALL ON FUNCTION public.validate_college_related_arrays() TO sandbox_exec;


--
-- Name: TABLE about_founders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.about_founders TO anon;
GRANT ALL ON TABLE public.about_founders TO authenticated;
GRANT ALL ON TABLE public.about_founders TO service_role;
GRANT SELECT,INSERT ON TABLE public.about_founders TO sandbox_exec;


--
-- Name: TABLE about_milestones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.about_milestones TO anon;
GRANT ALL ON TABLE public.about_milestones TO authenticated;
GRANT ALL ON TABLE public.about_milestones TO service_role;
GRANT SELECT,INSERT ON TABLE public.about_milestones TO sandbox_exec;


--
-- Name: TABLE about_page; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.about_page TO anon;
GRANT ALL ON TABLE public.about_page TO authenticated;
GRANT ALL ON TABLE public.about_page TO service_role;
GRANT SELECT,INSERT ON TABLE public.about_page TO sandbox_exec;


--
-- Name: TABLE about_press; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.about_press TO anon;
GRANT ALL ON TABLE public.about_press TO authenticated;
GRANT ALL ON TABLE public.about_press TO service_role;
GRANT SELECT,INSERT ON TABLE public.about_press TO sandbox_exec;


--
-- Name: TABLE about_stats; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.about_stats TO anon;
GRANT ALL ON TABLE public.about_stats TO authenticated;
GRANT ALL ON TABLE public.about_stats TO service_role;
GRANT SELECT,INSERT ON TABLE public.about_stats TO sandbox_exec;


--
-- Name: TABLE about_team; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.about_team TO anon;
GRANT ALL ON TABLE public.about_team TO authenticated;
GRANT ALL ON TABLE public.about_team TO service_role;
GRANT SELECT,INSERT ON TABLE public.about_team TO sandbox_exec;


--
-- Name: TABLE about_values; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.about_values TO anon;
GRANT ALL ON TABLE public.about_values TO authenticated;
GRANT ALL ON TABLE public.about_values TO service_role;
GRANT SELECT,INSERT ON TABLE public.about_values TO sandbox_exec;


--
-- Name: TABLE ad_analytics_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_analytics_events TO anon;
GRANT ALL ON TABLE public.ad_analytics_events TO authenticated;
GRANT ALL ON TABLE public.ad_analytics_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.ad_analytics_events TO sandbox_exec;


--
-- Name: TABLE ad_scripts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_scripts TO anon;
GRANT ALL ON TABLE public.ad_scripts TO authenticated;
GRANT ALL ON TABLE public.ad_scripts TO service_role;
GRANT SELECT,INSERT ON TABLE public.ad_scripts TO sandbox_exec;


--
-- Name: TABLE ad_units; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ad_units TO anon;
GRANT ALL ON TABLE public.ad_units TO authenticated;
GRANT ALL ON TABLE public.ad_units TO service_role;
GRANT SELECT,INSERT ON TABLE public.ad_units TO sandbox_exec;


--
-- Name: TABLE ads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ads TO anon;
GRANT ALL ON TABLE public.ads TO authenticated;
GRANT ALL ON TABLE public.ads TO service_role;
GRANT SELECT,INSERT ON TABLE public.ads TO sandbox_exec;


--
-- Name: TABLE adsense_settings; Type: ACL; Schema: public; Owner: -
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.adsense_settings TO anon;
GRANT ALL ON TABLE public.adsense_settings TO authenticated;
GRANT ALL ON TABLE public.adsense_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.adsense_settings TO sandbox_exec;


--
-- Name: COLUMN adsense_settings.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(id) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.publisher_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(publisher_id) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(publisher_id) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.client_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(client_id) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(client_id) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.account_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(account_id) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(account_id) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.verification_meta; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(verification_meta) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(verification_meta) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.auto_ads_enabled; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(auto_ads_enabled) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(auto_ads_enabled) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.ads_globally_enabled; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ads_globally_enabled) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(ads_globally_enabled) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.enabled_on_mobile; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(enabled_on_mobile) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(enabled_on_mobile) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.enabled_on_desktop; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(enabled_on_desktop) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(enabled_on_desktop) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.enabled_for_guests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(enabled_for_guests) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(enabled_for_guests) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.enabled_for_logged_in; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(enabled_for_logged_in) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(enabled_for_logged_in) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.disabled_roles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(disabled_roles) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(disabled_roles) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.disabled_pages; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(disabled_pages) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(disabled_pages) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.ads_per_page_limit; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(ads_per_page_limit) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(ads_per_page_limit) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.lazy_load_enabled; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(lazy_load_enabled) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(lazy_load_enabled) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.refresh_interval_seconds; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(refresh_interval_seconds) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(refresh_interval_seconds) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.head_scripts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(head_scripts) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(head_scripts) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.body_scripts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(body_scripts) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(body_scripts) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.footer_scripts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(footer_scripts) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(footer_scripts) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.custom_css; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(custom_css) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(custom_css) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.custom_js; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(custom_js) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(custom_js) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(created_at) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: COLUMN adsense_settings.updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(updated_at) ON TABLE public.adsense_settings TO anon;
GRANT SELECT(updated_at) ON TABLE public.adsense_settings TO authenticated;


--
-- Name: TABLE ai_providers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_providers TO anon;
GRANT ALL ON TABLE public.ai_providers TO authenticated;
GRANT ALL ON TABLE public.ai_providers TO service_role;
GRANT SELECT,INSERT ON TABLE public.ai_providers TO sandbox_exec;


--
-- Name: TABLE also_check_modules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.also_check_modules TO anon;
GRANT ALL ON TABLE public.also_check_modules TO authenticated;
GRANT ALL ON TABLE public.also_check_modules TO service_role;
GRANT SELECT,INSERT ON TABLE public.also_check_modules TO sandbox_exec;


--
-- Name: TABLE api_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.api_logs TO anon;
GRANT ALL ON TABLE public.api_logs TO authenticated;
GRANT ALL ON TABLE public.api_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.api_logs TO sandbox_exec;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.app_settings TO sandbox_exec;


--
-- Name: TABLE approval_bodies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.approval_bodies TO anon;
GRANT ALL ON TABLE public.approval_bodies TO authenticated;
GRANT ALL ON TABLE public.approval_bodies TO service_role;
GRANT SELECT,INSERT ON TABLE public.approval_bodies TO sandbox_exec;


--
-- Name: TABLE article_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.article_categories TO anon;
GRANT ALL ON TABLE public.article_categories TO authenticated;
GRANT ALL ON TABLE public.article_categories TO service_role;
GRANT SELECT,INSERT ON TABLE public.article_categories TO sandbox_exec;


--
-- Name: TABLE article_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.article_links TO anon;
GRANT ALL ON TABLE public.article_links TO authenticated;
GRANT ALL ON TABLE public.article_links TO service_role;
GRANT SELECT,INSERT ON TABLE public.article_links TO sandbox_exec;


--
-- Name: TABLE articles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.articles TO anon;
GRANT ALL ON TABLE public.articles TO authenticated;
GRANT ALL ON TABLE public.articles TO service_role;
GRANT SELECT,INSERT ON TABLE public.articles TO sandbox_exec;


--
-- Name: TABLE authors; Type: ACL; Schema: public; Owner: -
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.authors TO anon;
GRANT ALL ON TABLE public.authors TO authenticated;
GRANT ALL ON TABLE public.authors TO service_role;
GRANT SELECT,INSERT ON TABLE public.authors TO sandbox_exec;


--
-- Name: COLUMN authors.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.slug; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(slug) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.name; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(name) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.designation; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(designation) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.photo; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(photo) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.short_bio; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(short_bio) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.bio; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(bio) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.expertise; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(expertise) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.linkedin_url; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(linkedin_url) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.twitter_url; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(twitter_url) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.website_url; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(website_url) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.display_order; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(display_order) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.is_active; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(is_active) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.created_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(created_at) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.updated_at; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(updated_at) ON TABLE public.authors TO anon;


--
-- Name: COLUMN authors.user_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(user_id) ON TABLE public.authors TO anon;


--
-- Name: TABLE career_course_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.career_course_links TO anon;
GRANT ALL ON TABLE public.career_course_links TO authenticated;
GRANT ALL ON TABLE public.career_course_links TO service_role;
GRANT SELECT,INSERT ON TABLE public.career_course_links TO sandbox_exec;


--
-- Name: TABLE career_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.career_profiles TO anon;
GRANT ALL ON TABLE public.career_profiles TO authenticated;
GRANT ALL ON TABLE public.career_profiles TO service_role;
GRANT SELECT,INSERT ON TABLE public.career_profiles TO sandbox_exec;


--
-- Name: TABLE college_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_applications TO anon;
GRANT ALL ON TABLE public.college_applications TO authenticated;
GRANT ALL ON TABLE public.college_applications TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_applications TO sandbox_exec;


--
-- Name: TABLE college_contacts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_contacts TO anon;
GRANT ALL ON TABLE public.college_contacts TO authenticated;
GRANT ALL ON TABLE public.college_contacts TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_contacts TO sandbox_exec;


--
-- Name: TABLE college_facilities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_facilities TO anon;
GRANT ALL ON TABLE public.college_facilities TO authenticated;
GRANT ALL ON TABLE public.college_facilities TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_facilities TO sandbox_exec;


--
-- Name: TABLE college_few_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_few_links TO anon;
GRANT ALL ON TABLE public.college_few_links TO authenticated;
GRANT ALL ON TABLE public.college_few_links TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_few_links TO sandbox_exec;


--
-- Name: TABLE college_programs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_programs TO anon;
GRANT ALL ON TABLE public.college_programs TO authenticated;
GRANT ALL ON TABLE public.college_programs TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_programs TO sandbox_exec;


--
-- Name: TABLE college_quick_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_quick_links TO anon;
GRANT ALL ON TABLE public.college_quick_links TO authenticated;
GRANT ALL ON TABLE public.college_quick_links TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_quick_links TO sandbox_exec;


--
-- Name: TABLE college_resources; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_resources TO anon;
GRANT ALL ON TABLE public.college_resources TO authenticated;
GRANT ALL ON TABLE public.college_resources TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_resources TO sandbox_exec;


--
-- Name: TABLE college_reviews; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_reviews TO anon;
GRANT ALL ON TABLE public.college_reviews TO authenticated;
GRANT ALL ON TABLE public.college_reviews TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_reviews TO sandbox_exec;


--
-- Name: TABLE college_semesters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_semesters TO anon;
GRANT ALL ON TABLE public.college_semesters TO authenticated;
GRANT ALL ON TABLE public.college_semesters TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_semesters TO sandbox_exec;


--
-- Name: TABLE college_subjects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_subjects TO anon;
GRANT ALL ON TABLE public.college_subjects TO authenticated;
GRANT ALL ON TABLE public.college_subjects TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_subjects TO sandbox_exec;


--
-- Name: TABLE college_toppers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_toppers TO anon;
GRANT ALL ON TABLE public.college_toppers TO authenticated;
GRANT ALL ON TABLE public.college_toppers TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_toppers TO sandbox_exec;


--
-- Name: TABLE college_universities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.college_universities TO anon;
GRANT ALL ON TABLE public.college_universities TO authenticated;
GRANT ALL ON TABLE public.college_universities TO service_role;
GRANT SELECT,INSERT ON TABLE public.college_universities TO sandbox_exec;


--
-- Name: SEQUENCE colleges_short_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.colleges_short_id_seq TO anon;
GRANT ALL ON SEQUENCE public.colleges_short_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.colleges_short_id_seq TO service_role;
GRANT SELECT,USAGE ON SEQUENCE public.colleges_short_id_seq TO sandbox_exec;


--
-- Name: TABLE colleges; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.colleges TO anon;
GRANT ALL ON TABLE public.colleges TO authenticated;
GRANT ALL ON TABLE public.colleges TO service_role;
GRANT SELECT,INSERT ON TABLE public.colleges TO sandbox_exec;


--
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;
GRANT SELECT,INSERT ON TABLE public.companies TO sandbox_exec;


--
-- Name: TABLE course_fees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_fees TO anon;
GRANT ALL ON TABLE public.course_fees TO authenticated;
GRANT ALL ON TABLE public.course_fees TO service_role;
GRANT SELECT,INSERT ON TABLE public.course_fees TO sandbox_exec;


--
-- Name: TABLE course_specializations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_specializations TO anon;
GRANT ALL ON TABLE public.course_specializations TO authenticated;
GRANT ALL ON TABLE public.course_specializations TO service_role;
GRANT SELECT,INSERT ON TABLE public.course_specializations TO sandbox_exec;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;
GRANT SELECT,INSERT ON TABLE public.courses TO sandbox_exec;


--
-- Name: SEQUENCE courses_short_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.courses_short_id_seq TO anon;
GRANT ALL ON SEQUENCE public.courses_short_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.courses_short_id_seq TO service_role;
GRANT SELECT,USAGE ON SEQUENCE public.courses_short_id_seq TO sandbox_exec;


--
-- Name: TABLE cta_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cta_events TO anon;
GRANT ALL ON TABLE public.cta_events TO authenticated;
GRANT ALL ON TABLE public.cta_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.cta_events TO sandbox_exec;


--
-- Name: TABLE custom_column_values; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.custom_column_values TO anon;
GRANT ALL ON TABLE public.custom_column_values TO authenticated;
GRANT ALL ON TABLE public.custom_column_values TO service_role;
GRANT SELECT,INSERT ON TABLE public.custom_column_values TO sandbox_exec;


--
-- Name: TABLE custom_columns; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.custom_columns TO anon;
GRANT ALL ON TABLE public.custom_columns TO authenticated;
GRANT ALL ON TABLE public.custom_columns TO service_role;
GRANT SELECT,INSERT ON TABLE public.custom_columns TO sandbox_exec;


--
-- Name: TABLE email_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_log TO anon;
GRANT ALL ON TABLE public.email_log TO authenticated;
GRANT ALL ON TABLE public.email_log TO service_role;
GRANT SELECT,INSERT ON TABLE public.email_log TO sandbox_exec;


--
-- Name: TABLE email_providers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_providers TO anon;
GRANT ALL ON TABLE public.email_providers TO authenticated;
GRANT ALL ON TABLE public.email_providers TO service_role;
GRANT SELECT,INSERT ON TABLE public.email_providers TO sandbox_exec;


--
-- Name: TABLE exams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.exams TO anon;
GRANT ALL ON TABLE public.exams TO authenticated;
GRANT ALL ON TABLE public.exams TO service_role;
GRANT SELECT,INSERT ON TABLE public.exams TO sandbox_exec;


--
-- Name: SEQUENCE exams_short_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.exams_short_id_seq TO anon;
GRANT ALL ON SEQUENCE public.exams_short_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.exams_short_id_seq TO service_role;
GRANT SELECT,USAGE ON SEQUENCE public.exams_short_id_seq TO sandbox_exec;


--
-- Name: TABLE facilities_library; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.facilities_library TO anon;
GRANT ALL ON TABLE public.facilities_library TO authenticated;
GRANT ALL ON TABLE public.facilities_library TO service_role;
GRANT SELECT,INSERT ON TABLE public.facilities_library TO sandbox_exec;


--
-- Name: TABLE faculty; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faculty TO anon;
GRANT ALL ON TABLE public.faculty TO authenticated;
GRANT ALL ON TABLE public.faculty TO service_role;
GRANT SELECT,INSERT ON TABLE public.faculty TO sandbox_exec;


--
-- Name: TABLE faqs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faqs TO anon;
GRANT ALL ON TABLE public.faqs TO authenticated;
GRANT ALL ON TABLE public.faqs TO service_role;
GRANT SELECT,INSERT ON TABLE public.faqs TO sandbox_exec;


--
-- Name: TABLE feature_toggles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feature_toggles TO anon;
GRANT ALL ON TABLE public.feature_toggles TO authenticated;
GRANT ALL ON TABLE public.feature_toggles TO service_role;
GRANT SELECT,INSERT ON TABLE public.feature_toggles TO sandbox_exec;


--
-- Name: TABLE featured_colleges; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.featured_colleges TO anon;
GRANT ALL ON TABLE public.featured_colleges TO authenticated;
GRANT ALL ON TABLE public.featured_colleges TO service_role;
GRANT SELECT,INSERT ON TABLE public.featured_colleges TO sandbox_exec;


--
-- Name: TABLE hero_banners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hero_banners TO anon;
GRANT ALL ON TABLE public.hero_banners TO authenticated;
GRANT ALL ON TABLE public.hero_banners TO service_role;
GRANT SELECT,INSERT ON TABLE public.hero_banners TO sandbox_exec;


--
-- Name: TABLE hero_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hero_categories TO anon;
GRANT ALL ON TABLE public.hero_categories TO authenticated;
GRANT ALL ON TABLE public.hero_categories TO service_role;
GRANT SELECT,INSERT ON TABLE public.hero_categories TO sandbox_exec;


--
-- Name: TABLE hero_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hero_settings TO anon;
GRANT ALL ON TABLE public.hero_settings TO authenticated;
GRANT ALL ON TABLE public.hero_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.hero_settings TO sandbox_exec;


--
-- Name: TABLE intent_alerts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intent_alerts TO anon;
GRANT ALL ON TABLE public.intent_alerts TO authenticated;
GRANT ALL ON TABLE public.intent_alerts TO service_role;
GRANT SELECT,INSERT ON TABLE public.intent_alerts TO sandbox_exec;


--
-- Name: TABLE intent_crm_exports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intent_crm_exports TO anon;
GRANT ALL ON TABLE public.intent_crm_exports TO authenticated;
GRANT ALL ON TABLE public.intent_crm_exports TO service_role;
GRANT SELECT,INSERT ON TABLE public.intent_crm_exports TO sandbox_exec;


--
-- Name: TABLE intent_event_weights; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intent_event_weights TO anon;
GRANT ALL ON TABLE public.intent_event_weights TO authenticated;
GRANT ALL ON TABLE public.intent_event_weights TO service_role;
GRANT SELECT,INSERT ON TABLE public.intent_event_weights TO sandbox_exec;


--
-- Name: TABLE intent_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intent_events TO anon;
GRANT ALL ON TABLE public.intent_events TO authenticated;
GRANT ALL ON TABLE public.intent_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.intent_events TO sandbox_exec;


--
-- Name: SEQUENCE intent_events_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.intent_events_id_seq TO anon;
GRANT ALL ON SEQUENCE public.intent_events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.intent_events_id_seq TO service_role;
GRANT SELECT,USAGE ON SEQUENCE public.intent_events_id_seq TO sandbox_exec;


--
-- Name: TABLE intent_lead_scores; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intent_lead_scores TO anon;
GRANT ALL ON TABLE public.intent_lead_scores TO authenticated;
GRANT ALL ON TABLE public.intent_lead_scores TO service_role;
GRANT SELECT,INSERT ON TABLE public.intent_lead_scores TO sandbox_exec;


--
-- Name: TABLE intent_university_webhooks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.intent_university_webhooks TO anon;
GRANT ALL ON TABLE public.intent_university_webhooks TO authenticated;
GRANT ALL ON TABLE public.intent_university_webhooks TO service_role;
GRANT SELECT,INSERT ON TABLE public.intent_university_webhooks TO sandbox_exec;


--
-- Name: TABLE intent_visitors; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.intent_visitors TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.intent_visitors TO authenticated;
GRANT ALL ON TABLE public.intent_visitors TO service_role;
GRANT SELECT,INSERT ON TABLE public.intent_visitors TO sandbox_exec;


--
-- Name: COLUMN intent_visitors.last_seen_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(last_seen_at) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(last_seen_at) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.device_type; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(device_type) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(device_type) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.city; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(city) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(city) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.state; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(state) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(state) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.country; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(country) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(country) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.user_agent; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(user_agent) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(user_agent) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.utm; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(utm) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(utm) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.referrer; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(referrer) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(referrer) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: COLUMN intent_visitors.landing_url; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(landing_url) ON TABLE public.intent_visitors TO anon;
GRANT UPDATE(landing_url) ON TABLE public.intent_visitors TO authenticated;


--
-- Name: TABLE job_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.job_applications TO anon;
GRANT ALL ON TABLE public.job_applications TO authenticated;
GRANT ALL ON TABLE public.job_applications TO service_role;
GRANT SELECT,INSERT ON TABLE public.job_applications TO sandbox_exec;


--
-- Name: TABLE jobs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.jobs TO anon;
GRANT ALL ON TABLE public.jobs TO authenticated;
GRANT ALL ON TABLE public.jobs TO service_role;
GRANT SELECT,INSERT ON TABLE public.jobs TO sandbox_exec;


--
-- Name: TABLE landing_page_leads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.landing_page_leads TO anon;
GRANT ALL ON TABLE public.landing_page_leads TO authenticated;
GRANT ALL ON TABLE public.landing_page_leads TO service_role;
GRANT SELECT,INSERT ON TABLE public.landing_page_leads TO sandbox_exec;


--
-- Name: TABLE landing_pages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.landing_pages TO anon;
GRANT ALL ON TABLE public.landing_pages TO authenticated;
GRANT ALL ON TABLE public.landing_pages TO service_role;
GRANT SELECT,INSERT ON TABLE public.landing_pages TO sandbox_exec;


--
-- Name: TABLE lead_form_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lead_form_settings TO anon;
GRANT ALL ON TABLE public.lead_form_settings TO authenticated;
GRANT ALL ON TABLE public.lead_form_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.lead_form_settings TO sandbox_exec;


--
-- Name: TABLE leads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.leads TO anon;
GRANT ALL ON TABLE public.leads TO authenticated;
GRANT ALL ON TABLE public.leads TO service_role;
GRANT SELECT,INSERT ON TABLE public.leads TO sandbox_exec;


--
-- Name: TABLE legal_pages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.legal_pages TO anon;
GRANT ALL ON TABLE public.legal_pages TO authenticated;
GRANT ALL ON TABLE public.legal_pages TO service_role;
GRANT SELECT,INSERT ON TABLE public.legal_pages TO sandbox_exec;


--
-- Name: TABLE lp_api_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_api_keys TO anon;
GRANT ALL ON TABLE public.lp_api_keys TO authenticated;
GRANT ALL ON TABLE public.lp_api_keys TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_api_keys TO sandbox_exec;


--
-- Name: TABLE lp_automation_rules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_automation_rules TO anon;
GRANT ALL ON TABLE public.lp_automation_rules TO authenticated;
GRANT ALL ON TABLE public.lp_automation_rules TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_automation_rules TO sandbox_exec;


--
-- Name: TABLE lp_batches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_batches TO anon;
GRANT ALL ON TABLE public.lp_batches TO authenticated;
GRANT ALL ON TABLE public.lp_batches TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_batches TO sandbox_exec;


--
-- Name: TABLE lp_marketing_flows; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_marketing_flows TO anon;
GRANT ALL ON TABLE public.lp_marketing_flows TO authenticated;
GRANT ALL ON TABLE public.lp_marketing_flows TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_marketing_flows TO sandbox_exec;


--
-- Name: TABLE lp_multi_flows; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_multi_flows TO anon;
GRANT ALL ON TABLE public.lp_multi_flows TO authenticated;
GRANT ALL ON TABLE public.lp_multi_flows TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_multi_flows TO sandbox_exec;


--
-- Name: TABLE lp_push_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_push_logs TO anon;
GRANT ALL ON TABLE public.lp_push_logs TO authenticated;
GRANT ALL ON TABLE public.lp_push_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_push_logs TO sandbox_exec;


--
-- Name: TABLE lp_universities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_universities TO anon;
GRANT ALL ON TABLE public.lp_universities TO authenticated;
GRANT ALL ON TABLE public.lp_universities TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_universities TO sandbox_exec;


--
-- Name: TABLE lp_utm_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lp_utm_links TO anon;
GRANT ALL ON TABLE public.lp_utm_links TO authenticated;
GRANT ALL ON TABLE public.lp_utm_links TO service_role;
GRANT SELECT,INSERT ON TABLE public.lp_utm_links TO sandbox_exec;


--
-- Name: TABLE marketing_automations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marketing_automations TO anon;
GRANT ALL ON TABLE public.marketing_automations TO authenticated;
GRANT ALL ON TABLE public.marketing_automations TO service_role;
GRANT SELECT,INSERT ON TABLE public.marketing_automations TO sandbox_exec;


--
-- Name: TABLE multi_push_presets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.multi_push_presets TO anon;
GRANT ALL ON TABLE public.multi_push_presets TO authenticated;
GRANT ALL ON TABLE public.multi_push_presets TO service_role;
GRANT SELECT,INSERT ON TABLE public.multi_push_presets TO sandbox_exec;


--
-- Name: TABLE multi_push_university_defaults; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.multi_push_university_defaults TO anon;
GRANT ALL ON TABLE public.multi_push_university_defaults TO authenticated;
GRANT ALL ON TABLE public.multi_push_university_defaults TO service_role;
GRANT SELECT,INSERT ON TABLE public.multi_push_university_defaults TO sandbox_exec;


--
-- Name: TABLE otp_providers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.otp_providers TO anon;
GRANT ALL ON TABLE public.otp_providers TO authenticated;
GRANT ALL ON TABLE public.otp_providers TO service_role;
GRANT SELECT,INSERT ON TABLE public.otp_providers TO sandbox_exec;


--
-- Name: TABLE placement_records; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.placement_records TO anon;
GRANT ALL ON TABLE public.placement_records TO authenticated;
GRANT ALL ON TABLE public.placement_records TO service_role;
GRANT SELECT,INSERT ON TABLE public.placement_records TO sandbox_exec;


--
-- Name: TABLE popular_places; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.popular_places TO anon;
GRANT ALL ON TABLE public.popular_places TO authenticated;
GRANT ALL ON TABLE public.popular_places TO service_role;
GRANT SELECT,INSERT ON TABLE public.popular_places TO sandbox_exec;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT ON TABLE public.profiles TO sandbox_exec;


--
-- Name: TABLE program_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.program_categories TO anon;
GRANT ALL ON TABLE public.program_categories TO authenticated;
GRANT ALL ON TABLE public.program_categories TO service_role;
GRANT SELECT,INSERT ON TABLE public.program_categories TO sandbox_exec;


--
-- Name: TABLE programs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.programs TO anon;
GRANT ALL ON TABLE public.programs TO authenticated;
GRANT ALL ON TABLE public.programs TO service_role;
GRANT SELECT,INSERT ON TABLE public.programs TO sandbox_exec;


--
-- Name: TABLE promoted_programs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.promoted_programs TO anon;
GRANT ALL ON TABLE public.promoted_programs TO authenticated;
GRANT ALL ON TABLE public.promoted_programs TO service_role;
GRANT SELECT,INSERT ON TABLE public.promoted_programs TO sandbox_exec;


--
-- Name: TABLE push_landing_pages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.push_landing_pages TO anon;
GRANT ALL ON TABLE public.push_landing_pages TO authenticated;
GRANT ALL ON TABLE public.push_landing_pages TO service_role;
GRANT SELECT,INSERT ON TABLE public.push_landing_pages TO sandbox_exec;


--
-- Name: TABLE push_leads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.push_leads TO anon;
GRANT ALL ON TABLE public.push_leads TO authenticated;
GRANT ALL ON TABLE public.push_leads TO service_role;
GRANT SELECT,INSERT ON TABLE public.push_leads TO sandbox_exec;


--
-- Name: TABLE referrals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.referrals TO anon;
GRANT ALL ON TABLE public.referrals TO authenticated;
GRANT ALL ON TABLE public.referrals TO service_role;
GRANT SELECT,INSERT ON TABLE public.referrals TO sandbox_exec;


--
-- Name: TABLE review_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.review_reports TO anon;
GRANT ALL ON TABLE public.review_reports TO authenticated;
GRANT ALL ON TABLE public.review_reports TO service_role;
GRANT SELECT,INSERT ON TABLE public.review_reports TO sandbox_exec;


--
-- Name: TABLE scholarships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scholarships TO anon;
GRANT ALL ON TABLE public.scholarships TO authenticated;
GRANT ALL ON TABLE public.scholarships TO service_role;
GRANT SELECT,INSERT ON TABLE public.scholarships TO sandbox_exec;


--
-- Name: TABLE site_integrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.site_integrations TO anon;
GRANT ALL ON TABLE public.site_integrations TO authenticated;
GRANT ALL ON TABLE public.site_integrations TO service_role;
GRANT SELECT,INSERT ON TABLE public.site_integrations TO sandbox_exec;


--
-- Name: TABLE state_cities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.state_cities TO anon;
GRANT ALL ON TABLE public.state_cities TO authenticated;
GRANT ALL ON TABLE public.state_cities TO service_role;
GRANT SELECT,INSERT ON TABLE public.state_cities TO sandbox_exec;


--
-- Name: TABLE states_cities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.states_cities TO anon;
GRANT ALL ON TABLE public.states_cities TO authenticated;
GRANT ALL ON TABLE public.states_cities TO service_role;
GRANT SELECT,INSERT ON TABLE public.states_cities TO sandbox_exec;


--
-- Name: TABLE stream_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.stream_categories TO anon;
GRANT ALL ON TABLE public.stream_categories TO authenticated;
GRANT ALL ON TABLE public.stream_categories TO service_role;
GRANT SELECT,INSERT ON TABLE public.stream_categories TO sandbox_exec;


--
-- Name: TABLE study_board_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.study_board_links TO anon;
GRANT ALL ON TABLE public.study_board_links TO authenticated;
GRANT ALL ON TABLE public.study_board_links TO service_role;
GRANT SELECT,INSERT ON TABLE public.study_board_links TO sandbox_exec;


--
-- Name: TABLE study_boards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.study_boards TO anon;
GRANT ALL ON TABLE public.study_boards TO authenticated;
GRANT ALL ON TABLE public.study_boards TO service_role;
GRANT SELECT,INSERT ON TABLE public.study_boards TO sandbox_exec;


--
-- Name: TABLE study_chapters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.study_chapters TO anon;
GRANT ALL ON TABLE public.study_chapters TO authenticated;
GRANT ALL ON TABLE public.study_chapters TO service_role;
GRANT SELECT,INSERT ON TABLE public.study_chapters TO sandbox_exec;


--
-- Name: TABLE study_resources; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.study_resources TO anon;
GRANT ALL ON TABLE public.study_resources TO authenticated;
GRANT ALL ON TABLE public.study_resources TO service_role;
GRANT SELECT,INSERT ON TABLE public.study_resources TO sandbox_exec;


--
-- Name: TABLE study_subjects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.study_subjects TO anon;
GRANT ALL ON TABLE public.study_subjects TO authenticated;
GRANT ALL ON TABLE public.study_subjects TO service_role;
GRANT SELECT,INSERT ON TABLE public.study_subjects TO sandbox_exec;


--
-- Name: TABLE study_toppers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.study_toppers TO anon;
GRANT ALL ON TABLE public.study_toppers TO authenticated;
GRANT ALL ON TABLE public.study_toppers TO service_role;
GRANT SELECT,INSERT ON TABLE public.study_toppers TO sandbox_exec;


--
-- Name: TABLE sub_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sub_users TO anon;
GRANT ALL ON TABLE public.sub_users TO authenticated;
GRANT ALL ON TABLE public.sub_users TO service_role;
GRANT SELECT,INSERT ON TABLE public.sub_users TO sandbox_exec;


--
-- Name: TABLE system_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.system_logs TO anon;
GRANT ALL ON TABLE public.system_logs TO authenticated;
GRANT ALL ON TABLE public.system_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.system_logs TO sandbox_exec;


--
-- Name: TABLE team_invites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.team_invites TO anon;
GRANT ALL ON TABLE public.team_invites TO authenticated;
GRANT ALL ON TABLE public.team_invites TO service_role;
GRANT SELECT,INSERT ON TABLE public.team_invites TO sandbox_exec;


--
-- Name: TABLE trusted_partners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trusted_partners TO anon;
GRANT ALL ON TABLE public.trusted_partners TO authenticated;
GRANT ALL ON TABLE public.trusted_partners TO service_role;
GRANT SELECT,INSERT ON TABLE public.trusted_partners TO sandbox_exec;


--
-- Name: TABLE universities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.universities TO anon;
GRANT ALL ON TABLE public.universities TO authenticated;
GRANT ALL ON TABLE public.universities TO service_role;
GRANT SELECT,INSERT ON TABLE public.universities TO sandbox_exec;


--
-- Name: TABLE university_api_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.university_api_keys TO anon;
GRANT ALL ON TABLE public.university_api_keys TO authenticated;
GRANT ALL ON TABLE public.university_api_keys TO service_role;
GRANT SELECT,INSERT ON TABLE public.university_api_keys TO sandbox_exec;


--
-- Name: TABLE upload_batches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.upload_batches TO anon;
GRANT ALL ON TABLE public.upload_batches TO authenticated;
GRANT ALL ON TABLE public.upload_batches TO service_role;
GRANT SELECT,INSERT ON TABLE public.upload_batches TO sandbox_exec;


--
-- Name: TABLE user_consent; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_consent TO anon;
GRANT ALL ON TABLE public.user_consent TO authenticated;
GRANT ALL ON TABLE public.user_consent TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_consent TO sandbox_exec;


--
-- Name: TABLE user_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_documents TO anon;
GRANT ALL ON TABLE public.user_documents TO authenticated;
GRANT ALL ON TABLE public.user_documents TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_documents TO sandbox_exec;


--
-- Name: TABLE user_education_entries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_education_entries TO anon;
GRANT ALL ON TABLE public.user_education_entries TO authenticated;
GRANT ALL ON TABLE public.user_education_entries TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_education_entries TO sandbox_exec;


--
-- Name: TABLE user_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_events TO anon;
GRANT ALL ON TABLE public.user_events TO authenticated;
GRANT ALL ON TABLE public.user_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_events TO sandbox_exec;


--
-- Name: TABLE user_favorites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_favorites TO anon;
GRANT ALL ON TABLE public.user_favorites TO authenticated;
GRANT ALL ON TABLE public.user_favorites TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_favorites TO sandbox_exec;


--
-- Name: TABLE user_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_permissions TO anon;
GRANT ALL ON TABLE public.user_permissions TO authenticated;
GRANT ALL ON TABLE public.user_permissions TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_permissions TO sandbox_exec;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_roles TO sandbox_exec;


--
-- Name: TABLE user_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_sessions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.user_sessions TO authenticated;
GRANT ALL ON TABLE public.user_sessions TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_sessions TO sandbox_exec;


--
-- Name: COLUMN user_sessions.user_id; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(user_id) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.last_seen_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(last_seen_at) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(last_seen_at) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.pages_visited; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(pages_visited) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(pages_visited) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.total_events; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(total_events) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(total_events) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.device; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(device) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(device) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.last_path; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(last_path) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(last_path) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.referrer; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(referrer) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(referrer) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.utm; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(utm) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(utm) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.lead_id; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(lead_id) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.lead_name; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(lead_name) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.lead_email; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(lead_email) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.lead_phone; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(lead_phone) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.viewport; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(viewport) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(viewport) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.screen; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(screen) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(screen) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.language; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(language) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(language) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.timezone; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(timezone) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(timezone) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.total_time_ms; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(total_time_ms) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(total_time_ms) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.max_scroll_pct; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(max_scroll_pct) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(max_scroll_pct) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.opt_in; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(opt_in) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(opt_in) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.entry_path; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(entry_path) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(entry_path) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.exit_path; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(exit_path) ON TABLE public.user_sessions TO anon;
GRANT UPDATE(exit_path) ON TABLE public.user_sessions TO authenticated;


--
-- Name: COLUMN user_sessions.conversion; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(conversion) ON TABLE public.user_sessions TO authenticated;


--
-- Name: TABLE wallet_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wallet_transactions TO anon;
GRANT ALL ON TABLE public.wallet_transactions TO authenticated;
GRANT ALL ON TABLE public.wallet_transactions TO service_role;
GRANT SELECT,INSERT ON TABLE public.wallet_transactions TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT ON TABLES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--



-- =====================================================================
-- 4. Storage buckets
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('ad-images',      'ad-images',      true,  NULL, NULL),
  ('user-documents', 'user-documents', false, 2097152, NULL),
  ('admin-uploads',  'admin-uploads',  true,  NULL, NULL),
  ('study-material', 'study-material', true,  NULL, NULL),
  ('user-avatars',   'user-avatars',   false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 5. Realtime publication
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;

-- =====================================================================
-- DONE. After running:
--   1) Re-add edge function secrets (AWS_*, LOVABLE_API_KEY, etc.)
--   2) Re-deploy edge functions
--   3) Update hardcoded project URL in lp_dispatch_on_lead_insert() and
--      intent_on_event_insert() if your new project ref differs.
--   4) Import data with pg_dump --data-only if needed.
-- =====================================================================
