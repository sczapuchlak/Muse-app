-- Priorities are dated task designations. Old text/flags remain migration evidence,
-- not an independent live title/completion source.
alter table public.tasks add column origin_priority_id uuid;
alter table public.tasks add column initial_complete boolean not null default false;
alter table public.tasks add column initial_completed_at timestamptz;
create unique index task_priority_origin on public.tasks(user_id,origin_priority_id) where origin_priority_id is not null;
alter table public.daily_priorities add column legacy_complete boolean;
alter table public.daily_priorities add column legacy_backfilled_at timestamptz;

create function muse_private.create_priority_task(p_uid uuid,p_priority uuid,p_day uuid,p_title text,p_complete boolean,p_completed_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare task_id uuid;wid uuid;day public.daily_records;pos numeric;initial_stamp timestamptz;
begin
 if auth.uid() is not null and auth.uid()<>p_uid then raise exception 'Owner required' using errcode='42501';end if;
 insert into public.planner_versions(user_id) values(p_uid) on conflict do nothing;
 perform 1 from public.planner_versions where user_id=p_uid for update;
 select * into strict day from public.daily_records where id=p_day and user_id=p_uid for update;
 select id into task_id from public.tasks where user_id=p_uid and origin_priority_id=p_priority;
 if found then
  if exists(select 1 from public.tasks where id=task_id and deleted_at is not null) then raise exception 'This task was removed; choose another priority' using errcode='22023';end if;
  return task_id;
 end if;
 select id into wid from public.workspaces where user_id=p_uid and archived_at is null order by created_at,id limit 1;
 if wid is null then wid:=gen_random_uuid();insert into public.workspaces(id,user_id,name,accent) values(wid,p_uid,'Personal','primary');end if;
 select coalesce(max(position),0)+1024 into pos from public.tasks where user_id=p_uid and deleted_at is null;
 task_id:=gen_random_uuid();initial_stamp:=case when p_complete then coalesce(p_completed_at,clock_timestamp()) end;
 insert into public.tasks(id,user_id,workspace_id,title,planned_date,captured_time_zone,position,origin_priority_id,complete,completed_at,initial_complete,initial_completed_at)
 values(task_id,p_uid,wid,btrim(p_title),day.local_date,day.time_zone,pos,p_priority,p_complete,initial_stamp,p_complete,initial_stamp);
 update public.planner_versions set revision=revision+1 where user_id=p_uid;
 return task_id;
end $$;
revoke all on function muse_private.create_priority_task(uuid,uuid,uuid,text,boolean,timestamptz) from public,anon,authenticated;

create function muse_private.auto_priority_task() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.task_id is null and new.completion_origin='standalone' and new.materialized_task_id is null then
  new.task_id:=muse_private.create_priority_task(new.user_id,new.id,new.daily_record_id,new.text,coalesce(new.standalone_complete,false),new.completed_at);
  new.completion_origin:='linked';new.linked_at:=clock_timestamp();new.standalone_complete:=null;new.completed_at:=null;
 end if;
 return new;
end $$;
revoke all on function muse_private.auto_priority_task() from public,anon,authenticated;
create trigger auto_priority_task before insert on public.daily_priorities for each row execute function muse_private.auto_priority_task();

create function muse_private.backfill_priority_tasks(p_uid uuid) returns integer language plpgsql security definer set search_path='' as $$
declare p public.daily_priorities;tid uuid;n integer:=0;
begin
 if auth.uid() is not null and auth.uid()<>p_uid then raise exception 'Owner required' using errcode='42501';end if;
 insert into public.planner_versions(user_id) values(p_uid) on conflict do nothing;
 perform 1 from public.planner_versions where user_id=p_uid for update;
 for p in select * from public.daily_priorities where user_id=p_uid and task_id is null and completion_origin='standalone' and materialized_task_id is null order by daily_record_id,position for update loop
  tid:=muse_private.create_priority_task(p_uid,p.id,p.daily_record_id,p.text,p.standalone_complete,p.completed_at);
  update public.daily_priorities set task_id=tid,completion_origin='linked',linked_at=clock_timestamp(),legacy_complete=p.standalone_complete,legacy_backfilled_at=clock_timestamp(),standalone_complete=null,completed_at=null where id=p.id and user_id=p_uid;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function muse_private.backfill_priority_tasks(uuid) from public,anon,authenticated;

-- Fail/roll back if backfill changes any original commitment or known state.
do $$ declare owner_id uuid;begin
 create temporary table priority_backfill_check on commit drop as select p.id,p.text,p.position,p.standalone_complete,p.completed_at,d.local_date,d.time_zone from public.daily_priorities p join public.daily_records d on d.id=p.daily_record_id and d.user_id=p.user_id where p.task_id is null and p.completion_origin='standalone' and p.materialized_task_id is null;
 for owner_id in select distinct user_id from public.daily_priorities order by user_id loop perform muse_private.backfill_priority_tasks(owner_id);end loop;
 if exists(select 1 from priority_backfill_check c join public.daily_priorities p on p.id=c.id join public.daily_records d on d.id=p.daily_record_id left join public.tasks t on t.id=p.task_id and t.user_id=p.user_id where (p.text,p.position,d.local_date,d.time_zone,p.legacy_complete) is distinct from (c.text,c.position,c.local_date,c.time_zone,c.standalone_complete) or t.id is null or t.complete is distinct from c.standalone_complete or t.title is distinct from c.text or t.planned_date is distinct from c.local_date or (c.standalone_complete and c.completed_at is distinct from t.initial_completed_at)) then raise exception 'Priority backfill preservation check failed';end if;
end $$;

-- Imported completion is a known initial state, not a fabricated transition today.
create or replace function public.task_completion_before(p_task_id uuid,p_before timestamptz)
returns table(complete boolean,completed_at timestamptz) language sql stable security invoker set search_path='' as $$
 select case when t.created_at>=p_before then null else coalesce(e.complete,t.initial_complete) end,
 case when t.created_at<p_before then case when e.complete then e.occurred_at when e.complete is null and t.initial_complete then t.initial_completed_at end end
 from public.tasks t left join lateral (select h.complete,h.occurred_at from public.task_completion_events h where h.user_id=auth.uid() and h.task_id=t.id and h.occurred_at<p_before order by h.occurred_at desc,h.id desc limit 1) e on true where t.user_id=auth.uid() and t.id=p_task_id
$$;

-- Preserve existing view columns/order for its dependent daily MVCC reader.
create or replace view public.daily_priority_projection with(security_invoker=true) as
select p.id,p.user_id,p.daily_record_id,coalesce(t.title,p.text) as text,p.position,p.standalone_complete,p.completed_at,p.created_at,p.updated_at,p.revision,p.task_id,p.completion_origin,p.linked_at,p.materialized_task_id,p.materialized_at,t.title as task_title,t.complete as current_complete,t.completed_at as current_completed_at,
 case when p.task_id is null then p.standalone_complete else resolved.complete end as historical_complete,
 case when p.task_id is null then p.standalone_complete when d.local_date<(current_timestamp at time zone d.time_zone)::date then resolved.complete else t.complete end as display_complete,
 (d.local_date<(current_timestamp at time zone d.time_zone)::date) as historical_day,
 p.legacy_complete,p.legacy_backfilled_at,(p.task_id is null or t.id is null or t.deleted_at is not null) as task_unavailable
from public.daily_priorities p join public.daily_records d on (d.user_id,d.id)=(p.user_id,p.daily_record_id)
left join public.tasks t on (t.user_id,t.id)=(p.user_id,p.task_id)
left join lateral public.task_completion_before(p.task_id,public.priority_day_end(d.local_date,d.time_zone)) history on true
cross join lateral (select case when p.legacy_backfilled_at is not null and t.origin_priority_id=p.id and public.priority_day_end(d.local_date,d.time_zone)<=p.legacy_backfilled_at then p.legacy_complete else history.complete end as complete) resolved;

create or replace function muse_private.detach_priority(p_id uuid,p_stamp timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare p public.daily_priorities;d public.daily_records;t public.tasks;done boolean;instant timestamptz;
begin
 select * into strict p from public.daily_priorities where id=p_id and user_id=auth.uid() for update;
 if p.task_id is null then return; end if;
 select * into strict d from public.daily_records where id=p.daily_record_id and user_id=auth.uid();
 select * into strict t from public.tasks where id=p.task_id and user_id=auth.uid();
 if d.local_date<(p_stamp at time zone d.time_zone)::date then
  if p.legacy_backfilled_at is not null and t.origin_priority_id=p.id and public.priority_day_end(d.local_date,d.time_zone)<=p.legacy_backfilled_at then done:=p.legacy_complete;instant:=case when done then t.initial_completed_at end;
  else select complete,completed_at into done,instant from public.task_completion_before(t.id,public.priority_day_end(d.local_date,d.time_zone));end if;
 else done:=t.complete;instant:=t.completed_at;
 end if;
 update public.daily_priorities set text=t.title,task_id=null,standalone_complete=done,completed_at=instant,completion_origin='materialized',materialized_task_id=t.id,materialized_at=p_stamp where id=p.id and user_id=auth.uid();
end $$;

create or replace function public.save_daily_priorities(p_date date,p_items jsonb,p_expected jsonb,p_command_id uuid default null,p_expected_planner_revision bigint default null)
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
  if entry.task_id is not null and desired is null then raise exception 'Remove this priority designation instead; its task will stay in Planner' using errcode='22023';end if;
  if desired is null and ((item->>'complete') is null and (entry.id is null or entry.completion_origin<>'materialized')) then raise exception 'Standalone completion must be explicit' using errcode='22023'; end if;
  if entry.id is null then
   insert into public.daily_priorities(id,user_id,daily_record_id,text,position,task_id,standalone_complete,completion_origin,linked_at)
    values((item->>'id')::uuid,uid,day.id,btrim(item->>'text'),slot,desired,case when desired is null then (item->>'complete')::boolean else null end,case when desired is null then 'standalone' else 'linked' end,case when desired is not null then stamp end);
  else
   update public.daily_priorities set text=case when desired is not null then (select title from public.tasks where id=desired and user_id=uid) else btrim(item->>'text') end,position=slot,task_id=desired,
    standalone_complete=case when desired is not null then null when item?'taskId' and item->>'taskId' is null and entry.materialized_at=stamp then entry.standalone_complete else (item->>'complete')::boolean end,
    completion_origin=case when desired is not null then 'linked' when (item->>'complete')::boolean is distinct from entry.standalone_complete and not (item?'taskId' and item->>'taskId' is null and entry.materialized_at=stamp) then 'standalone' else entry.completion_origin end,
    linked_at=case when desired is not null and desired is distinct from entry.task_id then stamp else linked_at end,
    materialized_task_id=case when desired is not null then null else materialized_task_id end,materialized_at=case when desired is not null then null else materialized_at end
   where id=entry.id and user_id=uid;
  end if;
  slot:=slot+1;
 end loop;
 update public.planner_versions set revision=revision+1 where user_id=uid;
 if p_command_id is not null then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'revision',revision) order by id),'[]') into versions from public.daily_priorities where daily_record_id=day.id and user_id=uid;
  insert into public.priority_commands(user_id,id,operation,request_hash,priority_versions) values(uid,p_command_id,'save',hash,versions);
 end if;
 return query select * from public.daily_priorities where daily_record_id=day.id and user_id=uid order by position;
end $$;

create function public.rename_priority_task(p_id uuid,p_priority_revision bigint,p_expected_planner_revision bigint,p_title text,p_command_id uuid) returns bigint
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.daily_priorities;day_id uuid;v bigint;hash bytea;receipt public.priority_commands;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_command_id is null or p_title is null or length(btrim(p_title)) not between 1 and 160 then raise exception 'A completion intent and command ID are required' using errcode='22023'; end if;
 insert into public.planner_versions(user_id) values(uid) on conflict do nothing;
 select revision into v from public.planner_versions where user_id=uid for update;
 hash:=sha256(convert_to(jsonb_build_array(p_id,p_priority_revision,p_expected_planner_revision,p_title)::text,'UTF8'));
 select * into receipt from public.priority_commands where user_id=uid and id=p_command_id;
 if found then
  if receipt.operation<>'rename' or receipt.request_hash<>hash then raise exception 'Priority command reused' using errcode='22023'; end if;
  return receipt.planner_revision;
 end if;
 select daily_record_id into day_id from public.daily_priorities where id=p_id and user_id=uid;
 if day_id is null then raise exception 'Priority unavailable' using errcode='42501'; end if;
 perform 1 from public.daily_records where id=day_id and user_id=uid for update;
 select * into strict p from public.daily_priorities where id=p_id and user_id=uid for update;
 if p.revision<>p_priority_revision or p.task_id is null or v<>p_expected_planner_revision then raise exception 'Priority or Planner changed' using errcode='40001'; end if;
 v:=public.planner_command(p_expected_planner_revision,p_command_id,jsonb_build_object('type','task/update','id',p.task_id,'patch',jsonb_build_object('title',btrim(p_title))));
 insert into public.priority_commands(user_id,id,operation,request_hash,planner_revision) values(uid,p_command_id,'rename',hash,v);
 return v;
end $$;
revoke all on function public.rename_priority_task(uuid,bigint,bigint,text,uuid) from public,anon;
grant execute on function public.rename_priority_task(uuid,bigint,bigint,text,uuid) to authenticated;

create function public.create_priority_task(p_date date,p_id uuid,p_text text,p_expected_planner_revision bigint,p_command_id uuid) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;receipt public.priority_commands;hash bytea;day public.daily_records;slot integer;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_command_id is null or p_id is null or p_date is null or p_text is null or length(btrim(p_text)) not between 1 and 160 then raise exception 'Enter a priority of up to 160 characters' using errcode='22023';end if;
 insert into public.planner_versions(user_id) values(uid) on conflict do nothing;
 select revision into v from public.planner_versions where user_id=uid for update;
 hash:=sha256(convert_to(jsonb_build_array(p_date,p_id,p_text,p_expected_planner_revision)::text,'UTF8'));
 select * into receipt from public.priority_commands where user_id=uid and id=p_command_id;
 if found then if receipt.operation<>'task-create' or receipt.request_hash<>hash then raise exception 'Priority command reused' using errcode='22023';end if;return receipt.planner_revision;end if;
 if p_expected_planner_revision is null or v<>p_expected_planner_revision then raise exception 'Planner changed; load latest before adding' using errcode='40001';end if;
 day:=public.ensure_daily_record(p_date);perform 1 from public.daily_records where id=day.id and user_id=uid for update;
 select min(value) into slot from generate_series(0,2) value where value not in (select position from public.daily_priorities where daily_record_id=day.id and user_id=uid);
 if slot is null then raise exception 'This day already has three priorities' using errcode='22023';end if;
 insert into public.daily_priorities(id,user_id,daily_record_id,text,position,standalone_complete) values(p_id,uid,day.id,btrim(p_text),slot,false);
 select revision into v from public.planner_versions where user_id=uid;
 insert into public.priority_commands(user_id,id,operation,request_hash,planner_revision) values(uid,p_command_id,'task-create',hash,v);return v;
end $$;
revoke all on function public.create_priority_task(date,uuid,text,bigint,uuid) from public,anon;
grant execute on function public.create_priority_task(date,uuid,text,bigint,uuid) to authenticated;

create function public.backfill_priority_tasks(p_expected_planner_revision bigint,p_command_id uuid) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;receipt public.priority_commands;hash bytea;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_command_id is null then raise exception 'A command ID is required' using errcode='22023';end if;
 insert into public.planner_versions(user_id) values(uid) on conflict do nothing;
 select revision into v from public.planner_versions where user_id=uid for update;
 hash:=sha256(convert_to(jsonb_build_array(p_expected_planner_revision)::text,'UTF8'));
 select * into receipt from public.priority_commands where user_id=uid and id=p_command_id;
 if found then if receipt.operation<>'task-backfill' or receipt.request_hash<>hash then raise exception 'Priority command reused' using errcode='22023';end if;return receipt.planner_revision;end if;
 if p_expected_planner_revision is null or v<>p_expected_planner_revision then raise exception 'Planner changed' using errcode='40001';end if;
 perform muse_private.backfill_priority_tasks(uid);
 select revision into v from public.planner_versions where user_id=uid;
 insert into public.priority_commands(user_id,id,operation,request_hash,planner_revision) values(uid,p_command_id,'task-backfill',hash,v);return v;
end $$;
revoke all on function public.backfill_priority_tasks(bigint,uuid) from public,anon;
grant execute on function public.backfill_priority_tasks(bigint,uuid) to authenticated;
