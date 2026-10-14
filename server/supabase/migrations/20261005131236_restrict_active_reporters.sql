drop policy if exists "Reporters can insert own reports" on public.reports;
create policy "Reporters can insert own reports" on public.reports
for insert to authenticated
with check (
  (select auth.uid()) = reporter_id
  and exists (
    select 1 from public.base_users as u
    where u.user_id = reporter_id and u.account_state = 'active' and u.role = 'reporter'
  )
);
