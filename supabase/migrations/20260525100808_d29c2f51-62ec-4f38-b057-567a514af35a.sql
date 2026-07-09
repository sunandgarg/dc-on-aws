
-- Courses short_id
CREATE SEQUENCE IF NOT EXISTS public.courses_short_id_seq START 20001;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS short_id integer;
UPDATE public.courses SET short_id = nextval('public.courses_short_id_seq') WHERE short_id IS NULL;
ALTER TABLE public.courses ALTER COLUMN short_id SET DEFAULT nextval('public.courses_short_id_seq');
ALTER SEQUENCE public.courses_short_id_seq OWNED BY public.courses.short_id;
CREATE UNIQUE INDEX IF NOT EXISTS courses_short_id_unique ON public.courses(short_id);

-- Exams short_id
CREATE SEQUENCE IF NOT EXISTS public.exams_short_id_seq START 30001;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS short_id integer;
UPDATE public.exams SET short_id = nextval('public.exams_short_id_seq') WHERE short_id IS NULL;
ALTER TABLE public.exams ALTER COLUMN short_id SET DEFAULT nextval('public.exams_short_id_seq');
ALTER SEQUENCE public.exams_short_id_seq OWNED BY public.exams.short_id;
CREATE UNIQUE INDEX IF NOT EXISTS exams_short_id_unique ON public.exams(short_id);
