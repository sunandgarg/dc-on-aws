
-- Attach the existing handle_new_user trigger so future signups get profile + auto-admin (super admins)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill admin role for super-admin phones / email for any existing auth user
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE LOWER(COALESCE(u.email,'')) = 'sunandgarg@gmail.com'
   OR right(regexp_replace(COALESCE(u.phone, u.raw_user_meta_data->>'phone',''), '[^0-9]', '', 'g'), 10)
      IN ('8700602524','9990109393','8010321712')
ON CONFLICT DO NOTHING;

-- Backfill profiles for any existing auth user that doesn't have one yet
INSERT INTO public.profiles (user_id, email, display_name, phone)
SELECT u.id, u.email,
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(COALESCE(u.email,''), '@', 1),
         right(regexp_replace(COALESCE(u.phone, u.raw_user_meta_data->>'phone',''), '[^0-9]', '', 'g'), 10)),
       right(regexp_replace(COALESCE(u.phone, u.raw_user_meta_data->>'phone',''), '[^0-9]', '', 'g'), 10)
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Add youtube_video_url to career_profiles so admins can attach a video
ALTER TABLE public.career_profiles
  ADD COLUMN IF NOT EXISTS youtube_video_url text NOT NULL DEFAULT '';
