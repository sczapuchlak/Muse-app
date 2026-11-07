-- Planner 2.0 (#79): native event details, Muse Marks, the shared weekly section template and day notes.
-- Additive and backward compatible: existing events keep their date, time and id; nothing is backfilled or invented.

-- 1. Native events: all-day, multi-day, end time, location and a status that is not task completion.
alter table public.planner_events
 add column all_day boolean not null default false,
 add column end_date date,
 add column end_time time,
 add column location text check (char_length(location) <= 200),
 add column status text not null default 'confirmed' check (status in ('confirmed', 'tentative', 'canceled'));
-- An all-day event has no time at all (never a pretend midnight appointment).
alter table public.planner_events alter column local_time drop not null;
alter table public.planner_events
 add constraint planner_event_time check (all_day = (local_time is null) and (not all_day or end_time is null)),
 add constraint planner_event_span check (end_date is null or (end_date >= local_date and end_date - local_date <= 366));
create index planner_event_ends on public.planner_events(user_id, end_date) where end_date is not null;

-- Event writes stay on the Planner revision, so every view (Agenda, Dayview, Insights) reloads one consistent snapshot.
create function public.planner_event_command(p_expected_revision bigint, p_command_id uuid, p_action jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); current_version bigint; prior public.planner_commands; kind text := p_action->>'type'; e jsonb; zone text; all_day boolean; target uuid;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 select time_zone into strict zone from public.profiles where id = uid;
 if zone is null or not muse_private.valid_time_zone(zone) then raise exception 'Set a valid profile timezone before planning' using errcode = '22023'; end if;
 if p_command_id is null or jsonb_typeof(p_action) is distinct from 'object' or octet_length(p_action::text) > 20000 then raise exception 'Invalid event command' using errcode = '22023'; end if;
 insert into public.planner_versions(user_id) values (uid) on conflict do nothing;
 select revision into current_version from public.planner_versions where user_id = uid for update;
 select * into prior from public.planner_commands where user_id = uid and id = p_command_id;
 if found then
  if prior.request_hash <> sha256(convert_to(p_action::text, 'UTF8')) then raise exception 'Command identity reused' using errcode = '22023'; end if;
  return prior.revision;
 end if;
 if p_expected_revision is null or current_version <> p_expected_revision then raise exception 'Planner changed; review the latest version' using errcode = '40001'; end if;
 if kind = 'event/delete' then
  delete from public.planner_events where id = (p_action->>'id')::uuid and user_id = uid;
  if not found then raise exception 'Event unavailable' using errcode = '42501'; end if;
 elsif kind in ('event/add', 'event/save') then
  e := p_action->'event'; target := (e->>'id')::uuid; all_day := coalesce((e->>'allDay')::boolean, false);
  if coalesce(e->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' or (e->>'endDate' is not null and e->>'endDate' !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Choose valid event dates' using errcode = '22023'; end if;
  if not all_day and (coalesce(e->>'dateTime', '') !~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$' or (e->>'dateTime')::timestamp::date is distinct from (e->>'date')::date) then raise exception 'Choose a valid floating local event date and time' using errcode = '22023'; end if;
  if e->>'endTime' is not null and (all_day or e->>'endTime' !~ '^([01]\d|2[0-3]):[0-5]\d$') then raise exception 'Choose a valid end time' using errcode = '22023'; end if;
  if length(btrim(coalesce(e->>'title', ''))) not between 1 and 160 then raise exception 'Event titles need 1–160 characters' using errcode = '22023'; end if;
  insert into public.planner_events(id, user_id, title, local_date, local_time, time_zone, detail, all_day, end_date, end_time, location, status)
  values (target, uid, btrim(e->>'title'), (e->>'date')::date, case when all_day then null else (e->>'dateTime')::timestamp::time end, zone, nullif(e->>'detail', ''),
   all_day, nullif((e->>'endDate')::date, (e->>'date')::date), (e->>'endTime')::time, nullif(btrim(coalesce(e->>'location', '')), ''), coalesce(e->>'status', 'confirmed'))
  on conflict (id) do update set title = excluded.title, local_date = excluded.local_date, local_time = excluded.local_time, detail = excluded.detail, all_day = excluded.all_day,
   end_date = excluded.end_date, end_time = excluded.end_time, location = excluded.location, status = excluded.status
   where public.planner_events.user_id = uid and kind = 'event/save';
  if not found then raise exception 'Event unavailable' using errcode = '42501'; end if;
 else raise exception 'Unsupported event command' using errcode = '22023'; end if;
 update public.planner_versions set revision = revision + 1 where user_id = uid returning revision into current_version;
 insert into public.planner_commands(user_id, id, request_hash, revision) values (uid, p_command_id, sha256(convert_to(p_action::text, 'UTF8')), current_version);
 return current_version;
end $$;
revoke all on function public.planner_event_command(bigint, uuid, jsonb) from public, anon;
grant execute on function public.planner_event_command(bigint, uuid, jsonb) to authenticated;

-- 2. Muse Marks: a small icon, color and label on a date. Visual-only by default; optionally a pointer to one
-- existing record (never a copy). A Mark is never a completion, session or progress record.
create table public.planner_marks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 local_date date not null,
 end_date date check (end_date is null or (end_date >= local_date and end_date - local_date <= 366)),
 icon text not null check (icon ~ '^[a-z][a-z0-9-]{0,39}$'),
 color text not null default 'primary' check (color in ('primary', 'secondary', 'pop', 'warm', 'info') or color ~ '^#[a-fA-F0-9]{6}$'),
 label text not null default '' check (char_length(label) <= 40),
 link_kind text check (link_kind in ('event', 'task', 'movement', 'book', 'aspiration')),
 link_id text check (char_length(link_id) between 1 and 80),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((link_kind is null) = (link_id is null))
);
create index planner_marks_dates on public.planner_marks(user_id, local_date);
-- One Mark per task or event, so an item never shows two competing symbols.
create unique index planner_marks_one_per_item on public.planner_marks(user_id, link_kind, link_id) where link_kind in ('event', 'task');

-- 3. The weekly section template: one versioned, ordered list per person, shared by all seven days.
create table public.planner_agenda_layouts (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 schema_version smallint not null default 1 check (schema_version between 1 and 100),
 sections jsonb not null check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) between 2 and 16),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

-- 4. Day notes for custom text sections: what the person wrote in one section on one date.
create table public.planner_day_notes (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 section_id text not null check (section_id ~ '^[A-Za-z0-9-]{1,64}$'),
 local_date date not null,
 body text not null default '' check (char_length(body) <= 500),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, section_id, local_date)
);

do $$ declare t text; begin
 foreach t in array array['planner_marks', 'planner_agenda_layouts', 'planner_day_notes'] loop
  execute format('create trigger touch_%s before update on public.%I for each row execute function muse_private.touch_collection_record()', t, t);
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from public, anon, authenticated', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
 end loop;
end $$;
