-- Planner Pass A. Canonical relational records; no prototype seeds or priority links.
create table public.planner_versions(user_id uuid primary key references auth.users on delete cascade,revision bigint not null default 0 check(revision>=0));
create table public.workspaces(id uuid primary key,user_id uuid not null references auth.users on delete cascade,name text not null check(length(btrim(name)) between 1 and 40),accent text not null,icon_id text,archived_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision bigint not null default 1,unique(user_id,id));
create unique index workspace_names on public.workspaces(user_id,lower(btrim(name))) where archived_at is null;
create table public.task_groups(id uuid primary key,user_id uuid not null references auth.users on delete cascade,workspace_id uuid not null,name text not null check(length(btrim(name)) between 1 and 40),accent text,icon_id text,archived_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision bigint not null default 1,unique(user_id,id),unique(user_id,workspace_id,id),foreign key(user_id,workspace_id) references public.workspaces(user_id,id));
create unique index task_group_names on public.task_groups(user_id,workspace_id,lower(btrim(name))) where archived_at is null;
create table public.task_tags(id uuid primary key,user_id uuid not null references auth.users on delete cascade,name text not null check(length(btrim(name)) between 1 and 40),accent text not null,icon_id text,archived_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision bigint not null default 1,unique(user_id,id));
create unique index task_tag_names on public.task_tags(user_id,lower(btrim(name))) where archived_at is null;
create table public.tasks(
 id uuid primary key,user_id uuid not null references auth.users on delete cascade,workspace_id uuid not null,group_id uuid,
 title text not null check(length(btrim(title)) between 1 and 160),planned_date date,due_date date,local_time_slot time,
 estimated_minutes numeric check(estimated_minutes>=0 and estimated_minutes<1000000),actual_minutes_baseline numeric not null default 0 check(actual_minutes_baseline>=0 and actual_minutes_baseline<1000000),
 complete boolean not null default false,completed_at timestamptz,notes text check(length(notes)<=20000),detail text check(length(detail)<=5000),position numeric not null default 0,
 recurrence_frequency text check(recurrence_frequency in ('daily','weekly','monthly')),recurrence_interval integer,recurrence_until date,
 captured_time_zone text not null check(muse_private.valid_time_zone(captured_time_zone)),deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision bigint not null default 1,
 unique(user_id,id),foreign key(user_id,workspace_id) references public.workspaces(user_id,id),foreign key(user_id,workspace_id,group_id) references public.task_groups(user_id,workspace_id,id),
 check(complete=(completed_at is not null)),constraint tasks_recurrence_bundle check((recurrence_frequency is null and recurrence_interval is null and recurrence_until is null) or (recurrence_frequency is not null and recurrence_interval is not null and recurrence_interval between 1 and 10000))
);
create index task_planning on public.tasks(user_id,planned_date,position,id) where deleted_at is null;
create table public.task_subtasks(id uuid primary key,user_id uuid not null references auth.users on delete cascade,task_id uuid not null,title text not null check(length(btrim(title)) between 1 and 160),complete boolean not null default false,position integer not null check(position>=0),unique(user_id,task_id,position),foreign key(user_id,task_id) references public.tasks(user_id,id) on delete cascade);
create table public.task_tag_links(user_id uuid not null references auth.users on delete cascade,task_id uuid not null,tag_id uuid not null,primary key(user_id,task_id,tag_id),foreign key(user_id,task_id) references public.tasks(user_id,id) on delete cascade,foreign key(user_id,tag_id) references public.task_tags(user_id,id) on delete cascade);
create index task_tag_lookup on public.task_tag_links(user_id,tag_id);
create table public.task_time_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,task_id uuid not null,started_at timestamptz not null,ended_at timestamptz,check(ended_at is null or ended_at>=started_at),foreign key(user_id,task_id) references public.tasks(user_id,id) on delete cascade);
create unique index one_planner_timer on public.task_time_sessions(user_id) where ended_at is null;
create index task_time_lookup on public.task_time_sessions(user_id,task_id,started_at);
create table public.task_completion_events(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,task_id uuid not null,complete boolean not null,occurred_at timestamptz not null,local_date date not null,time_zone text not null,title text not null,workspace_id uuid not null,planned_date date,foreign key(user_id,task_id) references public.tasks(user_id,id) on delete cascade);
create index task_completion_history on public.task_completion_events(user_id,local_date,occurred_at);
create table public.planner_events(id uuid primary key,user_id uuid not null references auth.users on delete cascade,title text not null check(length(btrim(title)) between 1 and 160),local_date date not null,local_time time not null,time_zone text not null check(muse_private.valid_time_zone(time_zone)),detail text check(length(detail)<=5000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision bigint not null default 1);
create index planner_event_dates on public.planner_events(user_id,local_date);
create table public.planner_commands(user_id uuid not null references auth.users on delete cascade,id uuid not null,request_hash bytea not null,revision bigint not null,primary key(user_id,id));

-- Reads remain owner-RLS protected. Only the narrowly validated command can mutate
-- Planner: completion history/timer time cannot be forged through direct REST writes.
do $$ declare tab text; begin
 foreach tab in array array['planner_versions','workspaces','task_groups','task_tags','tasks','task_subtasks','task_tag_links','task_time_sessions','task_completion_events','planner_events','planner_commands'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',tab);
 end loop;
 foreach tab in array array['workspaces','task_groups','task_tags','tasks','planner_events'] loop
  execute format('create trigger stamp_record before insert or update on public.%I for each row execute function muse_private.stamp_record()',tab);
 end loop;
end $$;

-- Snapshot is one MVCC statement; browser repositories don't stitch torn child reads.
create function public.read_planner() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'revision',coalesce((select revision from public.planner_versions where user_id=auth.uid()),0),
 'workspaces',coalesce((select jsonb_agg(to_jsonb(w) order by created_at,id) from public.workspaces w where user_id=auth.uid() and archived_at is null),'[]'),
 'groups',coalesce((select jsonb_agg(to_jsonb(g) order by created_at,id) from public.task_groups g where user_id=auth.uid() and archived_at is null),'[]'),
 'tags',coalesce((select jsonb_agg(to_jsonb(g) order by created_at,id) from public.task_tags g where user_id=auth.uid() and archived_at is null),'[]'),
 'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by position,id) from public.tasks t where user_id=auth.uid() and deleted_at is null),'[]'),
 'subtasks',coalesce((select jsonb_agg(to_jsonb(s) order by position) from public.task_subtasks s where user_id=auth.uid()),'[]'),
 'tagLinks',coalesce((select jsonb_agg(to_jsonb(l)) from public.task_tag_links l where user_id=auth.uid()),'[]'),
 'timeSessions',coalesce((select jsonb_agg(to_jsonb(s)) from public.task_time_sessions s where user_id=auth.uid()),'[]'),
 'completionHistory',coalesce((select jsonb_agg(to_jsonb(e) order by occurred_at,id) from public.task_completion_events e where user_id=auth.uid()),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by local_date,local_time) from public.planner_events e where user_id=auth.uid()),'[]'))
$$;

create function public.planner_command(p_expected_revision bigint,p_command_id uuid,p_action jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_version bigint; prior public.planner_commands; kind text:=p_action->>'type'; payload jsonb; patch jsonb; target uuid; task public.tasks; zone text; stamp timestamptz:=clock_timestamp(); new_complete boolean; pos numeric; before_pos numeric; previous_pos numeric; new_date date; field text; wid uuid;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select time_zone into strict zone from public.profiles where id=uid;
 if zone is null or not muse_private.valid_time_zone(zone) then raise exception 'Set a valid profile timezone before planning' using errcode='22023'; end if;
 if p_command_id is null or jsonb_typeof(p_action) is distinct from 'object' or octet_length(p_action::text)>100000 then raise exception 'Invalid Planner command' using errcode='22023'; end if;
 insert into public.planner_versions(user_id) values(uid) on conflict do nothing;
 select revision into current_version from public.planner_versions where user_id=uid for update;
 select * into prior from public.planner_commands where user_id=uid and id=p_command_id;
 if found then
  if prior.request_hash<>sha256(convert_to(p_action::text,'UTF8')) then raise exception 'Command identity reused' using errcode='22023'; end if;
  return prior.revision;
 end if;
 if p_expected_revision is null or current_version<>p_expected_revision then raise exception 'Planner changed; review the latest version' using errcode='40001'; end if;
 target:=nullif(p_action->>'id','')::uuid;
 stamp:=clock_timestamp();
 if kind in ('workspace/save','group/save','tag/save') then
  payload:=p_action->split_part(kind,'/',1); target:=(payload->>'id')::uuid;
  if payload->>'accent' is not null and not ((payload->>'accent') in ('primary','secondary','pop','warm','info') or (payload->>'accent')~'^#[a-fA-F0-9]{6}$') then raise exception 'Invalid accent' using errcode='22023'; end if;
  if length(payload->>'icon')>80 then raise exception 'Invalid icon' using errcode='22023'; end if;
  if kind='workspace/save' then
   insert into public.workspaces(id,user_id,name,accent,icon_id) values(target,uid,btrim(payload->>'name'),coalesce(payload->>'accent','primary'),payload->>'icon')
   on conflict(id) do update set name=excluded.name,accent=excluded.accent,icon_id=excluded.icon_id where public.workspaces.user_id=uid and public.workspaces.archived_at is null;
   if not found then raise exception 'Workspace unavailable' using errcode='42501'; end if;
  elsif kind='group/save' then
   wid:=(payload->>'workspaceId')::uuid;
   if not exists(select 1 from public.workspaces where id=wid and user_id=uid and archived_at is null) then raise exception 'Workspace unavailable' using errcode='42501'; end if;
   -- Clear incompatible task references before a group changes workspace.
   update public.tasks set group_id=null where user_id=uid and group_id=target and workspace_id<>wid;
   insert into public.task_groups(id,user_id,workspace_id,name,accent,icon_id) values(target,uid,wid,btrim(payload->>'name'),payload->>'accent',payload->>'icon')
   on conflict(id) do update set workspace_id=excluded.workspace_id,name=excluded.name,accent=excluded.accent,icon_id=excluded.icon_id where public.task_groups.user_id=uid and public.task_groups.archived_at is null;
   if not found then raise exception 'Group unavailable' using errcode='42501'; end if;
  else
   insert into public.task_tags(id,user_id,name,accent,icon_id) values(target,uid,btrim(payload->>'name'),coalesce(payload->>'accent','primary'),payload->>'icon')
   on conflict(id) do update set name=excluded.name,accent=excluded.accent,icon_id=excluded.icon_id where public.task_tags.user_id=uid and public.task_tags.archived_at is null;
   if not found then raise exception 'Tag unavailable' using errcode='42501'; end if;
  end if;
 elsif kind in ('workspace/delete','group/delete','tag/delete') then
  if kind='workspace/delete' then
   if (select count(*) from public.workspaces where user_id=uid and archived_at is null)<=1 or exists(select 1 from public.tasks where user_id=uid and workspace_id=target and deleted_at is null) or exists(select 1 from public.task_groups where user_id=uid and workspace_id=target and archived_at is null) then raise exception 'Keep at least one workspace and move referenced tasks/groups first' using errcode='22023'; end if;
   update public.workspaces set archived_at=stamp where id=target and user_id=uid and archived_at is null;
  elsif kind='group/delete' then
   update public.tasks set group_id=null where user_id=uid and group_id=target;
   update public.task_groups set archived_at=stamp where id=target and user_id=uid and archived_at is null;
  else
   delete from public.task_tag_links where user_id=uid and tag_id=target;
   update public.task_tags set archived_at=stamp where id=target and user_id=uid and archived_at is null;
  end if;
  if not found then raise exception 'Organization item unavailable' using errcode='42501'; end if;
 elsif kind='event/add' then
  payload:=p_action->'event';
  if coalesce(payload->>'date','')!~'^\d{4}-\d{2}-\d{2}$' or coalesce(payload->>'dateTime','')!~'^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$' then raise exception 'Choose a valid floating local event date and time' using errcode='22023'; end if;
  if (payload->>'dateTime')::timestamp::date is distinct from (payload->>'date')::date then raise exception 'Event date mismatch' using errcode='22023'; end if;
  insert into public.planner_events(id,user_id,title,local_date,local_time,time_zone,detail) values((payload->>'id')::uuid,uid,btrim(payload->>'title'),(payload->>'date')::date,(payload->>'dateTime')::timestamp::time,zone,payload->>'detail');
 elsif kind in ('task/add','task/update','task/move','task/place','task/toggle','task/delete','timer/start','timer/pause') then
  if kind='task/add' then
   payload:=p_action->'task';target:=(payload->>'id')::uuid;patch:=payload;
   if coalesce((payload->>'complete')::boolean,false) then raise exception 'Create tasks open, then complete them explicitly' using errcode='22023'; end if;
   select coalesce(max(position),0)+1024 into pos from public.tasks where user_id=uid and deleted_at is null;
   if not exists(select 1 from public.workspaces where id=(payload->>'workspaceId')::uuid and user_id=uid and archived_at is null) then raise exception 'Workspace unavailable' using errcode='42501'; end if;
   insert into public.tasks(id,user_id,workspace_id,title,position,captured_time_zone) values(target,uid,(payload->>'workspaceId')::uuid,btrim(payload->>'title'),pos,zone) returning * into task;
  elsif kind='timer/pause' then
   select task_id into target from public.task_time_sessions where user_id=uid and ended_at is null;
  end if;
  if target is not null then
   select * into task from public.tasks where id=target and user_id=uid and deleted_at is null for update;
   if not found then raise exception 'Task unavailable' using errcode='42501'; end if;
  elsif kind<>'timer/pause' then raise exception 'Task required' using errcode='22023'; end if;
  if kind in ('task/add','task/update') then
   if kind='task/update' then patch:=p_action->'patch'; end if;
   if jsonb_typeof(patch) is distinct from 'object' then raise exception 'Invalid task fields' using errcode='22023'; end if;
   for field in select jsonb_object_keys(patch) loop
    if field not in ('title','workspaceId','groupId','plannedDate','dueDate','timeSlot','estimatedMinutes','actualMinutes','complete','notes','detail','tagIds','subtasks','recurrence') and not (kind='task/add' and field in ('id','kind','createdAt')) then raise exception 'Unsupported task field' using errcode='22023'; end if;
   end loop;
   if patch?'completedAt' then raise exception 'Completion time is server-owned' using errcode='22023'; end if;
   if patch?'actualMinutes' and kind<>'task/add' then raise exception 'Tracked time is changed through the timer' using errcode='22023'; end if;
   foreach field in array array['plannedDate','dueDate'] loop
    if patch->>field is not null and (patch->>field)!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Choose an ISO local calendar date' using errcode='22023'; end if;
   end loop;
   wid:=case when patch?'workspaceId' then (patch->>'workspaceId')::uuid else task.workspace_id end;
   if not exists(select 1 from public.workspaces where id=wid and user_id=uid and archived_at is null) then raise exception 'Workspace unavailable' using errcode='42501'; end if;
   if patch->>'groupId' is not null and not exists(select 1 from public.task_groups where id=(patch->>'groupId')::uuid and user_id=uid and workspace_id=wid and archived_at is null) then raise exception 'Group unavailable' using errcode='42501'; end if;
   update public.tasks set title=case when patch?'title' then btrim(patch->>'title') else title end,
    workspace_id=wid,group_id=case when patch?'groupId' then nullif(patch->>'groupId','')::uuid when wid<>workspace_id then null else group_id end,
    planned_date=case when patch?'plannedDate' then (patch->>'plannedDate')::date else planned_date end,due_date=case when patch?'dueDate' then (patch->>'dueDate')::date else due_date end,
    local_time_slot=case when patch?'timeSlot' then (patch->>'timeSlot')::time else local_time_slot end,
    estimated_minutes=case when patch?'estimatedMinutes' then (patch->>'estimatedMinutes')::numeric else estimated_minutes end,
    actual_minutes_baseline=case when kind='task/add' then coalesce((patch->>'actualMinutes')::numeric,0) else actual_minutes_baseline end,
    notes=case when patch?'notes' then patch->>'notes' else notes end,detail=case when patch?'detail' then patch->>'detail' else detail end,
    recurrence_frequency=case when patch?'recurrence' then patch->'recurrence'->>'frequency' else recurrence_frequency end,
    recurrence_interval=case when patch?'recurrence' then (patch->'recurrence'->>'interval')::integer else recurrence_interval end,
    recurrence_until=case when patch?'recurrence' then (patch->'recurrence'->>'until')::date else recurrence_until end
    where id=target and user_id=uid;
   if patch?'tagIds' then
    if exists(select 1 from jsonb_array_elements_text(patch->'tagIds') selected_tag(id) where not exists(select 1 from public.task_tags where user_id=uid and id=selected_tag.id::uuid and archived_at is null)) then raise exception 'Tag unavailable' using errcode='42501'; end if;
    delete from public.task_tag_links where task_id=target and user_id=uid;
    insert into public.task_tag_links(user_id,task_id,tag_id) select uid,target,value::uuid from jsonb_array_elements_text(patch->'tagIds');
   end if;
   if patch?'subtasks' then
    delete from public.task_subtasks where task_id=target and user_id=uid;
    insert into public.task_subtasks(id,user_id,task_id,title,complete,position) select (value->>'id')::uuid,uid,target,btrim(value->>'title'),(value->>'complete')::boolean,(ordinality-1)::integer from jsonb_array_elements(patch->'subtasks') with ordinality;
   end if;
  end if;
  if kind in ('task/move','task/place') then
   if p_action->>'date' is not null and (p_action->>'date')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Choose an ISO local calendar date' using errcode='22023'; end if;
   new_date:=(p_action->>'date')::date;
   select position into before_pos from public.tasks where user_id=uid and id=nullif(p_action->>'beforeId','')::uuid and deleted_at is null and planned_date is not distinct from new_date and id<>target;
   if before_pos is null then select coalesce(max(position),0)+1024 into pos from public.tasks where user_id=uid and deleted_at is null and planned_date is not distinct from new_date and id<>target;
   else
    select max(position) into previous_pos from public.tasks where user_id=uid and deleted_at is null and planned_date is not distinct from new_date and id<>target and position<before_pos;
    pos:=(coalesce(previous_pos,before_pos-2048)+before_pos)/2;
   end if;
   update public.tasks set planned_date=new_date,position=pos where id=target and user_id=uid;
   -- Bounded rebalance under the same user revision lock avoids precision exhaustion.
   with ranked as (select id,row_number() over(order by position,id)*1024 as slot from public.tasks where user_id=uid and deleted_at is null and planned_date is not distinct from new_date)
   update public.tasks t set position=r.slot from ranked r where t.id=r.id and t.user_id=uid;
  end if;
  if kind='task/toggle' or (kind='task/update' and patch?'complete') then
   new_complete:=case when kind='task/toggle' then not task.complete else (patch->>'complete')::boolean end;
   if new_complete is distinct from task.complete then
    update public.task_time_sessions set ended_at=stamp where user_id=uid and task_id=target and ended_at is null;
    update public.tasks set complete=new_complete,completed_at=case when new_complete then stamp else null end where id=target and user_id=uid;
    insert into public.task_completion_events(user_id,task_id,complete,occurred_at,local_date,time_zone,title,workspace_id,planned_date)
      select uid,id,new_complete,stamp,(stamp at time zone zone)::date,zone,title,workspace_id,planned_date from public.tasks where id=target and user_id=uid;
   end if;
  end if;
  if kind='task/delete' then
   update public.task_time_sessions set ended_at=stamp where user_id=uid and task_id=target and ended_at is null;
   update public.tasks set deleted_at=stamp where id=target and user_id=uid;
  elsif kind='timer/start' then
   if task.complete then raise exception 'Reopen this task before timing it' using errcode='22023'; end if;
   if not exists(select 1 from public.task_time_sessions where user_id=uid and task_id=target and ended_at is null) then
    update public.task_time_sessions set ended_at=stamp where user_id=uid and ended_at is null;
    insert into public.task_time_sessions(user_id,task_id,started_at) values(uid,target,stamp);
   end if;
  elsif kind='timer/pause' then update public.task_time_sessions set ended_at=stamp where user_id=uid and ended_at is null;
  end if;
 else raise exception 'Unsupported Planner command' using errcode='22023'; end if;
 update public.planner_versions set revision=revision+1 where user_id=uid returning revision into current_version;
 insert into public.planner_commands(user_id,id,request_hash,revision) values(uid,p_command_id,sha256(convert_to(p_action::text,'UTF8')),current_version);
 return current_version;
end $$;
revoke all on function public.read_planner(),public.planner_command(bigint,uuid,jsonb) from public,anon;
grant execute on function public.read_planner(),public.planner_command(bigint,uuid,jsonb) to authenticated;
