-- Wellness Tracking 1.0 (#30): workout classification, optional durations, versioned goals and Connected Rituals.
-- Additive only. No existing record is rewritten, inferred or backfilled: starter movement types keep a code-level
-- default category, unknown durations stay null, and Rituals stay manual until a person connects one.

-- 1. Classification and duration on the existing authoritative movement records.
alter table public.movement_types add column category text check (category in ('strength','cardio','mobility','other'));
alter table public.movement_records add column duration_minutes integer check (duration_minutes between 1 and 1440);

-- 2. Versioned goals. A goal's metric/period is its identity; targets and pause/retire states are dated versions.
create table public.wellness_goals(
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 metric text not null check (metric in ('workouts','strength-workouts','cardio-workouts','workout-minutes','water','nutrition-protein','nutrition-calories','nutrition-carbs','nutrition-fat')),
 period text not null check (period in ('day','week')),
 created_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 unique(user_id,metric,period),
 check ((metric in ('workouts','workout-minutes')) or (metric in ('strength-workouts','cardio-workouts') and period='week') or (metric in ('water','nutrition-protein','nutrition-calories','nutrition-carbs','nutrition-fat') and period='day'))
);
create table public.wellness_goal_versions(
 user_id uuid not null,
 goal_id uuid not null,
 effective_from date not null,
 target numeric not null check (target>0 and target<=1000000),
 unit text not null check (length(btrim(unit)) between 1 and 20),
 direction text not null check (direction in ('atLeast','atMost')),
 status text not null check (status in ('active','paused','inactive')),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(goal_id,effective_from),
 foreign key(user_id,goal_id) references public.wellness_goals(user_id,id) on delete cascade
);
create index wellness_goal_versions_owner on public.wellness_goal_versions(user_id,goal_id,effective_from);
do $$ declare t text;begin foreach t in array array['wellness_goals','wellness_goal_versions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
end loop;end $$;

-- 3. Connected Rituals: a validated, optional description of the source. Values are derived client-side from the
-- owner's own records and are never stored while connected.
create function muse_private.valid_ritual_connection(c jsonb,tracking text) returns boolean language sql immutable set search_path='' as $$
 select c is null or c='null'::jsonb or (
  jsonb_typeof(c)='object'
  and not exists(select 1 from jsonb_object_keys(c) k where k not in ('metric','since','category','typeId','unit','threshold'))
  and c->>'metric' in ('water','workouts','workout-minutes','reading-minutes','reading-pages','books-finished','tasks-completed')
  and coalesce(c->>'since','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  and (c->'category' is null or c->>'category' in ('strength','cardio','mobility','other'))
  and (c->'unit' is null or c->>'unit' in ('oz','mL'))
  and (c->'typeId' is null or (jsonb_typeof(c->'typeId')='string' and length(c->>'typeId') between 1 and 80))
  and (c->'threshold' is null or (jsonb_typeof(c->'threshold')='number' and (c->>'threshold')::numeric>0 and (c->>'threshold')::numeric<=1000000))
  and case tracking
   when 'duration' then c->>'metric' in ('workout-minutes','reading-minutes')
   when 'weekly-target' then c->>'metric' in ('workouts','books-finished','tasks-completed')
   else true end)
$$;
alter table public.rituals add column connection jsonb check (muse_private.valid_ritual_connection(connection,tracking_type));

-- 4. Reads include the new fields. `goals` and `connectionsEnabled` also tell clients the server supports them.
create or replace function public.read_wellness() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.wellness_versions where user_id=auth.uid()),0),'state',jsonb_build_object(
 'assignments',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'date',local_date,'slot',slot,'title',title,'note',note,'nutrition',nutrition,'savedMealId',saved_meal_id,'order',position,'createdAt',created_at,'timeZone',captured_time_zone))) from public.meal_assignments where user_id=auth.uid()),'[]'),
 'savedMeals',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'mealTypes',meal_types,'note',note,'link',link,'nutrition',nutrition,'createdAt',created_at))) from public.saved_meals where user_id=auth.uid()),'[]'),
 'water',coalesce((select jsonb_agg(jsonb_build_object('date',local_date,'total',quantity,'goal',goal,'unit',unit,'timeZone',captured_time_zone)) from public.hydration_days where user_id=auth.uid()),'[]'),
 'waterSettings',(select jsonb_build_object('goal',goal,'unit',unit,'quickAdds',quick_adds) from public.hydration_settings where user_id=auth.uid()),
 'types',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',label,'source',origin,'archived',archived,'category',category)) order by id) from public.movement_types where user_id=auth.uid()),'[]'),
 'quickIds',coalesce((select to_jsonb(quick_ids) from public.movement_preferences where user_id=auth.uid()),'[]'),
 'recentIds',coalesce((select to_jsonb(recent_ids) from public.movement_preferences where user_id=auth.uid()),'[]'),
 'movement',coalesce((select jsonb_agg(jsonb_build_object('date',d.local_date,'timeZone',d.captured_time_zone,'typeIds',coalesce((select jsonb_agg(type_id order by type_id) from public.movement_day_types t where t.user_id=d.user_id and t.local_date=d.local_date),'[]'))) from public.movement_days d where d.user_id=auth.uid()),'[]'),
 'grocerySections',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by position,id) from public.grocery_sections where user_id=auth.uid()),'[]'),
 'groceryItems',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'quantity',quantity,'note',note,'sectionId',section_id,'complete',complete,'createdAt',created_at)) order by position,id) from public.grocery_items where user_id=auth.uid()),'[]'),
 'activities',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'date',local_date,'typeId',type_id,'timeZone',captured_time_zone,'createdAt',created_at,'durationMinutes',duration_minutes))) from public.movement_records where user_id=auth.uid()),'[]'),
 'goals',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'metric',g.metric,'period',g.period,'createdAt',g.created_at,'versions',coalesce((select jsonb_agg(jsonb_build_object('effectiveFrom',v.effective_from,'target',v.target,'unit',v.unit,'direction',v.direction,'status',v.status,'recordedAt',v.recorded_at) order by v.effective_from) from public.wellness_goal_versions v where v.user_id=g.user_id and v.goal_id=g.id),'[]')) order by g.created_at,g.id) from public.wellness_goals g where g.user_id=auth.uid()),'[]')));
end $$;

create or replace function public.read_rituals() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.ritual_versions_owner where user_id=auth.uid()),0),'state',jsonb_build_object(
 'groups',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'accent',accent,'icon',icon_id,'gradient',gradient,'collapsed',collapsed)) order by position,id) from public.ritual_groups where user_id=auth.uid()),'[]'),
 'rituals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'groupId',group_id,'type',tracking_type,'goal',goal,'unit',unit,'recurrence',case recurrence when 'daily' then jsonb_build_object('kind','daily') when 'weekly' then jsonb_build_object('kind','weekly','weekday',weekdays[1]) else jsonb_build_object('kind','weekdays','weekdays',weekdays) end,'startDate',start_date,'createdAt',created_at,'status',lifecycle_status,'inactivePeriods',coalesce((select jsonb_agg(jsonb_build_object('start',p.starts_on,'end',p.ends_before,'kind',p.kind) order by p.starts_on) from public.ritual_inactive_periods p where p.user_id=rituals.user_id and p.ritual_id=rituals.id),'[]'::jsonb),'connection',connection) order by position,id) from public.rituals where user_id=auth.uid()),'[]'),
 'entries',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',ritual_id::text||'/'||local_date::text,'ritualId',ritual_id,'date',local_date,'value',value,'outcome',case when outcome='missed' then 'missed' end,'updatedAt',updated_at))) from public.ritual_entries where user_id=auth.uid()),'[]'),
 'celebratedMilestones','[]'::jsonb,
 'connectionsEnabled',true));
end $$;

-- 5. Saves reuse the tested transactions, revision locks and receipts; the new fields are persisted after them in the
-- same transaction. A key the client omits is left untouched, so older clients cannot erase goals or durations.
alter function public.save_wellness(bigint,uuid,jsonb) rename to save_wellness_groceries;
alter function public.save_wellness_groceries(bigint,uuid,jsonb) set schema muse_private;
revoke all on function muse_private.save_wellness_groceries(bigint,uuid,jsonb) from public,anon,authenticated;

create function public.save_wellness(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;already_saved boolean;item jsonb;ver jsonb;gid uuid;z text;today date;cutoff date;existing public.wellness_goals;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select exists(select 1 from public.wellness_commands where user_id=uid and id=p_command_id) into already_saved;
 if not already_saved then
  select time_zone into z from public.profiles where id=uid;
  if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Configure a valid profile timezone first' using errcode='22023';end if;
  today:=(clock_timestamp() at time zone z)::date;
  if jsonb_typeof(p_state->'types')='array' then
   for item in select value from jsonb_array_elements(p_state->'types') loop
    if item ? 'category' and (jsonb_typeof(item->'category')<>'string' or item->>'category' not in ('strength','cardio','mobility','other')) then raise exception 'Invalid movement category' using errcode='22023';end if;
   end loop;
  end if;
  if jsonb_typeof(p_state->'activities')='array' then
   for item in select value from jsonb_array_elements(p_state->'activities') loop
    if item ? 'durationMinutes' and item->'durationMinutes'<>'null'::jsonb and (jsonb_typeof(item->'durationMinutes')<>'number' or (item->>'durationMinutes')::numeric<>trunc((item->>'durationMinutes')::numeric) or (item->>'durationMinutes')::numeric not between 1 and 1440) then raise exception 'Durations are whole minutes between 1 and 1440' using errcode='22023';end if;
   end loop;
  end if;
  if p_state ? 'goals' then
   if jsonb_typeof(p_state->'goals')<>'array' or jsonb_array_length(p_state->'goals')>100 then raise exception 'Invalid goals' using errcode='22023';end if;
   if (select count(distinct value->>'id') from jsonb_array_elements(p_state->'goals'))<>jsonb_array_length(p_state->'goals') then raise exception 'Duplicate goals' using errcode='22023';end if;
   for item in select value from jsonb_array_elements(p_state->'goals') loop
    if coalesce(item->>'id','') !~ '^[0-9a-fA-F-]{36}$' or jsonb_typeof(item->'versions') is distinct from 'array' or jsonb_array_length(item->'versions') not between 1 and 500 then raise exception 'Invalid goal' using errcode='22023';end if;
    if (select count(distinct value->>'effectiveFrom') from jsonb_array_elements(item->'versions'))<>jsonb_array_length(item->'versions') then raise exception 'Duplicate goal versions' using errcode='22023';end if;
    for ver in select value from jsonb_array_elements(item->'versions') loop
     if coalesce(ver->>'effectiveFrom','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or jsonb_typeof(ver->'target')<>'number' or ver->>'direction' not in ('atLeast','atMost') or ver->>'status' not in ('active','paused','inactive') or jsonb_typeof(ver->'unit')<>'string' then raise exception 'Invalid goal version' using errcode='22023';end if;
     if (ver->>'effectiveFrom')::date>today then raise exception 'Goal changes cannot start in the future' using errcode='22023';end if;
    end loop;
   end loop;
  end if;
 end if;
 v:=muse_private.save_wellness_groceries(p_expected_revision,p_command_id,p_state);
 if already_saved then return v;end if;
 if jsonb_typeof(p_state->'types')='array' then
  update public.movement_types t set category=x.value->>'category' from jsonb_array_elements(p_state->'types') x
  where t.user_id=uid and t.id=x.value->>'id' and x.value ? 'category' and t.category is distinct from x.value->>'category';
 end if;
 if jsonb_typeof(p_state->'activities')='array' then
  update public.movement_records r set duration_minutes=(nullif(x.value->'durationMinutes','null'::jsonb)#>>'{}')::integer,updated_at=clock_timestamp() from jsonb_array_elements(p_state->'activities') x
  where r.user_id=uid and r.id=(x.value->>'id')::uuid and x.value ? 'durationMinutes' and r.duration_minutes is distinct from (nullif(x.value->'durationMinutes','null'::jsonb)#>>'{}')::integer;
 end if;
 if p_state ? 'goals' then
  if exists(select 1 from public.wellness_goals g where g.user_id=uid and g.id not in (select (value->>'id')::uuid from jsonb_array_elements(p_state->'goals'))) then raise exception 'Retire goals instead of deleting them' using errcode='22023';end if;
  for item in select value from jsonb_array_elements(p_state->'goals') loop
   gid:=(item->>'id')::uuid;
   select * into existing from public.wellness_goals where id=gid;
   if found and existing.user_id<>uid then raise exception 'Goal unavailable' using errcode='42501';end if;
   if found and (existing.metric,existing.period) is distinct from (item->>'metric',item->>'period') then raise exception 'A goal keeps its measure and period; create another goal instead' using errcode='22023';end if;
   if not found then insert into public.wellness_goals(id,user_id,metric,period,created_at) values(gid,uid,item->>'metric',item->>'period',coalesce((item->>'createdAt')::timestamptz,clock_timestamp()));end if;
   -- Versions before the current period are history: they must be sent back unchanged and cannot be added later.
   cutoff:=case item->>'period' when 'week' then date_trunc('week',today)::date else today end;
   if exists(select 1 from public.wellness_goal_versions v where v.user_id=uid and v.goal_id=gid and v.effective_from<cutoff and not exists(select 1 from jsonb_array_elements(item->'versions') x where (x.value->>'effectiveFrom')::date=v.effective_from and (x.value->>'target')::numeric=v.target and x.value->>'unit'=v.unit and x.value->>'direction'=v.direction and x.value->>'status'=v.status)) then raise exception 'Past goal versions are preserved' using errcode='22023';end if;
   if exists(select 1 from jsonb_array_elements(item->'versions') x where (x.value->>'effectiveFrom')::date<cutoff and not exists(select 1 from public.wellness_goal_versions v where v.user_id=uid and v.goal_id=gid and v.effective_from=(x.value->>'effectiveFrom')::date)) then raise exception 'Goal changes start with the current period' using errcode='22023';end if;
   delete from public.wellness_goal_versions v where v.user_id=uid and v.goal_id=gid and v.effective_from>=cutoff and not exists(select 1 from jsonb_array_elements(item->'versions') x where (x.value->>'effectiveFrom')::date=v.effective_from);
   insert into public.wellness_goal_versions(user_id,goal_id,effective_from,target,unit,direction,status,recorded_at)
   select uid,gid,(x.value->>'effectiveFrom')::date,(x.value->>'target')::numeric,btrim(x.value->>'unit'),x.value->>'direction',x.value->>'status',coalesce((x.value->>'recordedAt')::timestamptz,clock_timestamp()) from jsonb_array_elements(item->'versions') x where (x.value->>'effectiveFrom')::date>=cutoff
   on conflict(goal_id,effective_from) do update set target=excluded.target,unit=excluded.unit,direction=excluded.direction,status=excluded.status,recorded_at=excluded.recorded_at
   where public.wellness_goal_versions.user_id=uid and (public.wellness_goal_versions.target,public.wellness_goal_versions.unit,public.wellness_goal_versions.direction,public.wellness_goal_versions.status) is distinct from (excluded.target,excluded.unit,excluded.direction,excluded.status);
  end loop;
 end if;
 return v;
end $$;
revoke all on function public.save_wellness(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_wellness(bigint,uuid,jsonb) to authenticated;

alter function public.save_rituals(bigint,uuid,jsonb) set schema muse_private;
revoke all on function muse_private.save_rituals(bigint,uuid,jsonb) from public,anon,authenticated;
create function public.save_rituals(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;already_saved boolean;item jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select exists(select 1 from public.ritual_commands where user_id=uid and id=p_command_id) into already_saved;
 if not already_saved and jsonb_typeof(p_state->'rituals')='array' then
  for item in select value from jsonb_array_elements(p_state->'rituals') loop
   if item ? 'connection' and not muse_private.valid_ritual_connection(item->'connection',item->>'type') then raise exception 'Invalid ritual connection' using errcode='22023';end if;
  end loop;
 end if;
 v:=muse_private.save_rituals(p_expected_revision,p_command_id,p_state);
 if already_saved then return v;end if;
 update public.rituals r set connection=nullif(x.value->'connection','null'::jsonb),updated_at=clock_timestamp() from jsonb_array_elements(p_state->'rituals') x
 where r.user_id=uid and r.id=(x.value->>'id')::uuid and x.value ? 'connection' and r.connection is distinct from nullif(x.value->'connection','null'::jsonb);
 return v;
end $$;
revoke all on function public.save_rituals(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_rituals(bigint,uuid,jsonb) to authenticated;
