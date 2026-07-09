
-- =====================================================
-- ADMIN SYSTEM: Ads, Featured Colleges, User Roles
-- =====================================================

-- 1. App roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function for role checks (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS on user_roles: admins can read all, users can read own
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Dynamic Ads table
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  cta_text text NOT NULL DEFAULT 'Learn More',
  link_url text NOT NULL DEFAULT '#',
  image_url text,
  variant text NOT NULL DEFAULT 'horizontal' CHECK (variant IN ('horizontal', 'vertical', 'square', 'leaderboard')),
  bg_gradient text NOT NULL DEFAULT 'from-violet-600 to-purple-600',
  
  -- Targeting
  target_type text NOT NULL DEFAULT 'universal' CHECK (target_type IN ('universal', 'page', 'item', 'city')),
  target_page text CHECK (target_page IN ('colleges', 'courses', 'exams', 'articles', NULL)),
  target_item_slug text,
  target_city text,
  position text NOT NULL DEFAULT 'sidebar' CHECK (position IN ('sidebar', 'mid-page', 'top', 'bottom', 'leaderboard')),
  
  -- Priority & scheduling
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Everyone can read active ads (public facing)
CREATE POLICY "Anyone can read active ads"
  ON public.ads FOR SELECT
  USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- Admins can manage all ads
CREATE POLICY "Admins can manage ads"
  ON public.ads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Featured colleges (priority ordering)
CREATE TABLE public.featured_colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_slug text NOT NULL,
  category text,
  state text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_colleges ENABLE ROW LEVEL SECURITY;

-- Anyone can read active featured colleges
CREATE POLICY "Anyone can read featured colleges"
  ON public.featured_colleges FOR SELECT
  USING (is_active = true);

-- Admins can manage
CREATE POLICY "Admins can manage featured colleges"
  ON public.featured_colleges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_featured_colleges_updated_at
  BEFORE UPDATE ON public.featured_colleges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some sample ads
INSERT INTO public.ads (title, subtitle, cta_text, link_url, variant, bg_gradient, target_type, position, priority) VALUES
  ('Prepare for JEE/NEET 2026', 'Get 50% off on premium courses', 'Enroll Now', '#', 'horizontal', 'from-violet-600 to-purple-600', 'universal', 'mid-page', 0),
  ('Study Abroad', 'Free counseling for top universities', 'Apply Free', '#', 'vertical', 'from-teal-500 to-emerald-500', 'universal', 'sidebar', 0),
  ('MBA Admissions', 'CAT 2026 prep starts now', 'Start Free', '#', 'square', 'from-amber-500 to-orange-500', 'universal', 'sidebar', 0),
  ('🎓 Admissions Open 2026 — Top Engineering Colleges — Apply Now & Get Scholarship Up to ₹2 Lakhs', '', 'Apply', '#', 'leaderboard', 'from-rose-500 to-pink-500', 'universal', 'leaderboard', 0);
