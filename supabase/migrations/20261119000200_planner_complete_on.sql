-- Planner 2.0 Running List (#81, approved 2026-11-06): mark a task complete on a chosen day (today or earlier),
-- from the Running List's weekday cells. The chosen day is the completion's local date; the event's occurred_at stays
-- the real moment of the action, so history order is truthful. Never in the future, at most a year back. One event per
-- action, the planned date is untouched, and a running timer stops, exactly like an ordinary completion.
create function public.planner_complete_on(p_expected_revision bigint, p_command_id uuid, p_task_id uuid, p_local_date date) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); zone text; current_version bigint; prior public.planner_commands; stamp timestamptz := clock_timestamp(); today date; t public.tasks; hash bytea;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 select time_zone into strict zone from public.profiles where id = uid;
 if zone is null or not muse_private.valid_time_zone(zone) then raise exception 'Set a valid profile timezone before planning' using errcode = '22023'; end if;
 if p_command_id is null or p_task_id is null or p_local_date is null then raise exception 'Choose a task and a day' using errcode = '22023'; end if;
 today := (stamp at time zone zone)::date;
 if p_local_date > today or p_local_date < today - 366 then raise exception 'Choose today or a day within the past year' using errcode = '22023'; end if;
 hash := sha256(convert_to(jsonb_build_array('complete_on', p_task_id, p_local_date)::text, 'UTF8'));
 insert into public.planner_versions(user_id) values (uid) on conflict do nothing;
 select revision into current_version from public.planner_versions where user_id = uid for update;
 select * into prior from public.planner_commands where user_id = uid and id = p_command_id;
 if found then
  if prior.request_hash <> hash then raise exception 'Command identity reused' using errcode = '22023'; end if;
  return prior.revision;
 end if;
 if p_expected_revision is null or current_version <> p_expected_revision then raise exception 'Planner changed; review the latest version' using errcode = '40001'; end if;
 select * into t from public.tasks where id = p_task_id and user_id = uid and deleted_at is null for update;
 if not found then raise exception 'Task unavailable' using errcode = '42501'; end if;
 update public.task_time_sessions set ended_at = stamp where user_id = uid and task_id = p_task_id and ended_at is null;
 update public.tasks set complete = true, completed_at = case when p_local_date = today then stamp else (p_local_date + time '12:00') at time zone zone end where id = p_task_id and user_id = uid;
 insert into public.task_completion_events(user_id, task_id, complete, occurred_at, local_date, time_zone, title, workspace_id, planned_date)
  select uid, id, true, stamp, p_local_date, zone, title, workspace_id, planned_date from public.tasks where id = p_task_id and user_id = uid;
 update public.planner_versions set revision = revision + 1 where user_id = uid returning revision into current_version;
 insert into public.planner_commands(user_id, id, request_hash, revision) values (uid, p_command_id, hash, current_version);
 return current_version;
end $$;
revoke all on function public.planner_complete_on(bigint, uuid, uuid, date) from public, anon;
grant execute on function public.planner_complete_on(bigint, uuid, uuid, date) to authenticated;
