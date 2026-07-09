INSERT INTO public.site_integrations (key, label, category, value, enabled, notes)
VALUES (
  'content_copy_protection',
  'Website content copying',
  'website',
  'copy_allowed',
  false,
  'Disabled = visitors can copy website content. Enabled = protect public website content from copy/select/right-click.'
)
ON CONFLICT (key) DO NOTHING;

WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY article_id, entity_type, entity_slug
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.article_links
)
DELETE FROM public.article_links a
USING ranked r
WHERE a.ctid = r.ctid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_article_links_article_entity
ON public.article_links(article_id, entity_type, entity_slug);