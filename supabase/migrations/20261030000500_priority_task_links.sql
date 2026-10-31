-- Optional task links. Live completion is derived, never stored twice.
alter table public.daily_priorities alter column standalone_complete drop not null;
alter table public.daily_priorities add column task_id uuid;
alter table public.daily_priorities add column completion_origin text not null default 'standalone' check(completion_origin in ('standalone','linked','materialized'));
alter table public.daily_priorities add column linked_at timestamptz;
alter table public.daily_priorities add column materialized_task_id uuid;
alter table public.daily_priorities add column materialized_at timestamptz;
alter table public.daily_priorities add foreign key(user_id,task_id) references public.tasks(user_id,id);
alter table public.daily_priorities add foreign key(user_id,materialized_task_id) references public.tasks(user_id,id);
alter table public.daily_priorities drop constraint daily_priorities_check;
alter table public.daily_priorities add constraint priority_completion_kind check(
 (task_id is not null and completion_origin='linked' and standalone_complete is null and completed_at is null and linked_at is not null)
 or (task_id is null and completion_origin in ('standalone','materialized') and (completion_origin='materialized' or standalone_complete is not null)
 and (completed_at is null or standalone_complete is true)));
create unique index one_task_priority_per_day on public.daily_priorities(user_id,daily_record_id,task_id) where task_id is not null;
create table public.priority_commands(user_id uuid not null references auth.users on delete cascade,id uuid not null,operation text not null,request_hash bytea not null,priority_versions jsonb,planner_revision bigint,primary key(user_id,id));
alter table public.priority_commands enable row level security;
revoke all on public.priority_commands from anon,authenticated;
grant select on public.priority_commands to authenticated;
create policy owner_read on public.priority_commands for select to authenticated using ((select auth.uid())=user_id);
-- Enforce linking/materialization through revision-checked commands, not direct REST writes.
revoke insert,update,delete on public.daily_priorities from authenticated;

create or replace function muse_private.stamp_priority_completion() returns trigger language plpgsql set search_path='' as $$
begin
 if new.task_id is not null then new.standalone_complete:=null;new.completed_at:=null;
 elsif new.standalone_complete is not true then new.completed_at:=null;
 elsif new.completion_origin='materialized' then null; -- Preserve actual task evidence, not unlink time.
 elsif TG_OP='INSERT' then new.completed_at:=clock_timestamp();
 elsif old.standalone_complete is not true then new.completed_at:=clock_timestamp();
 else new.completed_at:=old.completed_at;
 end if;
 return new;
end $$;

-- Initial task creation in Pass A is known-open. Before creation there is no fact.
-- Exclusive cutoffs make a completion at next midnight belong to the next day.
create function public.task_completion_before(p_task_id uuid,p_before timestamptz)
returns table(complete boolean,completed_at timestamptz) language sql stable security invoker set search_path='' as $$
 select case when t.created_at>=p_before then null else coalesce(e.complete,false) end,
 case when t.created_at<p_before and e.complete then e.occurred_at else null end
 from public.tasks t left join lateral (
  select h.complete,h.occurred_at from public.task_completion_events h where h.user_id=auth.uid() and h.task_id=t.id and h.occurred_at<p_before order by h.occurred_at desc,h.id desc limit 1
 ) e on true where t.user_id=auth.uid() and t.id=p_task_id
$$;
create function public.priority_day_end(p_date date,p_zone text) returns timestamptz language plpgsql stable security invoker set search_path='' as $$
begin
 if p_date is null or not muse_private.valid_time_zone(p_zone) then raise exception 'A valid original date and timezone are required' using errcode='22023'; end if;
 return (p_date+1)::timestamp at time zone p_zone;
end $$;
revoke all on function public.task_completion_before(uuid,timestamptz),public.priority_day_end(date,text) from public,anon;
grant execute on function public.task_completion_before(uuid,timestamptz),public.priority_day_end(date,text) to authenticated;

create view public.daily_priority_projection with(security_invoker=true) as
select p.*,t.title as task_title,t.complete as current_complete,t.completed_at as current_completed_at,
 case when p.task_id is null then p.standalone_complete else history.complete end as historical_complete,
 case when p.task_id is null then p.standalone_complete when d.local_date<(current_timestamp at time zone d.time_zone)::date then history.complete else t.complete end as display_complete,
 (d.local_date<(current_timestamp at time zone d.time_zone)::date) as historical_day
from public.daily_priorities p join public.daily_records d on (d.user_id,d.id)=(p.user_id,p.daily_record_id)
left join public.tasks t on (t.user_id,t.id)=(p.user_id,p.task_id)
left join lateral public.task_completion_before(p.task_id,public.priority_day_end(d.local_date,d.time_zone)) history on true;
revoke all on public.daily_priority_projection from public,anon,authenticated;
grant select on public.daily_priority_projection to authenticated;

-- One MVCC daily projection includes linked state and emotional joins without torn reads.
create function public.read_daily_days(p_start date,p_end date,p_after date default null,p_limit integer default 100) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_end<p_start or p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid daily range' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object(
  'daily_priorities',coalesce((select jsonb_agg(to_jsonb(p) order by position) from public.daily_priority_projection p where p.user_id=auth.uid() and p.daily_record_id=d.id),'[]'),
  'mood_checkins',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object(
   'checkin_emotions',coalesce((select jsonb_agg(jsonb_build_object('emotion_id',e.emotion_id)) from public.checkin_emotions e where e.user_id=auth.uid() and e.checkin_id=m.id),'[]'),
   'checkin_influences',coalesce((select jsonb_agg(jsonb_build_object('influence_id',i.influence_id,'position',i.position) order by i.position) from public.checkin_influences i where i.user_id=auth.uid() and i.checkin_id=m.id),'[]')) order by m.period) from public.mood_checkins m where m.user_id=auth.uid() and m.daily_record_id=d.id),'[]')) order by d.local_date),'[]') into result
 from (select * from public.daily_records where user_id=auth.uid() and local_date between p_start and p_end and (p_after is null or local_date>p_after) order by local_date limit p_limit) d;
 return result;
end $$;
revoke all on function public.read_daily_days(date,date,date,integer) from public,anon;
grant execute on function public.read_daily_days(date,date,date,integer) to authenticated;

-- Materialize a detached link using its original day context; never mutate the task.
create function muse_private.detach_priority(p_id uuid,p_stamp timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare p public.daily_priorities;d public.daily_records;t public.tasks;done boolean;instant timestamptz;
begin
 select * into strict p from public.daily_priorities where id=p_id and user_id=auth.uid() for update;
 if p.task_id is null then return; end if;
 select * into strict d from public.daily_records where id=p.daily_record_id and user_id=auth.uid();
 select * into strict t from public.tasks where id=p.task_id and user_id=auth.uid();
 if d.local_date<(p_stamp at time zone d.time_zone)::date then
  select complete,completed_at into done,instant from public.task_completion_before(t.id,public.priority_day_end(d.local_date,d.time_zone));
 else done:=t.complete;instant:=t.completed_at;
 end if;
 update public.daily_priorities set task_id=null,standalone_complete=done,completed_at=instant,completion_origin='materialized',materialized_task_id=t.id,materialized_at=p_stamp where id=p.id and user_id=auth.uid();
end $$;
revoke all on function muse_private.detach_priority(uuid,timestamptz) from public,anon,authenticated;

create function muse_private.task_delete_priorities() returns trigger language plpgsql security definer set search_path='' as $$
declare linked record;
begin
 if old.deleted_at is null and new.deleted_at is not null then
  if auth.uid() is distinct from new.user_id then raise exception 'Task owner required' using errcode='42501'; end if;
  -- planner_command already holds the owner Planner lock. All linked writes use that order.
  perform 1 from public.planner_versions where user_id=auth.uid() for update;
  for linked in select p.id,p.daily_record_id from public.daily_priorities p where p.user_id=auth.uid() and p.task_id=new.id order by p.daily_record_id,p.id loop
   perform 1 from public.daily_records where id=linked.daily_record_id and user_id=auth.uid() for update;
   perform muse_private.detach_priority(linked.id,new.deleted_at);
  end loop;
 end if;
 return new;
end $$;
revoke all on function muse_private.task_delete_priorities() from public,anon,authenticated;
create trigger detach_priorities before update of deleted_at on public.tasks for each row execute function muse_private.task_delete_priorities();

-- Preserve existing standalone command calls through defaults. Link changes require a
-- Planner revision; metadata-only saves never complete/reopen tasks implicitly.
drop function public.save_daily_priorities(date,jsonb,jsonb);
create function public.save_daily_priorities(p_date date,p_items jsonb,p_expected jsonb,p_command_id uuid default null,p_expected_planner_revision bigint default null)
returns setof public.daily_priorities language plpgsql security definer set search_path='' as $$
declare day public.daily_records;versions jsonb;item jsonb;entry public.daily_priorities;slot integer:=0;uid uuid:=auth.uid();v bigint;desired uuid;stamp timestamptz;receipt public.priority_commands;hash bytea;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>3 or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Choose up to three priorities' using errcode='22023'; end if;
 insert into public.planner_versions(user_id) values(uid) on conflict do nothing;
 select revision into v from public.planner_versions where user_id=uid for update;
 stamp:=clock_timestamp();hash:=sha256(convert_to(jsonb_build_array(p_date,p_items,p_expected,p_expected_planner_revision)::text,'UTF8'));
 if p_command_id is not null then
  select * into receipt from public.priority_commands where user_id=uid and id=p_command_id;
  if found and (receipt.operation<>'save' or receipt.request_hash<>hash) then raise exception 'Priority command reused' using errcode='22023'; end if;
 end if;
 day:=public.ensure_daily_record(p_date);
 perform 1 from public.daily_records where id=day.id and user_id=uid for update;
 perform 1 from public.daily_priorities where daily_record_id=day.id and user_id=uid for update;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'revision',revision) order by id),'[]') into versions from public.daily_priorities where daily_record_id=day.id and user_id=uid;
 if receipt.id is not null then
  if versions is distinct from receipt.priority_versions then raise exception 'Priorities changed after this command' using errcode='40001'; end if;
  return query select * from public.daily_priorities where daily_record_id=day.id and user_id=uid order by position;return;
 end if;
 if versions is distinct from (select coalesce(jsonb_agg(value order by value->>'id'),'[]') from jsonb_array_elements(p_expected)) then raise exception 'Priorities changed; reload before saving' using errcode='40001'; end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'Priority IDs must be unique' using errcode='22023'; end if;
 set constraints public.daily_priority_slots deferred;
 delete from public.daily_priorities where daily_record_id=day.id and user_id=uid and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_items));
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item->'text') is distinct from 'string' then raise exception 'Invalid priority text' using errcode='22023'; end if;
  select * into entry from public.daily_priorities where id=(item->>'id')::uuid and daily_record_id=day.id and user_id=uid;
  desired:=case when item?'taskId' then nullif(item->>'taskId','')::uuid else entry.task_id end;
  if desired is distinct from entry.task_id and (p_expected_planner_revision is null or p_expected_planner_revision<>v) then raise exception 'Planner changed; reload before linking' using errcode='40001'; end if;
  if desired is not null and not exists(select 1 from public.tasks where id=desired and user_id=uid and deleted_at is null) then raise exception 'Task unavailable' using errcode='42501'; end if;
  if entry.task_id is not null and desired is null then
   perform muse_private.detach_priority(entry.id,stamp);
   select * into entry from public.daily_priorities where id=entry.id and user_id=uid;
  end if;
  if desired is null and ((item->>'complete') is null and (entry.id is null or entry.completion_origin<>'materialized')) then raise exception 'Standalone completion must be explicit' using errcode='22023'; end if;
  if entry.id is null then
   insert into public.daily_priorities(id,user_id,daily_record_id,text,position,task_id,standalone_complete,completion_origin,linked_at)
    values((item->>'id')::uuid,uid,day.id,btrim(item->>'text'),slot,desired,case when desired is null then (item->>'complete')::boolean else null end,case when desired is null then 'standalone' else 'linked' end,case when desired is not null then stamp end);
  else
   update public.daily_priorities set text=btrim(item->>'text'),position=slot,task_id=desired,
    standalone_complete=case when desired is not null then null when item?'taskId' and item->>'taskId' is null and entry.materialized_at=stamp then entry.standalone_complete else (item->>'complete')::boolean end,
    completion_origin=case when desired is not null then 'linked' when (item->>'complete')::boolean is distinct from entry.standalone_complete and not (item?'taskId' and item->>'taskId' is null and entry.materialized_at=stamp) then 'standalone' else entry.completion_origin end,
    linked_at=case when desired is not null and desired is distinct from entry.task_id then stamp else linked_at end,
    materialized_task_id=case when desired is not null then null else materialized_task_id end,materialized_at=case when desired is not null then null else materialized_at end
   where id=entry.id and user_id=uid;
  end if;
  slot:=slot+1;
 end loop;
 if p_command_id is not null then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'revision',revision) order by id),'[]') into versions from public.daily_priorities where daily_record_id=day.id and user_id=uid;
  insert into public.priority_commands(user_id,id,operation,request_hash,priority_versions) values(uid,p_command_id,'save',hash,versions);
 end if;
 return query select * from public.daily_priorities where daily_record_id=day.id and user_id=uid order by position;
end $$;
revoke all on function public.save_daily_priorities(date,jsonb,jsonb,uuid,bigint) from public,anon;
grant execute on function public.save_daily_priorities(date,jsonb,jsonb,uuid,bigint) to authenticated;

create function public.complete_linked_priority(p_id uuid,p_priority_revision bigint,p_expected_planner_revision bigint,p_complete boolean,p_command_id uuid) returns bigint
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.daily_priorities;day_id uuid;v bigint;hash bytea;receipt public.priority_commands;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_command_id is null or p_complete is null then raise exception 'A completion intent and command ID are required' using errcode='22023'; end if;
 insert into public.planner_versions(user_id) values(uid) on conflict do nothing;
 select revision into v from public.planner_versions where user_id=uid for update;
 hash:=sha256(convert_to(jsonb_build_array(p_id,p_priority_revision,p_expected_planner_revision,p_complete)::text,'UTF8'));
 select * into receipt from public.priority_commands where user_id=uid and id=p_command_id;
 if found then
  if receipt.operation<>'complete' or receipt.request_hash<>hash then raise exception 'Priority command reused' using errcode='22023'; end if;
  return receipt.planner_revision;
 end if;
 select daily_record_id into day_id from public.daily_priorities where id=p_id and user_id=uid;
 if day_id is null then raise exception 'Priority unavailable' using errcode='42501'; end if;
 perform 1 from public.daily_records where id=day_id and user_id=uid for update;
 select * into strict p from public.daily_priorities where id=p_id and user_id=uid for update;
 if p.revision<>p_priority_revision or p.task_id is null or v<>p_expected_planner_revision then raise exception 'Priority or Planner changed' using errcode='40001'; end if;
 v:=public.planner_command(p_expected_planner_revision,p_command_id,jsonb_build_object('type','task/update','id',p.task_id,'patch',jsonb_build_object('complete',p_complete)));
 insert into public.priority_commands(user_id,id,operation,request_hash,planner_revision) values(uid,p_command_id,'complete',hash,v);
 return v;
end $$;
revoke all on function public.complete_linked_priority(uuid,bigint,bigint,boolean,uuid) from public,anon;
grant execute on function public.complete_linked_priority(uuid,bigint,bigint,boolean,uuid) to authenticated;
