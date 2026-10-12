-- ==============================================================================
-- RoadWatch Exact Schema Alignment & Testing Migration
-- Matches exact column definitions:
-- base_users (user_id, cnic_hash, name, phone, email, role, account_state, created_at, identity_status, cnic_last4, registration_completed_at)
-- reporter_profiles (reporter_id, trust_score, device_binding, language, theme, notify_enabled, wifi_only_upload, vehicle_plate)
-- reports (report_id, reporter_id, case_id, claimed_class, geo_lat, geo_long, captured_at, uploaded_at, status, client_capture_id, location_accuracy_m, received_at)
-- reward_wallets (wallet_id, reporter_id, balance, pending_clearance, epay_linked)
-- ==============================================================================

-- 1. Ensure extensions & wallet_id default
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

alter table public.reward_wallets alter column wallet_id set default gen_random_uuid();
create unique index if not exists reward_wallets_reporter_id_idx on public.reward_wallets (reporter_id);

-- 2. Ensure foreign key constraint on reports points to base_users(user_id)
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'reports_reporter_id_fkey' and table_name = 'reports'
  ) then
    alter table public.reports drop constraint reports_reporter_id_fkey;
  end if;
  alter table public.reports add constraint reports_reporter_id_fkey
    foreign key (reporter_id) references public.base_users(user_id) on delete cascade;
exception when others then null;
end $$;

-- 3. Storage Bucket for evidence
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence_vault',
  'evidence_vault',
  true,
  52428800,
  array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- 4. Automated User Trigger on auth.users
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- 1. base_users
  insert into public.base_users (user_id, email, name, role, account_state, registration_completed_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Citizen Reporter'),
    'reporter',
    'active',
    now()
  )
  on conflict (user_id) do update set
    account_state = 'active',
    role = 'reporter',
    registration_completed_at = coalesce(base_users.registration_completed_at, now());

  -- 2. reporter_profiles
  insert into public.reporter_profiles (reporter_id, trust_score, vehicle_plate)
  values (new.id, 100, 'LEA-4471')
  on conflict (reporter_id) do nothing;

  -- 3. reward_wallets (uses reporter_id!)
  insert into public.reward_wallets (reporter_id, balance, pending_clearance, epay_linked)
  values (new.id, 0, 0, false)
  on conflict (reporter_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 5. Backfill any existing users in auth.users
insert into public.base_users (user_id, email, name, role, account_state, registration_completed_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Citizen Reporter'),
  'reporter',
  'active',
  now()
from auth.users u
on conflict (user_id) do update set
  account_state = 'active',
  role = 'reporter',
  registration_completed_at = coalesce(base_users.registration_completed_at, now());

insert into public.reporter_profiles (reporter_id, trust_score, vehicle_plate)
select u.user_id, 100, 'LEA-4471'
from public.base_users u
on conflict (reporter_id) do nothing;

insert into public.reward_wallets (reporter_id, balance, pending_clearance, epay_linked)
select u.user_id, 0, 0, false
from public.base_users u
where not exists (
  select 1 from public.reward_wallets rw where rw.reporter_id = u.user_id
);

-- 6. Row Level Security (RLS) Policies
alter table public.base_users enable row level security;
alter table public.reporter_profiles enable row level security;
alter table public.reports enable row level security;
alter table public.reward_wallets enable row level security;

-- Base Users
drop policy if exists "Users can view own profile" on public.base_users;
create policy "Users can view own profile" on public.base_users
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own profile" on public.base_users;
create policy "Users can insert own profile" on public.base_users
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own profile" on public.base_users;
create policy "Users can update own profile" on public.base_users
  for update to authenticated using ((select auth.uid()) = user_id);

-- Reporter Profiles
drop policy if exists "Reporters can view own profile" on public.reporter_profiles;
create policy "Reporters can view own profile" on public.reporter_profiles
  for select to authenticated using ((select auth.uid()) = reporter_id);

drop policy if exists "Reporters can insert own profile" on public.reporter_profiles;
create policy "Reporters can insert own profile" on public.reporter_profiles
  for insert to authenticated with check ((select auth.uid()) = reporter_id);

drop policy if exists "Reporters can update own profile" on public.reporter_profiles;
create policy "Reporters can update own profile" on public.reporter_profiles
  for update to authenticated using ((select auth.uid()) = reporter_id);

-- Reports
drop policy if exists "Reporters can view own reports" on public.reports;
create policy "Reporters can view own reports" on public.reports
  for select to authenticated using ((select auth.uid()) = reporter_id);

drop policy if exists "Reporters can insert own reports" on public.reports;
create policy "Reporters can insert own reports" on public.reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);

-- Reward Wallets (Uses reporter_id)
drop policy if exists "Users can view own wallet" on public.reward_wallets;
create policy "Users can view own wallet" on public.reward_wallets
  for select to authenticated using ((select auth.uid()) = reporter_id);

drop policy if exists "Users can manage own wallet" on public.reward_wallets;
create policy "Users can manage own wallet" on public.reward_wallets
  for all to authenticated
  using ((select auth.uid()) = reporter_id)
  with check ((select auth.uid()) = reporter_id);

drop policy if exists "Users can update own wallet" on public.reward_wallets;
create policy "Users can update own wallet" on public.reward_wallets
  for update to authenticated
  using ((select auth.uid()) = reporter_id)
  with check ((select auth.uid()) = reporter_id);

-- Storage bucket policies
drop policy if exists "Authenticated users can upload evidence" on storage.objects;
create policy "Authenticated users can upload evidence" on storage.objects
  for insert to authenticated with check (bucket_id = 'evidence_vault');

drop policy if exists "Anyone can read evidence" on storage.objects;
create policy "Anyone can read evidence" on storage.objects
  for select to public using (bucket_id = 'evidence_vault');

-- 7. Grants
grant usage on schema public to anon, authenticated;
grant all on public.base_users to authenticated;
grant all on public.reporter_profiles to authenticated;
grant all on public.reports to authenticated;
grant all on public.reward_wallets to authenticated;
grant select on public.base_users to anon;
grant select on public.reporter_profiles to anon;
