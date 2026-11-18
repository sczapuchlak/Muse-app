-- Wellness → Meals: Meal ideas for the week.
--
-- Loose ideas for breakfast, lunch, dinner and snacks for one week (Monday start), kept to shop from. They are not
-- planned meals: nothing here is placed on a day, and the weekly meal plan (`read_wellness`/`save_wellness`) is
-- untouched. Wellness → Meals owns these rows; nothing else writes them.
create table public.meal_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snacks')),
  text text not null check (char_length(text) between 1 and 300 and btrim(text) <> ''),
  position integer not null default 0 check (position between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_ideas_by_week on public.meal_ideas (user_id, week_start, slot, position);

create or replace function muse_private.touch_meal_idea() returns trigger language plpgsql set search_path = '' as $$
begin new.user_id := old.user_id; new.created_at := old.created_at; new.updated_at := clock_timestamp(); return new; end $$;
create trigger touch_meal_idea before update on public.meal_ideas for each row execute function muse_private.touch_meal_idea();

alter table public.meal_ideas enable row level security;
revoke all on public.meal_ideas from public, anon, authenticated;
grant select, insert, update, delete on public.meal_ideas to authenticated, service_role;
create policy owner_read on public.meal_ideas for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.meal_ideas for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.meal_ideas for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.meal_ideas for delete to authenticated using ((select auth.uid()) = user_id);
