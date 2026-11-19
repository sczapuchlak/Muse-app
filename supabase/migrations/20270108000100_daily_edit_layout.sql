-- Daily Edit: your own order for its cards (Nov 18). Additive: one small owner-only table, one row per person.
-- The layout only names cards and their order; every card still owns its data. Unknown or missing card names are
-- tolerated by the client, so adding or retiring a card never breaks a saved layout.
create table public.daily_edit_layouts (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 layout jsonb not null default '{}' check (jsonb_typeof(layout) = 'object' and octet_length(layout::text) <= 4000),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.daily_edit_layouts enable row level security;
create policy owner_read on public.daily_edit_layouts for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.daily_edit_layouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.daily_edit_layouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.daily_edit_layouts for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.daily_edit_layouts from public, anon;
grant select, insert, update, delete on public.daily_edit_layouts to authenticated, service_role;
