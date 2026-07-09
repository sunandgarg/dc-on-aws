ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS how_to_apply_video_url text;
INSERT INTO public.site_integrations (key, label, category, value, enabled, notes)
VALUES ('youtube_fallback_how_to_apply_exam', 'How to Apply Video (Fallback)', 'media', '', true, 'Default YouTube video used as the "How to Apply" fallback on Exam pages when an exam has no specific URL.')
ON CONFLICT (key) DO NOTHING;