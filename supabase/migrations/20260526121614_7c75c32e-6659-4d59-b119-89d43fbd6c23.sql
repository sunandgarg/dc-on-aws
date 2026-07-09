CREATE OR REPLACE FUNCTION public.validate_college_affiliation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;