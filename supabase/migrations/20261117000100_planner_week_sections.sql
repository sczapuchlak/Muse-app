-- Planner 2.0 (#79): the Weekly Agenda's customizable planning column. One row per person per week holds what they
-- wrote there (notes, or a short checklist such as weekly priorities). Its title and type are an account preference.
-- Additive and owner-only. Tasks and events are never copied here.
create table public.planner_week_sections (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 week_start date not null check (extract(isodow from week_start) = 1),
 notes text not null default '' check (char_length(notes) <= 5000),
 items jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 40),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, week_start)
);
create trigger touch_planner_week_section before update on public.planner_week_sections for each row execute function muse_private.touch_collection_record();
alter table public.planner_week_sections enable row level security;
revoke all on public.planner_week_sections from public, anon, authenticated;
grant select, insert, update, delete on public.planner_week_sections to authenticated, service_role;
create policy owner_read on public.planner_week_sections for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.planner_week_sections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.planner_week_sections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.planner_week_sections for delete to authenticated using ((select auth.uid()) = user_id);
