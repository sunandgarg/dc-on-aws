ALTER TABLE public.lead_form_settings
ADD COLUMN IF NOT EXISTS channel_preference text NOT NULL DEFAULT 'sms' CHECK (channel_preference IN ('sms','whatsapp','both'));