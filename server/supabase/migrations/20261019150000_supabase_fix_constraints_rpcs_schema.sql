-- ==============================================================================
-- RoadWatch Migration: Supabase Fix — Status Constraints, RPC Functions, Schema
-- Branch: supabase-fix | Date: 2026-10-19
-- ==============================================================================

-- 1. Fix reports.status CHECK constraint
DO $$
BEGIN
  -- Drop any existing status constraint on reports
  PERFORM constraint_name FROM information_schema.table_constraints
  WHERE table_name = 'reports' AND constraint_type = 'CHECK' AND constraint_name LIKE '%status%';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_key;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check CHECK (
    status IN (
      'submitted',
      'under_review',
      'pending_manual_review',
      'accepted',
      'rejected',
      'disputed'
    )
  );

-- 2. Ensure all convenience columns exist on reports (idempotent)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS vehicle_plate text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS location_name text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS frame_uris text[];
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS citizen_note text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS citizen_plate text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS citizen_vehicle_model text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS citizen_vehicle_color text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS citizen_vehicle_type text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS officer_verdict text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS officer_note text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS officer_verdict_at timestamptz;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS ai_verdict text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS ai_confidence numeric;

-- 3. Ensure evidence table exists
CREATE TABLE IF NOT EXISTS public.evidence (
  evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(report_id) ON DELETE CASCADE,
  storage_ref text NOT NULL,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- 4. Create credit_citizen_reward_payout RPC
CREATE OR REPLACE FUNCTION public.credit_citizen_reward_payout(
  p_report_id uuid,
  p_payout_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id uuid;
BEGIN
  SELECT reporter_id INTO v_reporter_id
  FROM public.reports
  WHERE report_id = p_report_id;

  IF v_reporter_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.reward_wallets (reporter_id, balance, pending_clearance, epay_linked)
  VALUES (v_reporter_id, p_payout_amount, 0, false)
  ON CONFLICT (reporter_id) DO UPDATE
    SET balance = reward_wallets.balance + p_payout_amount;
END;
$$;

-- 5. Re-create complete_reporter_registration RPC
CREATE OR REPLACE FUNCTION public.complete_reporter_registration(
  p_name text,
  p_cnic text,
  p_email text,
  p_vehicle_plate text DEFAULT 'LEA-4471'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_cnic_last4 text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;
  v_cnic_last4 := right(regexp_replace(p_cnic, '\D', '', 'g'), 4);

  INSERT INTO public.base_users (user_id, name, email, cnic_last4, role, account_state, registration_completed_at)
  VALUES (v_user_id, p_name, p_email, v_cnic_last4, 'reporter', 'active', now())
  ON CONFLICT (user_id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        cnic_last4 = COALESCE(EXCLUDED.cnic_last4, base_users.cnic_last4),
        account_state = 'active',
        registration_completed_at = COALESCE(base_users.registration_completed_at, now());

  INSERT INTO public.reporter_profiles (reporter_id, trust_score, vehicle_plate)
  VALUES (v_user_id, 100, p_vehicle_plate)
  ON CONFLICT (reporter_id) DO NOTHING;

  INSERT INTO public.reward_wallets (reporter_id, balance, pending_clearance, epay_linked)
  VALUES (v_user_id, 0, 0, false)
  ON CONFLICT (reporter_id) DO NOTHING;
END;
$$;

-- 6. Handle new auth user trigger (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.base_users (user_id, email, name, role, account_state, registration_completed_at)
  VALUES (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Citizen Reporter'),
    'reporter', 'active', now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET account_state = 'active', role = 'reporter',
        registration_completed_at = coalesce(base_users.registration_completed_at, now());

  INSERT INTO public.reporter_profiles (reporter_id, trust_score, vehicle_plate)
  VALUES (new.id, 100, 'LEA-4471')
  ON CONFLICT (reporter_id) DO NOTHING;

  INSERT INTO public.reward_wallets (reporter_id, balance, pending_clearance, epay_linked)
  VALUES (new.id, 0, 0, false)
  ON CONFLICT (reporter_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 7. Backfill existing auth.users who have no DB rows yet
INSERT INTO public.base_users (user_id, email, name, role, account_state, registration_completed_at)
SELECT
  u.id, u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Citizen Reporter'),
  'reporter', 'active', now()
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE
  SET account_state = 'active',
      registration_completed_at = coalesce(base_users.registration_completed_at, now());

INSERT INTO public.reporter_profiles (reporter_id, trust_score, vehicle_plate)
SELECT u.user_id, 100, 'LEA-4471'
FROM public.base_users u
ON CONFLICT (reporter_id) DO NOTHING;

INSERT INTO public.reward_wallets (reporter_id, balance, pending_clearance, epay_linked)
SELECT u.user_id, 0, 0, false
FROM public.base_users u
ON CONFLICT (reporter_id) DO NOTHING;

-- 8. RLS Policies
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view reports" ON public.reports;
CREATE POLICY "Allow view reports" ON public.reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert reports" ON public.reports;
CREATE POLICY "Allow insert reports" ON public.reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update reports status" ON public.reports;
CREATE POLICY "Allow update reports status" ON public.reports FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow delete reports" ON public.reports;
CREATE POLICY "Allow delete reports" ON public.reports FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow view profiles" ON public.base_users;
CREATE POLICY "Allow view profiles" ON public.base_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert own profile" ON public.base_users;
CREATE POLICY "Allow insert own profile" ON public.base_users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update own profile" ON public.base_users;
CREATE POLICY "Allow update own profile" ON public.base_users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow view reporter profiles" ON public.reporter_profiles;
CREATE POLICY "Allow view reporter profiles" ON public.reporter_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert reporter profiles" ON public.reporter_profiles;
CREATE POLICY "Allow insert reporter profiles" ON public.reporter_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update reporter profiles" ON public.reporter_profiles;
CREATE POLICY "Allow update reporter profiles" ON public.reporter_profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow view wallets" ON public.reward_wallets;
CREATE POLICY "Allow view wallets" ON public.reward_wallets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow manage wallets" ON public.reward_wallets;
CREATE POLICY "Allow manage wallets" ON public.reward_wallets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow view evidence" ON public.evidence;
CREATE POLICY "Allow view evidence" ON public.evidence FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert evidence" ON public.evidence;
CREATE POLICY "Allow insert evidence" ON public.evidence FOR INSERT WITH CHECK (true);

-- 9. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence_vault', 'evidence_vault', true, 52428800,
  ARRAY['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = true, file_size_limit = 52428800,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'application/octet-stream'];

DROP POLICY IF EXISTS "Allow evidence uploads" ON storage.objects;
CREATE POLICY "Allow evidence uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidence_vault');
DROP POLICY IF EXISTS "Allow public viewing of evidence" ON storage.objects;
CREATE POLICY "Allow public viewing of evidence" ON storage.objects FOR SELECT USING (bucket_id = 'evidence_vault');
DROP POLICY IF EXISTS "Allow evidence update" ON storage.objects;
CREATE POLICY "Allow evidence update" ON storage.objects FOR UPDATE USING (bucket_id = 'evidence_vault');
DROP POLICY IF EXISTS "Allow evidence delete" ON storage.objects;
CREATE POLICY "Allow evidence delete" ON storage.objects FOR DELETE USING (bucket_id = 'evidence_vault');

-- 10. Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.reports TO anon, authenticated, service_role;
GRANT ALL ON public.evidence TO anon, authenticated, service_role;
GRANT ALL ON public.base_users TO anon, authenticated, service_role;
GRANT ALL ON public.reporter_profiles TO anon, authenticated, service_role;
GRANT ALL ON public.reward_wallets TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.credit_citizen_reward_payout(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_reporter_registration(text, text, text, text) TO anon, authenticated, service_role;
