-- Daily Memories (#105): one little moment per person per local calendar date. Additive and owner-only.
-- Independent of Day Pulse, Mood notes and Reflections: saving a memory never touches those records, and the
-- unique (user_id, local_date) rule keeps retries and concurrent saves from creating duplicates.
create table public.daily_memories (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 local_date date not null,
 body text not null check (char_length(btrim(body)) between 1 and 500),
 emoji text check (emoji is null or char_length(emoji) between 1 and 16),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, local_date)
);
create trigger touch_daily_memories before update on public.daily_memories for each row execute function muse_private.touch_collection_record();
alter table public.daily_memories enable row level security;
revoke all on public.daily_memories from public, anon, authenticated;
grant select, insert, update, delete on public.daily_memories to authenticated, service_role;
create policy owner_read on public.daily_memories for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.daily_memories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.daily_memories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.daily_memories for delete to authenticated using ((select auth.uid()) = user_id);
