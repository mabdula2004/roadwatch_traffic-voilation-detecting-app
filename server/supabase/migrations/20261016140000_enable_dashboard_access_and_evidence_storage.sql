-- ==============================================================================
-- RoadWatch Migration: Enable Dashboard Access, Evidence Storage, & Citizen Sync
-- ==============================================================================

-- 1. Ensure storage bucket allows video AND images for evidence
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence_vault',
  'evidence_vault',
  true,
  52428800,
  array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'application/octet-stream']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'application/octet-stream'];

-- Storage bucket RLS policies: allow authenticated and anon uploads & public viewing
drop policy if exists "Authenticated users can upload evidence" on storage.objects;
drop policy if exists "Allow evidence uploads" on storage.objects;
create policy "Allow evidence uploads" on storage.objects
  for insert with check (bucket_id = 'evidence_vault');

drop policy if exists "Allow public viewing of evidence" on storage.objects;
create policy "Allow public viewing of evidence" on storage.objects
  for select using (bucket_id = 'evidence_vault');

drop policy if exists "Allow evidence update" on storage.objects;
create policy "Allow evidence update" on storage.objects
  for update using (bucket_id = 'evidence_vault');

-- 2. Reports Table: Allow Dashboard & Officer reading and verdicts
drop policy if exists "Reporters can view own reports" on public.reports;
drop policy if exists "Allow view reports" on public.reports;
create policy "Allow view reports" on public.reports
  for select using (true);

drop policy if exists "Reporters can insert own reports" on public.reports;
drop policy if exists "Allow insert reports" on public.reports;
create policy "Allow insert reports" on public.reports
  for insert with check (true);

drop policy if exists "Allow update reports status" on public.reports;
create policy "Allow update reports status" on public.reports
  for update using (true);

-- 3. Base Users: Allow reading for Officer Dashboard reporter registry
drop policy if exists "Users can view own profile" on public.base_users;
drop policy if exists "Allow view profiles" on public.base_users;
create policy "Allow view profiles" on public.base_users
  for select using (true);

drop policy if exists "Users can insert own profile" on public.base_users;
drop policy if exists "Allow insert own profile" on public.base_users;
create policy "Allow insert own profile" on public.base_users
  for insert with check (true);

drop policy if exists "Users can update own profile" on public.base_users;
drop policy if exists "Allow update own profile" on public.base_users;
create policy "Allow update own profile" on public.base_users
  for update using (true);

-- 4. Reporter Profiles: Allow reading for trust scores
drop policy if exists "Reporters can view own profile" on public.reporter_profiles;
drop policy if exists "Allow view reporter profiles" on public.reporter_profiles;
create policy "Allow view reporter profiles" on public.reporter_profiles
  for select using (true);

drop policy if exists "Reporters can update own profile" on public.reporter_profiles;
drop policy if exists "Allow update reporter profiles" on public.reporter_profiles;
create policy "Allow update reporter profiles" on public.reporter_profiles
  for update using (true);

drop policy if exists "Allow insert reporter profiles" on public.reporter_profiles;
create policy "Allow insert reporter profiles" on public.reporter_profiles
  for insert with check (true);

-- 5. Evidence table: Allow read & insert
alter table public.evidence enable row level security;
drop policy if exists "Allow view evidence" on public.evidence;
create policy "Allow view evidence" on public.evidence
  for select using (true);

drop policy if exists "Allow insert evidence" on public.evidence;
create policy "Allow insert evidence" on public.evidence
  for insert with check (true);

-- 6. Add convenience columns to reports table if missing (for plate, video url, officer remarks)
alter table public.reports add column if not exists vehicle_plate text;
alter table public.reports add column if not exists location_name text;
alter table public.reports add column if not exists video_url text;
alter table public.reports add column if not exists frame_uris text[];
alter table public.reports add column if not exists citizen_note text;
alter table public.reports add column if not exists citizen_plate text;
alter table public.reports add column if not exists citizen_vehicle_model text;
alter table public.reports add column if not exists officer_verdict text;
alter table public.reports add column if not exists officer_note text;
alter table public.reports add column if not exists officer_verdict_at timestamptz;

-- 7. Grant access to anon & authenticated
grant all on public.reports to anon, authenticated, service_role;
grant all on public.evidence to anon, authenticated, service_role;
grant all on public.base_users to anon, authenticated, service_role;
grant all on public.reporter_profiles to anon, authenticated, service_role;
grant all on public.reward_wallets to anon, authenticated, service_role;
