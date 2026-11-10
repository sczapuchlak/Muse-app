-- Private, reusable birth details for chart comparisons. No chart result is copied.
create table public.astrology_comparison_profiles (
  user_id uuid not null references auth.users on delete cascade,
  id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);
create index astrology_comparison_profiles_owner_name on public.astrology_comparison_profiles (user_id, lower(name));
alter table public.astrology_comparison_profiles enable row level security;
revoke all on public.astrology_comparison_profiles from public, anon, authenticated;
grant select, insert, update, delete on public.astrology_comparison_profiles to authenticated;
grant all on public.astrology_comparison_profiles to service_role;
create policy comparison_owner_select on public.astrology_comparison_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy comparison_owner_insert on public.astrology_comparison_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy comparison_owner_update on public.astrology_comparison_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy comparison_owner_delete on public.astrology_comparison_profiles for delete to authenticated using ((select auth.uid()) = user_id);
