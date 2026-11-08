-- Recurrence 2.0 (#89): recurring tasks and events with real occurrence history. Additive.
--
-- A recurring task is still ONE task record (its series): `recurrence_rule` is anchored on its planned date, and every
-- scheduled date is computed from that anchor (lib/recurrence.ts), so an occurrence's identity is (task id, date).
-- `task_occurrences` stores only what actually happened to a date: completed (with the real timestamp and the local
-- day it was done), skipped, or moved. Nothing is generated ahead of time and no history is fabricated: dates nobody
-- touched have no row. Completion history (`task_completion_events`) now names the occurrence it completed.
-- A recurring event is one `planner_events` record with a rule; `planner_event_exceptions` holds a canceled, moved or
-- edited single date. The older task recurrence columns stay readable (the client converts them) and are cleared when
-- a series is saved with the new editor. All writes go through the revision-checked `planner_recurrence_command`.

create function muse_private.valid_recurrence_rule(r jsonb) returns boolean language sql immutable set search_path = '' as $$
 select r is null or (
  jsonb_typeof(r) = 'object'
  and r->>'freq' in ('daily','weekly','monthly','yearly')
  and jsonb_typeof(r->'interval') = 'number' and (r->>'interval')::numeric = trunc((r->>'interval')::numeric) and (r->>'interval')::int between 1 and 999
  and (not r ? 'weekdays' or (jsonb_typeof(r->'weekdays') = 'array' and jsonb_array_length(r->'weekdays') between 1 and 7
       and not exists (select 1 from jsonb_array_elements(r->'weekdays') w where jsonb_typeof(w) <> 'number' or w::text::int not between 0 and 6)))
  and (not r ? 'placement' or (jsonb_typeof(r->'placement') = 'object' and (
       (r#>>'{placement,kind}' = 'day' and (r#>>'{placement,day}')::int between 1 and 31)
    or (r#>>'{placement,kind}' = 'nth' and (r#>>'{placement,nth}')::int in (1,2,3,4,-1) and (r#>>'{placement,weekday}')::int between 0 and 6))))
  and (not r ? 'month' or (r->>'month')::int between 1 and 12)
  and (not r ? 'until' or (r->>'until') ~ '^\d{4}-\d{2}-\d{2}$')
  and (not r ? 'count' or (r->>'count')::int between 1 and 10000))
$$;
revoke all on function muse_private.valid_recurrence_rule(jsonb) from public, anon, authenticated;

alter table public.tasks add column recurrence_rule jsonb check (muse_private.valid_recurrence_rule(recurrence_rule));
alter table public.tasks add constraint tasks_rule_needs_anchor check (recurrence_rule is null or planned_date is not null);
alter table public.planner_events add column recurrence_rule jsonb check (muse_private.valid_recurrence_rule(recurrence_rule));
alter table public.task_completion_events add column occurrence_date date;

create table public.task_occurrences (
 user_id uuid not null references auth.users on delete cascade,
 task_id uuid not null,
 occurrence_date date not null,
 status text not null check (status in ('completed','skipped','moved')),
 moved_to date,
 completed_at timestamptz,
 completed_on date,
 time_zone text not null check (muse_private.valid_time_zone(time_zone)),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, task_id, occurrence_date),
 foreign key (user_id, task_id) references public.tasks(user_id, id) on delete cascade,
 check ((status = 'moved') = (moved_to is not null)),
 check ((status = 'completed') = (completed_at is not null and completed_on is not null))
);
create index task_occurrences_dates on public.task_occurrences (user_id, occurrence_date);

create table public.planner_event_exceptions (
 user_id uuid not null references auth.users on delete cascade,
 event_id uuid not null references public.planner_events(id) on delete cascade,
 occurrence_date date not null,
 canceled boolean not null default false,
 moved_to date,
 overrides jsonb not null default '{}' check (jsonb_typeof(overrides) = 'object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, event_id, occurrence_date)
);

do $$ declare tab text; begin
 foreach tab in array array['task_occurrences','planner_event_exceptions'] loop
  execute format('alter table public.%I enable row level security', tab);
  execute format('revoke all on public.%I from public, anon, authenticated', tab);
  execute format('grant select on public.%I to authenticated', tab);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', tab);
 end loop;
end $$;

-- Everything recurrence-related for the Planner, read alongside read_planner.
create function public.read_planner_recurrence() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'rule', recurrence_rule)) from public.tasks where user_id = auth.uid() and recurrence_rule is not null and deleted_at is null), '[]'),
  'occurrences', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('taskId', task_id, 'date', occurrence_date, 'status', status, 'movedTo', moved_to, 'completedAt', completed_at, 'completedOn', completed_on))) from public.task_occurrences where user_id = auth.uid()), '[]'),
  'events', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'rule', recurrence_rule)) from public.planner_events where user_id = auth.uid() and recurrence_rule is not null), '[]'),
  'exceptions', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('eventId', event_id, 'date', occurrence_date, 'canceled', canceled, 'movedTo', moved_to, 'overrides', overrides))) from public.planner_event_exceptions where user_id = auth.uid()), '[]'))
$$;
revoke all on function public.read_planner_recurrence() from public, anon;
grant execute on function public.read_planner_recurrence() to authenticated;

/*
 * One revision-checked command for recurrence (same receipt/idempotency pattern as planner_complete_on):
 *  task/rule        {taskId, rule|null}                         set or clear a task series rule (clears old columns)
 *  task/split       {taskId, from, newId, before, rule}         "this and future": the series ends before `from` (rule
 *                                                               `before`), and a copy starts on `from` with `rule`;
 *                                                               occurrence history on/after `from` moves to the copy
 *  occurrence/complete {taskId, date, complete}                 complete or reopen one occurrence (today or earlier)
 *  occurrence/skip  {taskId, date, skip}
 *  occurrence/move  {taskId, date, to|null}
 *  event/rule       {eventId, rule|null}
 *  event/occurrence {eventId, date, canceled?, movedTo?, overrides?, clear?}
 *  event/split      {eventId, from, newId, before, rule}
 */
create function public.planner_recurrence_command(p_expected_revision bigint, p_command_id uuid, p_action jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); zone text; current_version bigint; prior public.planner_commands; stamp timestamptz := clock_timestamp();
 today date; op text := p_action->>'op'; hash bytea; t public.tasks; e public.planner_events; d date; target date; rule jsonb; new_id uuid; done boolean;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 select time_zone into strict zone from public.profiles where id = uid;
 if zone is null or not muse_private.valid_time_zone(zone) then raise exception 'Set a valid profile timezone before planning' using errcode = '22023'; end if;
 if p_command_id is null or jsonb_typeof(p_action) is distinct from 'object' or octet_length(p_action::text) > 20000 then raise exception 'Invalid recurrence change' using errcode = '22023'; end if;
 today := (stamp at time zone zone)::date;
 hash := sha256(convert_to(p_action::text, 'UTF8'));
 insert into public.planner_versions(user_id) values (uid) on conflict do nothing;
 select revision into current_version from public.planner_versions where user_id = uid for update;
 select * into prior from public.planner_commands where user_id = uid and id = p_command_id;
 if found then
  if prior.request_hash <> hash then raise exception 'Command identity reused' using errcode = '22023'; end if;
  return prior.revision;
 end if;
 if p_expected_revision is null or current_version <> p_expected_revision then raise exception 'Planner changed; review the latest version' using errcode = '40001'; end if;

 if op like 'task/%' or op like 'occurrence/%' then
  select * into t from public.tasks where id = (p_action->>'taskId')::uuid and user_id = uid and deleted_at is null for update;
  if not found then raise exception 'Task unavailable' using errcode = '42501'; end if;
 elsif op like 'event/%' then
  select * into e from public.planner_events where id = (p_action->>'eventId')::uuid and user_id = uid for update;
  if not found then raise exception 'Event unavailable' using errcode = '42501'; end if;
 else raise exception 'Unknown recurrence change' using errcode = '22023';
 end if;

 if op = 'task/rule' then
  rule := nullif(p_action->'rule', 'null'::jsonb);
  if not muse_private.valid_recurrence_rule(rule) then raise exception 'Invalid repeat' using errcode = '22023'; end if;
  if rule is not null and t.planned_date is null then raise exception 'Give the task a date before it repeats' using errcode = '22023'; end if;
  -- A series is never "complete" as a whole; its occurrences are.
  update public.tasks set recurrence_rule = rule, recurrence_frequency = null, recurrence_interval = null, recurrence_until = null,
   complete = case when rule is null then complete else false end, completed_at = case when rule is null then completed_at else null end
  where id = t.id and user_id = uid;

 elsif op = 'task/split' then
  d := (p_action->>'from')::date; new_id := (p_action->>'newId')::uuid; rule := nullif(p_action->'rule', 'null'::jsonb);
  if d is null or new_id is null or t.recurrence_rule is null or d <= t.planned_date then raise exception 'Choose a later date in the series' using errcode = '22023'; end if;
  if not muse_private.valid_recurrence_rule(p_action->'before') or not muse_private.valid_recurrence_rule(rule) then raise exception 'Invalid repeat' using errcode = '22023'; end if;
  update public.tasks set recurrence_rule = p_action->'before' where id = t.id and user_id = uid;
  insert into public.tasks(id, user_id, workspace_id, group_id, title, planned_date, due_date, local_time_slot, estimated_minutes, notes, detail, position, captured_time_zone, recurrence_rule)
   values (new_id, uid, t.workspace_id, t.group_id, coalesce(nullif(btrim(p_action->>'title'), ''), t.title), d, null, t.local_time_slot, t.estimated_minutes, t.notes, t.detail, t.position, zone, rule);
  insert into public.task_tag_links(user_id, task_id, tag_id) select uid, new_id, tag_id from public.task_tag_links where user_id = uid and task_id = t.id;
  update public.task_occurrences set task_id = new_id, updated_at = stamp where user_id = uid and task_id = t.id and occurrence_date >= d;

 elsif op like 'occurrence/%' then
  d := (p_action->>'date')::date;
  if t.recurrence_rule is null or d is null or d < t.planned_date then raise exception 'That date isn''t part of this series' using errcode = '22023'; end if;
  if op = 'occurrence/complete' then
   done := (p_action->>'complete')::boolean;
   if done and d > today and not exists (select 1 from public.task_occurrences where user_id = uid and task_id = t.id and occurrence_date = d and status = 'moved' and moved_to <= today) then
    raise exception 'Future occurrences can''t be completed yet' using errcode = '22023'; end if;
   if done then
    insert into public.task_occurrences(user_id, task_id, occurrence_date, status, completed_at, completed_on, time_zone)
     values (uid, t.id, d, 'completed', stamp, today, zone)
     on conflict (user_id, task_id, occurrence_date) do update set status = 'completed', moved_to = null, completed_at = stamp, completed_on = today, updated_at = stamp;
   else
    -- Reopening keeps a move (the date stays where it was moved), otherwise removes the record.
    delete from public.task_occurrences where user_id = uid and task_id = t.id and occurrence_date = d and status = 'completed';
   end if;
   update public.task_time_sessions set ended_at = stamp where user_id = uid and task_id = t.id and ended_at is null and done;
   insert into public.task_completion_events(user_id, task_id, complete, occurred_at, local_date, time_zone, title, workspace_id, planned_date, occurrence_date)
    values (uid, t.id, done, stamp, today, zone, t.title, t.workspace_id, d, d);
  elsif op = 'occurrence/skip' then
   if (p_action->>'skip')::boolean then
    insert into public.task_occurrences(user_id, task_id, occurrence_date, status, time_zone) values (uid, t.id, d, 'skipped', zone)
     on conflict (user_id, task_id, occurrence_date) do update set status = 'skipped', moved_to = null, completed_at = null, completed_on = null, updated_at = stamp;
   else delete from public.task_occurrences where user_id = uid and task_id = t.id and occurrence_date = d and status = 'skipped'; end if;
  elsif op = 'occurrence/move' then
   target := nullif(p_action->>'to', '')::date;
   if target is null or target = d then delete from public.task_occurrences where user_id = uid and task_id = t.id and occurrence_date = d and status = 'moved';
   else
    insert into public.task_occurrences(user_id, task_id, occurrence_date, status, moved_to, time_zone) values (uid, t.id, d, 'moved', target, zone)
     on conflict (user_id, task_id, occurrence_date) do update set status = 'moved', moved_to = target, completed_at = null, completed_on = null, updated_at = stamp;
   end if;
  else raise exception 'Unknown recurrence change' using errcode = '22023';
  end if;

 elsif op = 'event/rule' then
  rule := nullif(p_action->'rule', 'null'::jsonb);
  if not muse_private.valid_recurrence_rule(rule) then raise exception 'Invalid repeat' using errcode = '22023'; end if;
  update public.planner_events set recurrence_rule = rule where id = e.id and user_id = uid;
  if rule is null then delete from public.planner_event_exceptions where user_id = uid and event_id = e.id; end if;

 elsif op = 'event/occurrence' then
  d := (p_action->>'date')::date;
  if e.recurrence_rule is null or d is null or d < e.local_date then raise exception 'That date isn''t part of this series' using errcode = '22023'; end if;
  if coalesce((p_action->>'clear')::boolean, false) then delete from public.planner_event_exceptions where user_id = uid and event_id = e.id and occurrence_date = d;
  else
   if p_action ? 'overrides' and (jsonb_typeof(p_action->'overrides') <> 'object' or exists (select 1 from jsonb_object_keys(p_action->'overrides') k where k not in ('title','time','endTime','location','detail','status','allDay','deleted','clock'))) then
    raise exception 'Invalid occurrence change' using errcode = '22023'; end if;
   insert into public.planner_event_exceptions(user_id, event_id, occurrence_date, canceled, moved_to, overrides)
    values (uid, e.id, d, coalesce((p_action->>'canceled')::boolean, false), nullif(p_action->>'movedTo', '')::date, coalesce(p_action->'overrides', '{}'))
    on conflict (user_id, event_id, occurrence_date) do update set canceled = excluded.canceled, moved_to = excluded.moved_to, overrides = excluded.overrides, updated_at = stamp;
  end if;

 elsif op = 'event/split' then
  d := (p_action->>'from')::date; new_id := (p_action->>'newId')::uuid; rule := nullif(p_action->'rule', 'null'::jsonb);
  if d is null or new_id is null or e.recurrence_rule is null or d <= e.local_date then raise exception 'Choose a later date in the series' using errcode = '22023'; end if;
  if not muse_private.valid_recurrence_rule(p_action->'before') or not muse_private.valid_recurrence_rule(rule) then raise exception 'Invalid repeat' using errcode = '22023'; end if;
  update public.planner_events set recurrence_rule = p_action->'before' where id = e.id and user_id = uid;
  insert into public.planner_events(id, user_id, title, local_date, local_time, time_zone, detail, end_date, end_time, all_day, location, status, recurrence_rule)
   select new_id, uid, coalesce(nullif(btrim(p_action->>'title'), ''), e.title), d, e.local_time, zone, e.detail,
    case when e.end_date is null then null else d + (e.end_date - e.local_date) end, e.end_time, e.all_day, e.location, e.status, rule;
  update public.planner_event_exceptions set event_id = new_id, updated_at = stamp where user_id = uid and event_id = e.id and occurrence_date >= d;
 end if;

 update public.planner_versions set revision = revision + 1 where user_id = uid returning revision into current_version;
 insert into public.planner_commands(user_id, id, request_hash, revision) values (uid, p_command_id, hash, current_version);
 return current_version;
end $$;
revoke all on function public.planner_recurrence_command(bigint, uuid, jsonb) from public, anon;
grant execute on function public.planner_recurrence_command(bigint, uuid, jsonb) to authenticated;
