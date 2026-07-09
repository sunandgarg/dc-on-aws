ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS created_by uuid;
CREATE OR REPLACE FUNCTION public.set_created_by_articles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_articles_created_by ON public.articles;
CREATE TRIGGER trg_articles_created_by BEFORE INSERT ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.set_created_by_articles();