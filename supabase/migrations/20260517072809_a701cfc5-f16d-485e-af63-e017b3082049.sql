ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS linked_school_classes integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_college_subjects uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS linked_school_classes integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_college_subjects uuid[] NOT NULL DEFAULT '{}';