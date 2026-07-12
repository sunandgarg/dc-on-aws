-- Legacy Directus/MySQL migration support.
-- Historical leads are deliberately held outside public lead workflows until
-- their consent and retention status has been reviewed by an administrator.

CREATE TABLE IF NOT EXISTS public.legacy_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_sha256 text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('dry-run', 'apply')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  initiated_by text NOT NULL DEFAULT 'migration-script'
);

CREATE TABLE IF NOT EXISTS public.legacy_leads_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_lead_id bigint NOT NULL UNIQUE,
  contact_fingerprint text NOT NULL UNIQUE,
  name text,
  email text,
  phone text,
  gender text,
  course_name text,
  level text,
  state text,
  city text,
  source text,
  source_detail text,
  legacy_created_at timestamptz,
  consent_status text NOT NULL DEFAULT 'unknown'
    CHECK (consent_status IN ('unknown', 'verified', 'withdrawn', 'not_available')),
  marketing_eligible boolean NOT NULL DEFAULT false,
  retention_review_at date NOT NULL DEFAULT (current_date + 180),
  imported_at timestamptz NOT NULL DEFAULT now(),
  import_run_id uuid REFERENCES public.legacy_import_runs(id) ON DELETE SET NULL
);

ALTER TABLE public.legacy_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_leads_quarantine ENABLE ROW LEVEL SECURITY;

-- No browser-facing policy is created. Service-role migration tooling is the
-- only access path until a dedicated consent/review workflow is implemented.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legacy-public-assets',
  'legacy-public-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
