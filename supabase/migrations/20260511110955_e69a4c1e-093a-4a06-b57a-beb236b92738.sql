ALTER TABLE public.authors ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON public.authors(user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'author') THEN
    ALTER TYPE public.app_role ADD VALUE 'author';
  END IF;
END$$;