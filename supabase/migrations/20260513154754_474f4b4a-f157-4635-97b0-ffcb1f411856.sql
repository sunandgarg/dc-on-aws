
-- Validation triggers ensure article_links + colleges.related_* always reference real slugs.

CREATE OR REPLACE FUNCTION public.validate_article_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.entity_type IS NULL OR NEW.entity_slug IS NULL OR NEW.entity_slug = '' THEN
    RAISE EXCEPTION 'article_links: entity_type and entity_slug are required';
  END IF;
  CASE NEW.entity_type
    WHEN 'college'     THEN SELECT EXISTS(SELECT 1 FROM public.colleges        WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'course'      THEN SELECT EXISTS(SELECT 1 FROM public.courses         WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'exam'        THEN SELECT EXISTS(SELECT 1 FROM public.exams           WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'career'      THEN SELECT EXISTS(SELECT 1 FROM public.career_profiles WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'scholarship' THEN SELECT EXISTS(SELECT 1 FROM public.scholarships    WHERE slug = NEW.entity_slug) INTO ok;
    WHEN 'article'     THEN SELECT EXISTS(SELECT 1 FROM public.articles        WHERE slug = NEW.entity_slug) INTO ok;
    ELSE RAISE EXCEPTION 'article_links: invalid entity_type %', NEW.entity_type;
  END CASE;
  IF NOT ok THEN
    RAISE EXCEPTION 'article_links: % "%" does not exist', NEW.entity_type, NEW.entity_slug;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_article_link ON public.article_links;
CREATE TRIGGER trg_validate_article_link
BEFORE INSERT OR UPDATE ON public.article_links
FOR EACH ROW EXECUTE FUNCTION public.validate_article_link();

CREATE OR REPLACE FUNCTION public.validate_college_related_arrays()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS trg_validate_college_related_arrays ON public.colleges;
CREATE TRIGGER trg_validate_college_related_arrays
BEFORE INSERT OR UPDATE OF related_courses, related_exams ON public.colleges
FOR EACH ROW EXECUTE FUNCTION public.validate_college_related_arrays();

-- Indexes for fast autocomplete on slug + name (case-insensitive prefix friendly)
CREATE INDEX IF NOT EXISTS idx_courses_name_lower         ON public.courses         (lower(name));
CREATE INDEX IF NOT EXISTS idx_exams_name_lower           ON public.exams           (lower(name));
CREATE INDEX IF NOT EXISTS idx_career_profiles_name_lower ON public.career_profiles (lower(name));
CREATE INDEX IF NOT EXISTS idx_colleges_name_lower        ON public.colleges        (lower(name));
CREATE INDEX IF NOT EXISTS idx_scholarships_title_lower   ON public.scholarships    (lower(title));
CREATE INDEX IF NOT EXISTS idx_articles_title_lower       ON public.articles        (lower(title));

CREATE INDEX IF NOT EXISTS idx_article_links_article_id   ON public.article_links   (article_id);
CREATE INDEX IF NOT EXISTS idx_article_links_entity       ON public.article_links   (entity_type, entity_slug);
