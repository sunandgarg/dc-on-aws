
-- 1) Add lifecycle columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

CREATE INDEX IF NOT EXISTS leads_status_idx       ON public.leads(status);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx  ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_phone_norm_idx   ON public.leads((right(regexp_replace(coalesce(phone,''),'[^0-9]','','g'),10)));

-- 2) Notes / activity timeline per lead
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id uuid,
  kind text NOT NULL DEFAULT 'note',           -- note | call | email | whatsapp | status_change | assignment
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_notes_lead_id_idx ON public.lead_notes(lead_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all lead notes"
  ON public.lead_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can view their own notes"
  ON public.lead_notes FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());
