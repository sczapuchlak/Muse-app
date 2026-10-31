-- Rituals MVP: preserve the existing tracking vocabulary and history lock.
create table public.ritual_versions_owner(user_id uuid primary key references auth.users on delete cascade,revision bigint not null default 0);
create table public.ritual_commands(user_id uuid not null references auth.users on delete cascade,id uuid not null,request_hash bytea not null,revision bigint not null,primary key(user_id,id));
create table public.ritual_groups(id uuid primary key,user_id uuid not null references auth.users on delete cascade,name text not null check(length(btrim(name)) between 1 and 40),accent text not null check(accent in ('primary','secondary','pop','warm','info') or accent~'^#[0-9a-fA-F]{6}$'),icon_id text not null check(length(icon_id) between 1 and 60),gradient jsonb,collapsed boolean not null,position integer not null,unique(user_id,id));
create table public.rituals(id uuid primary key,user_id uuid not null references auth.users on delete cascade,name text not null check(length(btrim(name)) between 1 and 100),group_id uuid not null,tracking_type text not null check(tracking_type in ('checkbox','numeric','duration','weekly-target')),goal numeric not null check(goal>0 and goal<=1000000),unit text not null check(length(unit) between 1 and 20),recurrence text not null check(recurrence in ('daily','weekly','weekdays')),weekdays integer[] not null,start_date date not null,captured_time_zone text not null,position integer not null,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(user_id,id),foreign key(user_id,group_id) references public.ritual_groups(user_id,id) deferrable initially deferred,check((tracking_type<>'checkbox' or goal=1) and (tracking_type<>'weekly-target' or goal=trunc(goal))),check(cardinality(weekdays) between 1 and 7 and 0<=all(weekdays) and 6>=all(weekdays) and array_position(weekdays,null) is null),check(recurrence<>'weekly' or cardinality(weekdays)=1));
create index rituals_owner_group on public.rituals(user_id,group_id,position);
create table public.ritual_entries(user_id uuid not null,ritual_id uuid not null,local_date date not null,value numeric not null check(value>=0 and value<=1000000),outcome text not null check(outcome in ('recorded','missed')),captured_time_zone text not null,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),primary key(user_id,ritual_id,local_date),foreign key(user_id,ritual_id) references public.rituals(user_id,id) deferrable initially deferred,check((value=0)=(outcome='missed')));
create index ritual_entries_history on public.ritual_entries(user_id,local_date);
do $$ declare t text;begin foreach t in array array['ritual_versions_owner','ritual_commands','ritual_groups','rituals','ritual_entries'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 end loop;end $$;
-- Parent lifetime is protected during normal edits; explicit account deletion can
-- cascade all of its own data without a cross-table trigger-order failure.
alter table public.ritual_entries add foreign key(user_id) references auth.users(id) on delete cascade;
create function public.read_rituals() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.ritual_versions_owner where user_id=auth.uid()),0),'state',jsonb_build_object(
 'groups',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'accent',accent,'icon',icon_id,'gradient',gradient,'collapsed',collapsed)) order by position,id) from public.ritual_groups where user_id=auth.uid()),'[]'),
 'rituals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'groupId',group_id,'type',tracking_type,'goal',goal,'unit',unit,'recurrence',case recurrence when 'daily' then jsonb_build_object('kind','daily') when 'weekly' then jsonb_build_object('kind','weekly','weekday',weekdays[1]) else jsonb_build_object('kind','weekdays','weekdays',weekdays) end,'startDate',start_date,'createdAt',created_at) order by position,id) from public.rituals where user_id=auth.uid()),'[]'),
 'entries',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',ritual_id::text||'/'||local_date::text,'ritualId',ritual_id,'date',local_date,'value',value,'outcome',case when outcome='missed' then 'missed' end,'updatedAt',updated_at))) from public.ritual_entries where user_id=auth.uid()),'[]'),
 'celebratedMilestones','[]'::jsonb));
end $$;
revoke all on function public.read_rituals() from public,anon;grant execute on function public.read_rituals() to authenticated;
create function public.save_rituals(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;receipt public.ritual_commands;h bytea;k text;item jsonb;r public.rituals;days integer[];kind text;z text;today date;d date;pos integer;gradient jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select time_zone into z from public.profiles where id=uid;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Configure a valid profile timezone' using errcode='22023';end if;
 today:=(clock_timestamp() at time zone z)::date;
 if p_command_id is null or p_expected_revision is null or jsonb_typeof(p_state) is distinct from 'object' or octet_length(p_state::text)>8388608 then raise exception 'Invalid Rituals library' using errcode='22023';end if;
 foreach k in array array['groups','rituals','entries'] loop
  if jsonb_typeof(p_state->k) is distinct from 'array' or jsonb_array_length(p_state->k)>5000 then raise exception 'Invalid or oversized Rituals collection' using errcode='22023';end if;
 end loop;
 foreach k in array array['groups','rituals'] loop
  if (select count(distinct value->>'id') from jsonb_array_elements(p_state->k))<>jsonb_array_length(p_state->k) then raise exception 'Duplicate identities' using errcode='22023';end if;
 end loop;
 if (select count(distinct (value->>'ritualId',value->>'date')) from jsonb_array_elements(p_state->'entries'))<>jsonb_array_length(p_state->'entries') then raise exception 'Duplicate dated outcomes' using errcode='22023';end if;
 insert into public.ritual_versions_owner(user_id) values(uid) on conflict do nothing;
 select revision into v from public.ritual_versions_owner where user_id=uid for update;
 h:=sha256(convert_to((p_state-'celebratedMilestones')::text,'UTF8'));select * into receipt from public.ritual_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>h then raise exception 'Command reused' using errcode='22023';end if;return receipt.revision;end if;
 if v<>p_expected_revision then raise exception 'Rituals changed; reload before saving' using errcode='40001';end if;
 -- No delete/archive habit control exists yet. Never infer deletion from omission.
 if exists(select 1 from public.rituals where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'rituals'))) then raise exception 'Existing ritual definitions must be retained' using errcode='22023';end if;
 if exists(select 1 from public.ritual_groups where user_id=uid) and jsonb_array_length(p_state->'groups')=0 then raise exception 'Keep at least one group' using errcode='22023';end if;
 pos:=0;
 for item in select value from jsonb_array_elements(p_state->'groups') loop
  if exists(select 1 from public.ritual_groups where id=(item->>'id')::uuid and user_id<>uid) then raise exception 'Group unavailable' using errcode='42501';end if;
  gradient:=nullif(item->'gradient','null'::jsonb);
  if gradient is not null then
   if jsonb_typeof(gradient)='string' then
    if gradient#>>'{}' not in ('primary-secondary','secondary-pop','pop-primary') then raise exception 'Invalid gradient' using errcode='22023';end if;
   elsif jsonb_typeof(gradient)<>'object' or jsonb_typeof(gradient->'colors') is distinct from 'array' or jsonb_array_length(gradient->'colors') not between 2 and 3 or gradient->>'angle' is null or gradient->>'angle' not in ('45','90','135','180') or exists(select 1 from jsonb_array_elements_text(gradient->'colors') c where c is null or c !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Invalid gradient' using errcode='22023';end if;
  end if;
  insert into public.ritual_groups values((item->>'id')::uuid,uid,btrim(item->>'name'),item->>'accent',item->>'icon',gradient,(item->>'collapsed')::boolean,pos)
  on conflict(id) do update set name=excluded.name,accent=excluded.accent,icon_id=excluded.icon_id,gradient=excluded.gradient,collapsed=excluded.collapsed,position=excluded.position where public.ritual_groups.user_id=uid;
  pos:=pos+1;
 end loop;
 pos:=0;
 for item in select value from jsonb_array_elements(p_state->'rituals') loop
  select * into r from public.rituals where id=(item->>'id')::uuid;
  if found and r.user_id<>uid then raise exception 'Ritual unavailable' using errcode='42501';end if;
  kind:=item#>>'{recurrence,kind}';
  if kind is null or kind not in ('daily','weekly','weekdays') or item->>'startDate' is null or item->>'startDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid schedule' using errcode='22023';end if;
  days:=case kind when 'daily' then array[0,1,2,3,4,5,6] when 'weekly' then array[(item#>>'{recurrence,weekday}')::integer] else array(select value::integer from jsonb_array_elements_text(item#>'{recurrence,weekdays}')) end;
  if cardinality(days)<>(select count(distinct value) from unnest(days) value) then raise exception 'Duplicate weekdays' using errcode='22023';end if;
  -- Retain the approved schedule/type/goal lock once any history exists, even if
  -- the same request clears those entries. Future effective-dated editing is separate.
  if r.id is not null and exists(select 1 from public.ritual_entries where user_id=uid and ritual_id=r.id) and (r.tracking_type,r.goal,r.unit,r.recurrence,r.weekdays,r.start_date) is distinct from (item->>'type',(item->>'goal')::numeric,item->>'unit',kind,days,(item->>'startDate')::date) then raise exception 'Historical tracking settings are locked' using errcode='22023';end if;
  insert into public.rituals(id,user_id,name,group_id,tracking_type,goal,unit,recurrence,weekdays,start_date,captured_time_zone,position) values((item->>'id')::uuid,uid,btrim(item->>'name'),(item->>'groupId')::uuid,item->>'type',(item->>'goal')::numeric,item->>'unit',kind,days,(item->>'startDate')::date,z,pos)
  on conflict(id) do update set name=excluded.name,group_id=excluded.group_id,tracking_type=excluded.tracking_type,goal=excluded.goal,unit=excluded.unit,recurrence=excluded.recurrence,weekdays=excluded.weekdays,start_date=excluded.start_date,position=excluded.position,updated_at=clock_timestamp() where public.rituals.user_id=uid and (public.rituals.name,public.rituals.group_id,public.rituals.tracking_type,public.rituals.goal,public.rituals.unit,public.rituals.recurrence,public.rituals.weekdays,public.rituals.start_date,public.rituals.position) is distinct from (excluded.name,excluded.group_id,excluded.tracking_type,excluded.goal,excluded.unit,excluded.recurrence,excluded.weekdays,excluded.start_date,excluded.position);
  pos:=pos+1;
 end loop;
 delete from public.ritual_groups where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'groups'));
 -- Clear removes the observation, never replaces it with an inferred missed row.
 delete from public.ritual_entries e where user_id=uid and not exists(select 1 from jsonb_array_elements(p_state->'entries') x where (x->>'ritualId')::uuid=e.ritual_id and (x->>'date')::date=e.local_date);
 for item in select value from jsonb_array_elements(p_state->'entries') loop
  select * into r from public.rituals where id=(item->>'ritualId')::uuid and user_id=uid;
  if not found then raise exception 'Ritual unavailable' using errcode='42501';end if;
  if item->>'date' is null or item->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid local date' using errcode='22023';end if;d:=(item->>'date')::date;
  if d<r.start_date or not extract(dow from d)::integer=any(r.weekdays) or (r.tracking_type='checkbox' and (item->>'value')::numeric not in (0,1)) or (r.tracking_type='weekly-target' and (item->>'value')::numeric<>trunc((item->>'value')::numeric)) then raise exception 'Invalid scheduled outcome' using errcode='22023';end if;
  -- A profile travel change must not invalidate untouched original observations.
  if d>today and not exists(select 1 from public.ritual_entries where user_id=uid and ritual_id=r.id and local_date=d and value=(item->>'value')::numeric) then raise exception 'Future outcomes cannot be logged' using errcode='22023';end if;
  insert into public.ritual_entries(user_id,ritual_id,local_date,value,outcome,captured_time_zone) values(uid,r.id,d,(item->>'value')::numeric,case when (item->>'value')::numeric=0 then 'missed' else 'recorded' end,z)
  on conflict(user_id,ritual_id,local_date) do update set value=excluded.value,outcome=excluded.outcome,updated_at=clock_timestamp() where (public.ritual_entries.value,public.ritual_entries.outcome) is distinct from (excluded.value,excluded.outcome);
 end loop;
 update public.ritual_versions_owner set revision=revision+1 where user_id=uid returning revision into v;insert into public.ritual_commands values(uid,p_command_id,h,v);return v;
end $$;
revoke all on function public.save_rituals(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_rituals(bigint,uuid,jsonb) to authenticated;

create or replace function public.export_personal_data() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('schema_version',2,'exported_at',current_timestamp,'profile',(select to_jsonb(p) from public.profiles p where id=uid),
 'daily_records',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.daily_records r where user_id=uid),
 'daily_priorities',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.daily_priorities r where user_id=uid),
 'mood_checkins',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.mood_checkins r where user_id=uid),
 'checkin_emotions',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.checkin_emotions r where user_id=uid),
 'checkin_influences',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.checkin_influences r where user_id=uid),
 'influence_tags',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.influence_tags r where user_id=uid),
 'emotion_favorites',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.emotion_favorites r where user_id=uid),
 'workspaces',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.workspaces r where user_id=uid),
 'task_groups',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_groups r where user_id=uid),
 'task_tags',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_tags r where user_id=uid),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.tasks r where user_id=uid),
 'task_subtasks',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_subtasks r where user_id=uid),
 'task_tag_links',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_tag_links r where user_id=uid),
 'planner_events',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.planner_events r where user_id=uid),
 'task_time_sessions',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_time_sessions r where user_id=uid),
 'task_completion_events',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_completion_events r where user_id=uid),
 'notes',(select coalesce(jsonb_agg(to_jsonb(r)-'search_vector'),'[]'::jsonb) from public.notes r where user_id=uid),
 'note_tags',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.note_tags r where user_id=uid),
 'note_tag_links',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.note_tag_links r where user_id=uid),
 'wellness',public.read_wellness()->'state','rituals',public.read_rituals()->'state',
 'emotion_catalog',(select jsonb_agg(to_jsonb(e)) from public.emotion_catalog e));
end $$;
