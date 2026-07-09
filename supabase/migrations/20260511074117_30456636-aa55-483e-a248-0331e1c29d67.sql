CREATE TABLE IF NOT EXISTS public.study_board_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_slug TEXT NOT NULL,
  class_num INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_board_links_lookup
  ON public.study_board_links (board_slug, class_num, display_order);

ALTER TABLE public.study_board_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active board links"
  ON public.study_board_links FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert board links"
  ON public.study_board_links FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update board links"
  ON public.study_board_links FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete board links"
  ON public.study_board_links FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_study_board_links_updated_at
  BEFORE UPDATE ON public.study_board_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed CBSE Class 10 & 12 with collegedekho-parity sections
INSERT INTO public.study_board_links (board_slug, class_num, title, url, display_order) VALUES
  ('cbse', 10, 'CBSE Class 10 Board 2026', '/news?tag=cbse-class-10-board', 1),
  ('cbse', 10, 'CBSE Class 10 Date Sheet 2026', '/news?tag=cbse-class-10-date-sheet', 2),
  ('cbse', 10, 'CBSE Class 10 Syllabus 2025-26', '/news?tag=cbse-class-10-syllabus', 3),
  ('cbse', 10, 'CBSE Class 10 Previous Year Question Papers', '/resources/cbse-class-10-pyq', 4),
  ('cbse', 10, 'CBSE Class 10 Sample Paper 2025-26', '/news?tag=cbse-class-10-sample-paper', 5),
  ('cbse', 10, 'CBSE Class 10 Exam Pattern 2025-26', '/news?tag=cbse-class-10-exam-pattern', 6),
  ('cbse', 10, 'CBSE Class 10 Admit Card 2026', '/news?tag=cbse-class-10-admit-card', 7),
  ('cbse', 10, 'CBSE Class 10 Preparation Tips 2026', '/news?tag=cbse-class-10-preparation-tips', 8),
  ('cbse', 10, 'CBSE Class 10 Result 2026', '/news?tag=cbse-class-10-result', 9),
  ('cbse', 10, 'CBSE Class 10 Marksheet 2026', '/news?tag=cbse-class-10-marksheet', 10),
  ('cbse', 10, 'CBSE Class 10 Grading System 2026', '/news?tag=cbse-class-10-grading-system', 11),
  ('cbse', 10, 'CBSE Class 10 Compartment Date Sheet 2026', '/news?tag=cbse-class-10-compartment-date-sheet', 12),
  ('cbse', 10, 'CBSE Class 10 Compartment Result 2026', '/news?tag=cbse-class-10-compartment-result', 13),
  ('cbse', 12, 'CBSE Class 12 Board 2026', '/news?tag=cbse-class-12-board', 1),
  ('cbse', 12, 'CBSE Class 12 Date Sheet 2026', '/news?tag=cbse-class-12-date-sheet', 2),
  ('cbse', 12, 'CBSE Class 12 Syllabus 2025-26', '/news?tag=cbse-class-12-syllabus', 3),
  ('cbse', 12, 'CBSE Class 12 Previous Year Question Papers', '/resources/cbse-class-12-pyq', 4),
  ('cbse', 12, 'CBSE Class 12 Sample Paper 2025-26', '/news?tag=cbse-class-12-sample-paper', 5),
  ('cbse', 12, 'CBSE Class 12 Exam Pattern 2025-26', '/news?tag=cbse-class-12-exam-pattern', 6),
  ('cbse', 12, 'CBSE Class 12 Admit Card 2026', '/news?tag=cbse-class-12-admit-card', 7),
  ('cbse', 12, 'CBSE Class 12 Preparation Tips 2026', '/news?tag=cbse-class-12-preparation-tips', 8),
  ('cbse', 12, 'CBSE Class 12 Result 2026', '/news?tag=cbse-class-12-result', 9),
  ('cbse', 12, 'CBSE Class 12 Marksheet 2026', '/news?tag=cbse-class-12-marksheet', 10),
  ('cbse', 12, 'CBSE Class 12 Grading System 2026', '/news?tag=cbse-class-12-grading-system', 11),
  ('cbse', 12, 'CBSE Class 12 Compartment Date Sheet 2026', '/news?tag=cbse-class-12-compartment-date-sheet', 12),
  ('cbse', 12, 'CBSE Class 12 Compartment Result 2026', '/news?tag=cbse-class-12-compartment-result', 13);
