CREATE OR REPLACE FUNCTION public.validate_article_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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