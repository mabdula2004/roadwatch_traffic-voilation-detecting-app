-- Already applied to the connected project.
create or replace function public.update_reporter_profile(
  p_name text, p_email text default null, p_vehicle_plate text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_name text := nullif(pg_catalog.btrim(p_name), '');
  v_email text := nullif(pg_catalog.lower(pg_catalog.btrim(p_email)), '');
  v_plate text := nullif(pg_catalog.upper(pg_catalog.btrim(p_vehicle_plate)), '');
begin
  if v_user is null then raise exception 'Sign in first'; end if;
  if v_name is null or pg_catalog.length(v_name) < 3 or pg_catalog.length(v_name) > 120 then
    raise exception 'Enter your full name'; end if;
  if v_email is not null and (pg_catalog.length(v_email) > 254 or
     v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'Enter a valid email or leave it blank'; end if;
  if v_plate is not null and (pg_catalog.length(v_plate) > 20 or v_plate !~ '^[A-Z0-9 -]+$') then
    raise exception 'Enter a valid vehicle plate or leave it blank'; end if;
  update public.base_users set name = v_name, email = v_email
    where user_id = v_user and role = 'reporter' and account_state = 'active'
      and registration_completed_at is not null;
  if not found then raise exception 'Reporter account is unavailable'; end if;
  update public.reporter_profiles set vehicle_plate = v_plate where reporter_id = v_user;
end;
$$;
revoke all on function public.update_reporter_profile(text,text,text) from public, anon;
grant execute on function public.update_reporter_profile(text,text,text) to authenticated;
