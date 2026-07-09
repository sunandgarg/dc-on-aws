
ALTER TABLE public.ads DROP CONSTRAINT ads_position_check;
ALTER TABLE public.ads ADD CONSTRAINT ads_position_check CHECK (position = ANY (ARRAY['sidebar'::text, 'mid-page'::text, 'top'::text, 'bottom'::text, 'leaderboard'::text, 'inline'::text]));
