
-- ═══════════════════════════════════════════════════════════════
-- COLLEGES: Add new fields from PDF spec
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS logo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS carousel_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brochure_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS eligibility_criteria text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS admission_process text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scholarship_details text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hostel_life text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gallery_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cutoff text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS course_fee_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS placement_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rankings_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facilities_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_ad_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS square_ad_image text NOT NULL DEFAULT '';

-- ═══════════════════════════════════════════════════════════════
-- COURSES: Add new fields from PDF spec
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS study_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS high_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS syllabus_pdf_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scope_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subjects_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS placements_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS admission_process text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fees_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cutoff_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialization_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recruiters_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS syllabus_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords text NOT NULL DEFAULT '';

-- ═══════════════════════════════════════════════════════════════
-- EXAMS: Add new fields from PDF spec
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS short_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS application_start_date text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS application_end_date text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS result_date text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS negative_marking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seats text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS age_limit text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sample_paper_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS application_process text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS exam_pattern text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cutoff_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preparation_tips text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS counselling_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS center_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS question_paper text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender_wise text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS result_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cast_wise_fee text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dates_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords text NOT NULL DEFAULT '';

-- ═══════════════════════════════════════════════════════════════
-- ARTICLES: Create new table for blog/article management
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'Draft',
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  vertical text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  featured_image text NOT NULL DEFAULT '',
  views integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  meta_keywords text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read articles" ON public.articles FOR SELECT USING (true);

-- Public manage policy (same pattern as other content tables)
CREATE POLICY "Public manage articles" ON public.articles FOR ALL USING (true) WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
