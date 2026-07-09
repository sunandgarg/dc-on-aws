
-- ============= Study Material =============
CREATE TABLE public.study_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  icon_emoji text DEFAULT '📚',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  class_num int NOT NULL CHECK (class_num BETWEEN 8 AND 12),
  board_slug text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  icon_emoji text DEFAULT '📖',
  cover_image text DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_num, board_slug, slug)
);
CREATE INDEX idx_subjects_class_board ON public.study_subjects(class_num, board_slug, is_active);

CREATE TABLE public.study_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.study_subjects(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  chapter_number int DEFAULT 0,
  description text DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_id, slug)
);
CREATE INDEX idx_chapters_subject ON public.study_chapters(subject_id, is_active);

CREATE TABLE public.study_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.study_chapters(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.study_subjects(id) ON DELETE CASCADE,
  resource_type text NOT NULL DEFAULT 'pyq', -- pyq | combined_10yr | notes | sample
  year text DEFAULT '',
  title text NOT NULL,
  description text DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_size_kb int DEFAULT 0,
  download_count int NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_resources_chapter ON public.study_resources(chapter_id, is_active);
CREATE INDEX idx_resources_subject ON public.study_resources(subject_id, is_active);

-- RLS: public read; admins manage
ALTER TABLE public.study_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read study_boards" ON public.study_boards FOR SELECT USING (true);
CREATE POLICY "Admins manage study_boards" ON public.study_boards FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public read study_subjects" ON public.study_subjects FOR SELECT USING (true);
CREATE POLICY "Admins manage study_subjects" ON public.study_subjects FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public read study_chapters" ON public.study_chapters FOR SELECT USING (true);
CREATE POLICY "Admins manage study_chapters" ON public.study_chapters FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public read study_resources" ON public.study_resources FOR SELECT USING (true);
CREATE POLICY "Admins manage study_resources" ON public.study_resources FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Triggers
CREATE TRIGGER trg_study_subjects_updated BEFORE UPDATE ON public.study_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_study_chapters_updated BEFORE UPDATE ON public.study_chapters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_study_resources_updated BEFORE UPDATE ON public.study_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for study material PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('study-material','study-material', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read study-material" ON storage.objects FOR SELECT USING (bucket_id = 'study-material');
CREATE POLICY "Admins manage study-material" ON storage.objects FOR ALL
  USING (bucket_id = 'study-material' AND has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'study-material' AND has_role(auth.uid(),'admin'));

-- ============= Lead OTP-verified flag =============
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS otp_verified boolean NOT NULL DEFAULT false;

-- ============= Seed boards =============
INSERT INTO public.study_boards (slug, name, description, icon_emoji, display_order) VALUES
  ('cbse','CBSE','Central Board of Secondary Education','🇮🇳',1),
  ('icse','ICSE','Indian Certificate of Secondary Education','📘',2),
  ('state','State Board','State board curriculum','🏫',3)
ON CONFLICT (slug) DO NOTHING;
