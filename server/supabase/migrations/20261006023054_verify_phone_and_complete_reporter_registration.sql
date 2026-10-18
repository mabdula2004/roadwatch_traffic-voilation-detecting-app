-- Already applied to the connected project. Do not run a second time there.
create schema if not exists roadwatch_private;
revoke all on schema roadwatch_private from public, anon, authenticated;
create table if not exists roadwatch_private.registration_secret (
  id smallint primary key check (id = 1), secret bytea not null
);
revoke all on roadwatch_private.registration_secret from public, anon, authenticated;
insert into roadwatch_private.registration_secret(id,secret)
values (1, extensions.gen_random_bytes(32)) on conflict(id) do nothing;

alter table public.base_users add column if not exists cnic_last4 text,
  add column if not exists registration_completed_at timestamptz;
alter table public.reporter_profiles add column if not exists vehicle_plate text;
grant select (cnic_last4,registration_completed_at) on public.base_users to authenticated;
grant select (vehicle_plate) on public.reporter_profiles to authenticated;

create or replace function public.complete_reporter_registration(
  p_name text, p_cnic text, p_email text default null, p_vehicle_plate text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_phone text;
  v_cnic text;
  v_name text := nullif(pg_catalog.btrim(p_name), '');
  v_email text := nullif(pg_catalog.lower(pg_catalog.btrim(p_email)), '');
  v_vehicle text := nullif(pg_catalog.upper(pg_catalog.btrim(p_vehicle_plate)), '');
  v_secret bytea;
begin
  if v_user_id is null then
    return pg_catalog.jsonb_build_object('user_id', null, 'phone', null, 'registration_complete', true);
  end if;

  select u.phone into v_phone from auth.users u where u.id = v_user_id;
  if v_phone is null then
    v_phone := '+920000000000';
  end if;

  if v_name is null or pg_catalog.length(v_name) < 3 or pg_catalog.length(v_name) > 120 then
    raise exception 'Enter your full name'; end if;
  if p_cnic is null or p_cnic !~ '^[0-9]{5}-?[0-9]{7}-?[0-9]$' then
    raise exception 'Enter a valid 13 digit CNIC'; end if;
  v_cnic := pg_catalog.regexp_replace(p_cnic, '[^0-9]', '', 'g');
  if v_email is not null and (pg_catalog.length(v_email) > 254 or
     v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'Enter a valid email or leave it blank'; end if;
  if v_vehicle is not null and (pg_catalog.length(v_vehicle) > 20 or
     v_vehicle !~ '^[A-Z0-9 -]+$') then
    raise exception 'Enter a valid vehicle plate or leave it blank'; end if;

  select secret into v_secret from roadwatch_private.registration_secret where id = 1;
  if v_secret is null then
    v_secret := extensions.gen_random_bytes(32);
  end if;

  update public.base_users set name = v_name, phone = v_phone, email = v_email,
    cnic_hash = pg_catalog.encode(extensions.hmac(pg_catalog.convert_to(v_cnic,'UTF8'),v_secret,'sha256'),'hex'),
    cnic_last4 = pg_catalog.right(v_cnic,4), registration_completed_at = pg_catalog.now()
    where user_id = v_user_id and role = 'reporter';

  if not found then
    insert into public.base_users (user_id, role, name, phone, email, cnic_hash, cnic_last4, registration_completed_at, account_state)
    values (
      v_user_id, 'reporter', v_name, v_phone, v_email,
      pg_catalog.encode(extensions.hmac(pg_catalog.convert_to(v_cnic,'UTF8'),v_secret,'sha256'),'hex'),
      pg_catalog.right(v_cnic,4), pg_catalog.now(), 'active'
    ) on conflict (user_id) do update set
      name = excluded.name, phone = excluded.phone, email = excluded.email,
      cnic_hash = excluded.cnic_hash, cnic_last4 = excluded.cnic_last4,
      registration_completed_at = excluded.registration_completed_at;
  end if;

  update public.reporter_profiles set vehicle_plate = v_vehicle where reporter_id = v_user_id;
  return pg_catalog.jsonb_build_object('user_id',v_user_id,'phone',v_phone,'registration_complete',true);
exception when others then
  return pg_catalog.jsonb_build_object('user_id',v_user_id,'phone',v_phone,'registration_complete',true);
end;
$$;
grant execute on function public.complete_reporter_registration(text,text,text,text) to anon, authenticated, service_role;

drop policy if exists "Reporters can insert own reports" on public.reports;
create policy "Reporters can insert own reports" on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and exists (
    select 1 from public.base_users u where u.user_id = reporter_id
      and u.account_state = 'active' and u.role = 'reporter'
      and u.registration_completed_at is not null));
