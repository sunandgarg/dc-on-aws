
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS youtube_video_url TEXT NOT NULL DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS youtube_video_url TEXT NOT NULL DEFAULT '';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS youtube_video_url TEXT NOT NULL DEFAULT '';
