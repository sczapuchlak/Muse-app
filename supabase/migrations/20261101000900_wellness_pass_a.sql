-- Local Wellness Phase 1. No fictional record import. Existing selections are intentions.
create table public.wellness_versions(user_id uuid primary key references auth.users on delete cascade, revision bigint not null default 0);
create table public.wellness_commands(user_id uuid not null references auth.users on delete cascade,id uuid not null,request_hash bytea not null,revision bigint not null,primary key(user_id,id));
create function muse_private.valid_nutrition(n jsonb) returns boolean language sql immutable set search_path='' as $$
 select n is null or (jsonb_typeof(n)='object' and not exists(select 1 from jsonb_each(n) e where e.key not in ('calories','protein','carbs','fat') or jsonb_typeof(e.value)<>'number' or case when jsonb_typeof(e.value)='number' then (e.value::text)::numeric not between 0 and 1000000 else true end));
$$;
create table public.saved_meals(id uuid primary key,user_id uuid not null references auth.users on delete cascade,name text not null check(length(btrim(name)) between 1 and 160),meal_types text[] not null check(meal_types <@ array['breakfast','lunch','dinner','snacks']::text[]),note text check(length(note)<=500),link text check(length(link)<=2048 and link ~* '^https?://[^[:space:][:cntrl:]]+$'),nutrition jsonb check(muse_private.valid_nutrition(nutrition)),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(user_id,id));
create unique index saved_meals_name on public.saved_meals(user_id,lower(btrim(name)));
create table public.meal_assignments(id uuid primary key,user_id uuid not null references auth.users on delete cascade,local_date date not null,slot text not null check(slot in ('breakfast','lunch','dinner','snacks')),title text not null check(length(btrim(title)) between 1 and 160),note text check(length(note)<=500),nutrition jsonb check(muse_private.valid_nutrition(nutrition)),saved_meal_id uuid,position integer not null check(position>=0),captured_time_zone text not null,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),foreign key(user_id,saved_meal_id) references public.saved_meals(user_id,id) deferrable initially deferred);
create index meal_assignments_day on public.meal_assignments(user_id,local_date,slot,position);
create table public.hydration_settings(user_id uuid primary key references auth.users on delete cascade,goal numeric not null check(goal>0 and goal<=1000000),unit text not null check(unit in ('oz','mL')),quick_adds numeric[] not null check(cardinality(quick_adds) between 1 and 8 and 0<all(quick_adds) and 1000000>=all(quick_adds) and array_position(quick_adds,null) is null));
create table public.hydration_days(user_id uuid not null references auth.users on delete cascade,local_date date not null,quantity numeric not null check(quantity>=0 and quantity<=1000000),goal numeric not null check(goal>0 and goal<=1000000),unit text not null check(unit in ('oz','mL')),captured_time_zone text not null,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),primary key(user_id,local_date));
-- Stable text catalog IDs retain existing starter IDs; custom IDs remain random UUID strings.
create table public.movement_types(user_id uuid not null references auth.users on delete cascade,id text not null check(length(id) between 1 and 80),label text not null check(length(btrim(label)) between 1 and 40),origin text not null check(origin in ('starter','custom')),archived boolean not null default false,primary key(user_id,id));
create unique index movement_type_names on public.movement_types(user_id,lower(btrim(label))) where not archived;
create table public.movement_preferences(user_id uuid primary key references auth.users on delete cascade,quick_ids text[] not null check(cardinality(quick_ids)<=5),recent_ids text[] not null);
create table public.movement_days(user_id uuid not null references auth.users on delete cascade,local_date date not null,captured_time_zone text not null,primary key(user_id,local_date));
create table public.movement_day_types(user_id uuid not null,local_date date not null,type_id text not null,primary key(user_id,local_date,type_id),foreign key(user_id,local_date) references public.movement_days(user_id,local_date) on delete cascade,foreign key(user_id,type_id) references public.movement_types(user_id,id) deferrable initially deferred);
-- Actual records are explicitly separate, never synthesized from the intention shelf.
-- No new workout editor is introduced; current UI only edits movement intentions.
create table public.movement_records(id uuid primary key,user_id uuid not null references auth.users on delete cascade,local_date date not null,type_id text not null,captured_time_zone text not null,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),foreign key(user_id,type_id) references public.movement_types(user_id,id) deferrable initially deferred);
create index movement_records_day on public.movement_records(user_id,local_date);
do $$ declare t text;begin foreach t in array array['wellness_versions','wellness_commands','saved_meals','meal_assignments','hydration_settings','hydration_days','movement_types','movement_preferences','movement_days','movement_day_types','movement_records'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 end loop;end $$;
create function public.read_wellness() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.wellness_versions where user_id=auth.uid()),0),'state',jsonb_build_object(
 'assignments',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'date',local_date,'slot',slot,'title',title,'note',note,'nutrition',nutrition,'savedMealId',saved_meal_id,'order',position,'createdAt',created_at,'timeZone',captured_time_zone))) from public.meal_assignments where user_id=auth.uid()),'[]'),
 'savedMeals',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'mealTypes',meal_types,'note',note,'link',link,'nutrition',nutrition,'createdAt',created_at))) from public.saved_meals where user_id=auth.uid()),'[]'),
 'water',coalesce((select jsonb_agg(jsonb_build_object('date',local_date,'total',quantity,'goal',goal,'unit',unit,'timeZone',captured_time_zone)) from public.hydration_days where user_id=auth.uid()),'[]'),
 'waterSettings',(select jsonb_build_object('goal',goal,'unit',unit,'quickAdds',quick_adds) from public.hydration_settings where user_id=auth.uid()),
 'types',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',label,'source',origin,'archived',archived) order by id) from public.movement_types where user_id=auth.uid()),'[]'),
 'quickIds',coalesce((select to_jsonb(quick_ids) from public.movement_preferences where user_id=auth.uid()),'[]'),
 'recentIds',coalesce((select to_jsonb(recent_ids) from public.movement_preferences where user_id=auth.uid()),'[]'),
 'movement',coalesce((select jsonb_agg(jsonb_build_object('date',d.local_date,'timeZone',d.captured_time_zone,'typeIds',coalesce((select jsonb_agg(type_id order by type_id) from public.movement_day_types t where t.user_id=d.user_id and t.local_date=d.local_date),'[]'))) from public.movement_days d where d.user_id=auth.uid()),'[]'),
 'activities',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',local_date,'typeId',type_id,'timeZone',captured_time_zone,'createdAt',created_at)) from public.movement_records where user_id=auth.uid()),'[]')));
end $$;
revoke all on function public.read_wellness() from public,anon;grant execute on function public.read_wellness() to authenticated;

-- Same bounded owner-revision/receipt pattern as Notes. Conservative conflict scope
-- protects move/copy, hydration increments and library edits in one atomic transaction.
create function public.save_wellness(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;r public.wellness_commands;h bytea;item jsonb;k text;z text;d date;ident text;foreign_record boolean;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select time_zone into z from public.profiles where id=uid;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Configure a valid profile timezone first' using errcode='22023';end if;
 if p_command_id is null or p_expected_revision is null or jsonb_typeof(p_state) is distinct from 'object' or octet_length(p_state::text)>8388608 then raise exception 'Invalid Wellness state' using errcode='22023';end if;
 foreach k in array array['assignments','savedMeals','water','types','quickIds','recentIds','movement','activities'] loop
  if jsonb_typeof(p_state->k) is distinct from 'array' or jsonb_array_length(p_state->k)>5000 then raise exception 'Invalid or oversized Wellness collection' using errcode='22023';end if;
 end loop;
 insert into public.wellness_versions(user_id) values(uid) on conflict do nothing;
 select revision into v from public.wellness_versions where user_id=uid for update;
 h:=sha256(convert_to(p_state::text,'UTF8'));select * into r from public.wellness_commands where user_id=uid and id=p_command_id;
 if found then if r.request_hash<>h then raise exception 'Command reused' using errcode='22023';end if;return r.revision;end if;
 if v<>p_expected_revision then raise exception 'Wellness changed; reload before saving' using errcode='40001';end if;
 foreach k in array array['assignments','savedMeals','types','activities'] loop
  if (select count(distinct value->>'id') from jsonb_array_elements(p_state->k))<>jsonb_array_length(p_state->k) then raise exception 'Duplicate IDs' using errcode='22023';end if;
 end loop;
 foreach k in array array['assignments','water','movement','activities'] loop
  for item in select value from jsonb_array_elements(p_state->k) loop
   if item->>'date' is null or item->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Use an explicit local calendar date' using errcode='22023';end if;
  end loop;
 end loop;
 foreach k in array array['water','movement'] loop
  if (select count(distinct value->>'date') from jsonb_array_elements(p_state->k))<>jsonb_array_length(p_state->k) then raise exception 'Duplicate dates' using errcode='22023';end if;
 end loop;
 foreach k in array array['quickIds','recentIds'] loop
  if (select count(distinct value) from jsonb_array_elements_text(p_state->k))<>jsonb_array_length(p_state->k) then raise exception 'Duplicate movement preferences' using errcode='22023';end if;
 end loop;
 if jsonb_array_length(p_state->'quickIds')>5 then raise exception 'Too many quick types' using errcode='22023';end if;
 -- Check global UUID ownership before any upsert; scoped foreign keys protect links.
 foreach k in array array['assignments','savedMeals','activities'] loop
  for item in select value from jsonb_array_elements(p_state->k) loop
   if item->>'id' is null then raise exception 'Missing identity' using errcode='22023';end if;
   ident:=case k when 'assignments' then 'meal_assignments' when 'savedMeals' then 'saved_meals' else 'movement_records' end;
   execute format('select exists(select 1 from public.%I where id=$1 and user_id<>$2)',ident) into foreign_record using (item->>'id')::uuid,uid;
   if foreign_record then raise exception 'Record unavailable' using errcode='42501';end if;
  end loop;
 end loop;
 -- Detach saved references before explicit removal; occurrence snapshots survive.
 update public.meal_assignments set saved_meal_id=null where user_id=uid and saved_meal_id not in (select (value->>'id')::uuid from jsonb_array_elements(p_state->'savedMeals'));
 delete from public.meal_assignments where user_id=uid and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_state->'assignments'));
 delete from public.saved_meals where user_id=uid and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_state->'savedMeals'));
 for item in select value from jsonb_array_elements(p_state->'savedMeals') loop
  insert into public.saved_meals(id,user_id,name,meal_types,note,link,nutrition) values((item->>'id')::uuid,uid,btrim(item->>'name'),array(select jsonb_array_elements_text(item->'mealTypes')),item->>'note',item->>'link',item->'nutrition')
  on conflict(id) do update set name=excluded.name,meal_types=excluded.meal_types,note=excluded.note,link=excluded.link,nutrition=excluded.nutrition,updated_at=clock_timestamp() where public.saved_meals.user_id=uid and (public.saved_meals.name,public.saved_meals.meal_types,public.saved_meals.note,public.saved_meals.link,public.saved_meals.nutrition) is distinct from (excluded.name,excluded.meal_types,excluded.note,excluded.link,excluded.nutrition);
 end loop;
 for item in select value from jsonb_array_elements(p_state->'assignments') loop
  insert into public.meal_assignments(id,user_id,local_date,slot,title,note,nutrition,saved_meal_id,position,captured_time_zone) values((item->>'id')::uuid,uid,(item->>'date')::date,item->>'slot',btrim(item->>'title'),item->>'note',item->'nutrition',(item->>'savedMealId')::uuid,coalesce((item->>'order')::integer,0),z)
  on conflict(id) do update set local_date=excluded.local_date,slot=excluded.slot,title=excluded.title,note=excluded.note,nutrition=excluded.nutrition,saved_meal_id=excluded.saved_meal_id,position=excluded.position,updated_at=clock_timestamp() where public.meal_assignments.user_id=uid and (public.meal_assignments.local_date,public.meal_assignments.slot,public.meal_assignments.title,public.meal_assignments.note,public.meal_assignments.nutrition,public.meal_assignments.saved_meal_id,public.meal_assignments.position) is distinct from (excluded.local_date,excluded.slot,excluded.title,excluded.note,excluded.nutrition,excluded.saved_meal_id,excluded.position);
 end loop;
 if p_state->'waterSettings' is null or jsonb_typeof(p_state->'waterSettings') not in ('null','object') then raise exception 'Invalid hydration settings' using errcode='22023';end if;
 if p_state->'waterSettings'='null'::jsonb and exists(select 1 from public.hydration_settings where user_id=uid) then raise exception 'Hydration settings cannot be silently cleared' using errcode='22023';end if;
 if p_state->'waterSettings'<>'null'::jsonb then
  item:=p_state->'waterSettings';if jsonb_typeof(item->'quickAdds') is distinct from 'array' then raise exception 'Invalid quick amounts' using errcode='22023';end if;insert into public.hydration_settings values(uid,(item->>'goal')::numeric,item->>'unit',array(select value::numeric from jsonb_array_elements_text(item->'quickAdds')))
  on conflict(user_id) do update set goal=excluded.goal,unit=excluded.unit,quick_adds=excluded.quick_adds;
 end if;
 delete from public.hydration_days where user_id=uid and local_date not in(select (value->>'date')::date from jsonb_array_elements(p_state->'water'));
 for item in select value from jsonb_array_elements(p_state->'water') loop
  -- Relabeling historical units is forbidden; the current UI has no conversion editor.
  if exists(select 1 from public.hydration_days where user_id=uid and local_date=(item->>'date')::date and unit<>item->>'unit') then raise exception 'Explicit unit conversion is required' using errcode='22023';end if;
  insert into public.hydration_days values(uid,(item->>'date')::date,(item->>'total')::numeric,(item->>'goal')::numeric,item->>'unit',z)
  on conflict(user_id,local_date) do update set quantity=excluded.quantity,goal=excluded.goal,unit=excluded.unit,updated_at=clock_timestamp() where (public.hydration_days.quantity,public.hydration_days.goal,public.hydration_days.unit) is distinct from (excluded.quantity,excluded.goal,excluded.unit);
 end loop;
 for item in select value from jsonb_array_elements(p_state->'types') loop
  insert into public.movement_types values(uid,item->>'id',btrim(item->>'name'),item->>'source',(item->>'archived')::boolean)
  on conflict(user_id,id) do update set label=excluded.label,archived=excluded.archived;
 end loop;
 -- Definitions archive, never erase history. Reject omission of existing types.
 if exists(select 1 from public.movement_types where user_id=uid and id not in(select value->>'id' from jsonb_array_elements(p_state->'types'))) then raise exception 'Archive movement types instead of deleting' using errcode='22023';end if;
 for ident in select jsonb_array_elements_text(p_state->'quickIds') union select jsonb_array_elements_text(p_state->'recentIds') loop
  if not exists(select 1 from public.movement_types where user_id=uid and id=ident) then raise exception 'Unknown movement preference' using errcode='22023';end if;
 end loop;
 insert into public.movement_preferences values(uid,array(select jsonb_array_elements_text(p_state->'quickIds')),array(select jsonb_array_elements_text(p_state->'recentIds'))) on conflict(user_id) do update set quick_ids=excluded.quick_ids,recent_ids=excluded.recent_ids;
 delete from public.movement_days where user_id=uid and local_date not in(select (value->>'date')::date from jsonb_array_elements(p_state->'movement'));
 for item in select value from jsonb_array_elements(p_state->'movement') loop
  d:=(item->>'date')::date;insert into public.movement_days values(uid,d,z) on conflict do nothing;
  delete from public.movement_day_types where user_id=uid and local_date=d;
  for ident in select jsonb_array_elements_text(item->'typeIds') loop insert into public.movement_day_types values(uid,d,ident);end loop;
 end loop;
 delete from public.movement_records where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'activities'));
 for item in select value from jsonb_array_elements(p_state->'activities') loop
  insert into public.movement_records(id,user_id,local_date,type_id,captured_time_zone) values((item->>'id')::uuid,uid,(item->>'date')::date,item->>'typeId',z)
  on conflict(id) do update set local_date=excluded.local_date,type_id=excluded.type_id,updated_at=clock_timestamp() where public.movement_records.user_id=uid and (public.movement_records.local_date,public.movement_records.type_id) is distinct from (excluded.local_date,excluded.type_id);
 end loop;
 update public.wellness_versions set revision=revision+1 where user_id=uid returning revision into v;
 insert into public.wellness_commands values(uid,p_command_id,h,v);return v;
end $$;
revoke all on function public.save_wellness(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_wellness(bigint,uuid,jsonb) to authenticated;

-- Extend the existing owner-only export; never export command receipts.
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
 'wellness',public.read_wellness()->'state',
 'emotion_catalog',(select jsonb_agg(to_jsonb(e)) from public.emotion_catalog e));
end $$;
