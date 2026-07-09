
-- FAQs table (for homepage and detail pages, admin-managed)
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT 'homepage', -- homepage, colleges, courses, exams
  item_slug TEXT, -- null for homepage/page-level FAQs
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Public manage faqs" ON public.faqs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Popular places table (admin-managed, shown on homepage)
CREATE TABLE public.popular_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  image_url TEXT,
  college_count INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.popular_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read popular_places" ON public.popular_places FOR SELECT USING (true);
CREATE POLICY "Public manage popular_places" ON public.popular_places FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_popular_places_updated_at BEFORE UPDATE ON public.popular_places
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
