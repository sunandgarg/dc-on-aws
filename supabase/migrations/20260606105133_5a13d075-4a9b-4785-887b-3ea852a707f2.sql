
-- ============================================================
-- INTENT-BASED LEAD INTELLIGENCE SYSTEM
-- ============================================================

-- Ensure pg_net for async webhook dispatch
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- 1. intent_visitors  (anonymous visitor identity)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_visitors (
  visitor_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merged_user_id    uuid,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  device_type       text,
  city              text,
  state             text,
  country           text,
  user_agent        text,
  utm               jsonb NOT NULL DEFAULT '{}'::jsonb,
  referrer          text,
  landing_url       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intent_visitors_user  ON public.intent_visitors(merged_user_id);
CREATE INDEX IF NOT EXISTS idx_intent_visitors_seen  ON public.intent_visitors(last_seen_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.intent_visitors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.intent_visitors TO authenticated;
GRANT ALL ON public.intent_visitors TO service_role;
ALTER TABLE public.intent_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert visitor"     ON public.intent_visitors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can update own visitor" ON public.intent_visitors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anyone can select visitor"     ON public.intent_visitors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage visitors"        ON public.intent_visitors FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 2. intent_event_weights  (admin-configurable scoring weights)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_event_weights (
  event_type    text PRIMARY KEY,
  label         text NOT NULL,
  weight        integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  category      text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intent_event_weights TO anon, authenticated;
GRANT ALL ON public.intent_event_weights TO service_role;
ALTER TABLE public.intent_event_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read weights"    ON public.intent_event_weights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage weights"  ON public.intent_event_weights FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.intent_event_weights(event_type,label,weight,category) VALUES
  ('college_viewed',           'College Profile Viewed',  5,  'view'),
  ('course_viewed',            'Course Viewed',          10,  'view'),
  ('fee_viewed',               'Fee Structure Viewed',   20,  'view'),
  ('scholarship_viewed',       'Scholarship Viewed',     15,  'view'),
  ('placement_viewed',         'Placement Report Viewed',15,  'view'),
  ('admission_process_viewed', 'Admission Process Viewed',10, 'view'),
  ('cutoff_viewed',            'Cutoff Viewed',          10,  'view'),
  ('ranking_viewed',           'Ranking Viewed',          8,  'view'),
  ('hostel_viewed',            'Hostel Details Viewed',   8,  'view'),
  ('compare_colleges',         'Compare Colleges',       30,  'action'),
  ('save_college',             'Save College',           25,  'action'),
  ('download_brochure',        'Download Brochure',      40,  'high_intent'),
  ('apply_now',                'Apply Now Click',        60,  'high_intent'),
  ('call_institute',           'Call Institute',         50,  'high_intent'),
  ('whatsapp_institute',       'WhatsApp Institute',     50,  'high_intent'),
  ('counselling_request',      'Counselling Request',    50,  'high_intent'),
  ('exam_predictor',           'Exam Predictor Usage',   20,  'tool'),
  ('rank_predictor',           'Rank Predictor Usage',   20,  'tool'),
  ('career_tool',              'Career Guidance Tool',   15,  'tool'),
  ('video_watched',            'Video Watched',           5,  'engagement'),
  ('review_read',              'Review Read',             3,  'engagement'),
  ('review_submitted',         'Review Submitted',       15,  'engagement'),
  ('search_query',             'Search Query Performed',  5,  'engagement')
ON CONFLICT (event_type) DO NOTHING;

-- ------------------------------------------------------------
-- 3. intent_events  (every behavioral signal)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_events (
  id              bigserial PRIMARY KEY,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  event_type      text NOT NULL,
  visitor_id      uuid,
  user_id         uuid,
  session_id      text,
  college_slug    text,
  course_slug     text,
  exam_slug       text,
  university_slug text,
  device_type     text,
  city            text,
  state           text,
  country         text,
  traffic_source  text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,
  page_url        text,
  referrer        text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_delta     integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_intent_events_visitor   ON public.intent_events(visitor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_events_user      ON public.intent_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_events_type      ON public.intent_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_events_college   ON public.intent_events(college_slug, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_events_course    ON public.intent_events(course_slug, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_events_time      ON public.intent_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_events_utm       ON public.intent_events(utm_source, utm_campaign);

GRANT SELECT, INSERT ON public.intent_events TO anon;
GRANT SELECT, INSERT ON public.intent_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.intent_events_id_seq TO anon, authenticated;
GRANT ALL ON public.intent_events TO service_role;
GRANT ALL ON SEQUENCE public.intent_events_id_seq TO service_role;
ALTER TABLE public.intent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone insert events" ON public.intent_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read events"   ON public.intent_events FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 4. intent_lead_scores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_lead_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type      text NOT NULL CHECK (subject_type IN ('user','visitor')),
  subject_id        uuid NOT NULL,
  score             integer NOT NULL DEFAULT 0,
  category          text NOT NULL DEFAULT 'cold',
  top_college_slug  text,
  top_course_slug   text,
  top_exam_slug     text,
  event_count       integer NOT NULL DEFAULT 0,
  last_event_type   text,
  last_event_at     timestamptz,
  first_event_at    timestamptz,
  lead_id           uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  signals           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_intent_scores_category ON public.intent_lead_scores(category, score DESC);
CREATE INDEX IF NOT EXISTS idx_intent_scores_updated  ON public.intent_lead_scores(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_scores_college  ON public.intent_lead_scores(top_college_slug);
CREATE INDEX IF NOT EXISTS idx_intent_scores_lead     ON public.intent_lead_scores(lead_id);

GRANT SELECT, INSERT, UPDATE ON public.intent_lead_scores TO authenticated;
GRANT ALL ON public.intent_lead_scores TO service_role;
ALTER TABLE public.intent_lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage scores" ON public.intent_lead_scores FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 5. intent_alerts  (real-time partner notifications)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type      text NOT NULL,
  subject_id        uuid NOT NULL,
  alert_type        text NOT NULL,
  score             integer,
  college_slug      text,
  course_slug       text,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered         boolean NOT NULL DEFAULT false,
  delivery_attempts integer NOT NULL DEFAULT 0,
  last_attempt_at   timestamptz,
  delivered_at      timestamptz,
  last_error        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intent_alerts_pending ON public.intent_alerts(delivered, created_at) WHERE delivered = false;
CREATE INDEX IF NOT EXISTS idx_intent_alerts_subject ON public.intent_alerts(subject_type, subject_id);

GRANT SELECT, UPDATE ON public.intent_alerts TO authenticated;
GRANT ALL ON public.intent_alerts TO service_role;
ALTER TABLE public.intent_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read alerts"   ON public.intent_alerts FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admins update alerts" ON public.intent_alerts FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 6. intent_university_webhooks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_university_webhooks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  college_slug      text,
  university_slug   text,
  webhook_url       text NOT NULL,
  secret            text,
  threshold_score   integer NOT NULL DEFAULT 80,
  alert_types       text[] NOT NULL DEFAULT ARRAY['threshold_crossed','download_brochure','apply_now','call_institute','whatsapp_institute','compare_colleges','fee_repeat']::text[],
  is_active         boolean NOT NULL DEFAULT true,
  last_delivery_at  timestamptz,
  failures          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intent_hooks_college ON public.intent_university_webhooks(college_slug) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_university_webhooks TO authenticated;
GRANT ALL ON public.intent_university_webhooks TO service_role;
ALTER TABLE public.intent_university_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage webhooks" ON public.intent_university_webhooks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 7. intent_crm_exports (audit log)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_crm_exports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by    uuid,
  filters         jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count       integer NOT NULL DEFAULT 0,
  format          text NOT NULL DEFAULT 'csv',
  created_at      timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.intent_crm_exports TO authenticated;
GRANT ALL ON public.intent_crm_exports TO service_role;
ALTER TABLE public.intent_crm_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read exports"   ON public.intent_crm_exports FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert exports" ON public.intent_crm_exports FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 8. updated_at triggers
-- ------------------------------------------------------------
CREATE TRIGGER trg_intent_visitors_updated  BEFORE UPDATE ON public.intent_visitors            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intent_scores_updated    BEFORE UPDATE ON public.intent_lead_scores         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intent_hooks_updated     BEFORE UPDATE ON public.intent_university_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intent_weights_updated   BEFORE UPDATE ON public.intent_event_weights       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 9. Category calculator
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intent_category_for(_score integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _score IS NULL OR _score <= 30 THEN 'cold'
    WHEN _score <= 70                   THEN 'warm'
    WHEN _score <= 120                  THEN 'hot'
    ELSE 'admission_ready'
  END
$$;

-- ------------------------------------------------------------
-- 10. Real-time scoring + alerting trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intent_on_event_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS trg_intent_on_event_insert ON public.intent_events;
CREATE TRIGGER trg_intent_on_event_insert
  BEFORE INSERT ON public.intent_events
  FOR EACH ROW EXECUTE FUNCTION public.intent_on_event_insert();

-- ------------------------------------------------------------
-- 11. Visitor -> User merge function
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intent_merge_visitor(_visitor_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

GRANT EXECUTE ON FUNCTION public.intent_merge_visitor(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.intent_category_for(integer) TO authenticated, anon;
