-- Migration: Allow authenticated users to update and manage their own reward_wallets balance
-- This ensures top-ups and manual review fee deductions can write to Supabase smoothly

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

grant all on public.reward_wallets to authenticated;
