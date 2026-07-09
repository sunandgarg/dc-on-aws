
-- Extend profiles with more fields for progressive profile completion
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS dob text DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_category text DEFAULT '',
  ADD COLUMN IF NOT EXISTS marital_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS physically_challenged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_10_board text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_10_school text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_10_year text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_10_marks_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_10_percentage text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_12_board text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_12_school text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_12_year text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_12_marks_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_12_percentage text DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_stream text DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_level text DEFAULT '';

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_name text NOT NULL,
  friend_mobile text NOT NULL,
  friend_email text NOT NULL,
  alternate_mobile text DEFAULT '',
  alternate_email text DEFAULT '',
  friend_state text NOT NULL,
  friend_city text NOT NULL,
  desired_city text DEFAULT '',
  desired_colleges jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  reward_amount numeric DEFAULT 0,
  reward_paid boolean DEFAULT false,
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert own referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage all referrals" ON public.referrals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- User documents table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents" ON public.user_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.user_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.user_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents" ON public.user_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'credit',
  amount numeric NOT NULL DEFAULT 0,
  description text DEFAULT '',
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_user ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON public.wallet_transactions(user_id);

-- Triggers for updated_at
CREATE TRIGGER set_referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_user_documents_updated_at BEFORE UPDATE ON public.user_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for user documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-documents', 'user-documents', false, 2097152)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
