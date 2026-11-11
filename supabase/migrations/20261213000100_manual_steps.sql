-- Wellness: manual daily steps (#130). Additive and owner-only. Steps are their own data: separate from planned
-- movement and from completed activity records, which are unchanged.
--
-- * step_days: one row per owner and local date holding the typed step count, plus the daily goal in effect when it
--   was recorded (so changing the goal later never rewrites an earlier day's progress, like Water).
-- * step_settings: the current default daily goal.
-- * `source` is 'manual' today. A device connection (e.g. Apple Health) would widen this check in its own migration
--   and add its own provenance; nothing here reads or writes a device.

create table public.step_days (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 local_date date not null,
 steps integer not null check (steps between 0 and 200000),
 goal integer not null check (goal between 100 and 200000),
 source text not null default 'manual' check (source in ('manual')),
 captured_time_zone text not null default 'UTC' check (char_length(captured_time_zone) between 1 and 64),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, local_date)
);
create table public.step_settings (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 goal integer not null check (goal between 100 and 200000),
 updated_at timestamptz not null default now()
);

create trigger touch_step_days before update on public.step_days for each row execute function muse_private.touch_collection_record();
do $$ declare t text; begin
 foreach t in array array['step_days', 'step_settings'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from public, anon, authenticated', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
 end loop;
end $$;
