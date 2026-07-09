INSERT INTO public.site_integrations (key, label, category, value, enabled, notes)
VALUES
  ('online_degree_redirect_url', 'Online Degrees redirect URL', 'redirects', '', true, 'After a user submits the Online Degrees lead form, they are redirected to this URL (partner / landing page). Leave empty to just show a thank-you toast.'),
  ('study_abroad_redirect_url', 'Study Abroad redirect URL', 'redirects', '', true, 'After a user submits the Study Abroad lead form, they are redirected to this URL (partner / landing page). Leave empty to just show a thank-you toast.')
ON CONFLICT (key) DO NOTHING;