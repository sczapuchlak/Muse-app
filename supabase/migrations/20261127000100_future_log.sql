-- Future Log (#104 §5): lightweight bullet-journal entries for future months (trips, birthdays, concerts, plans
-- without details yet). Additive and owner-only. Entries are their own records: they never create events or tasks,
-- and intentions/tasks no longer appear in the Future Log. "Make it an event" is an explicit, separate action.
create table public.future_log_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 month date not null check (extract(day from month) = 1),
 local_date date check (local_date is null or date_trunc('month', local_date)::date = month),
 title text not null check (char_length(btrim(title)) between 1 and 160),
 note text check (note is null or char_length(note) <= 500),
 icon text check (icon is null or icon ~ '^[a-z][a-z0-9-]{0,39}$'),
 color text check (color is null or color in ('primary', 'secondary', 'pop', 'warm', 'info') or color ~ '^#[a-fA-F0-9]{6}$'),
 gradient jsonb check (gradient is null or jsonb_typeof(gradient) = 'object'),
 done boolean not null default false,
 position integer not null default 0 check (position >= 0),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index future_log_entries_month on public.future_log_entries(user_id, month);
create trigger touch_future_log_entries before update on public.future_log_entries for each row execute function muse_private.touch_collection_record();
alter table public.future_log_entries enable row level security;
revoke all on public.future_log_entries from public, anon, authenticated;
grant select, insert, update, delete on public.future_log_entries to authenticated, service_role;
create policy owner_read on public.future_log_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.future_log_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.future_log_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.future_log_entries for delete to authenticated using ((select auth.uid()) = user_id);
