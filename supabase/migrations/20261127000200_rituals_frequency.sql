-- Rituals 2 (#104 §6): two additive options, same wrapper pattern as Categories and Connected Rituals; the core
-- save function is unchanged.
-- 1. "X times per week": a daily-available ritual whose week is met by N distinct completed days (1–7). Null keeps
--    every existing ritual exactly as it was.
-- 2. A Water-connected ritual may follow the shared water goal for each date (connection.followGoal), so it shows the
--    same goal as Daily Edit. Off unless chosen; a ritual's own goal is never overwritten.
alter table public.rituals add column times_per_week integer check (times_per_week between 1 and 7);
-- 3. An optional emoji for each habit, shown in Rituals and Daily Edit.
alter table public.rituals add column emoji text check (emoji is null or char_length(emoji) between 1 and 16);

create or replace function muse_private.valid_ritual_connection(c jsonb,tracking text) returns boolean language sql immutable set search_path='' as $$
 select c is null or c='null'::jsonb or (
  jsonb_typeof(c)='object'
  and not exists(select 1 from jsonb_object_keys(c) k where k not in ('metric','since','category','typeId','unit','threshold','followGoal'))
  and c->>'metric' in ('water','workouts','workout-minutes','reading-minutes','reading-pages','books-finished','tasks-completed')
  and coalesce(c->>'since','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  and (c->'category' is null or c->>'category' in ('strength','cardio','mobility','other'))
  and (c->'unit' is null or c->>'unit' in ('oz','mL'))
  and (c->'typeId' is null or (jsonb_typeof(c->'typeId')='string' and length(c->>'typeId') between 1 and 80))
  and (c->'threshold' is null or (jsonb_typeof(c->'threshold')='number' and (c->>'threshold')::numeric>0 and (c->>'threshold')::numeric<=1000000))
  and (c->'followGoal' is null or (jsonb_typeof(c->'followGoal')='boolean' and c->>'metric'='water'))
  and case tracking
   when 'duration' then c->>'metric' in ('workout-minutes','reading-minutes')
   when 'weekly-target' then c->>'metric' in ('workouts','books-finished','tasks-completed')
   else true end)
$$;

create or replace function public.save_rituals(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;already_saved boolean;item jsonb;legend jsonb;used text[];
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select exists(select 1 from public.ritual_commands where user_id=uid and id=p_command_id) into already_saved;
 if not already_saved and jsonb_typeof(p_state->'rituals')='array' then
  for item in select value from jsonb_array_elements(p_state->'rituals') loop
   if item ? 'connection' and not muse_private.valid_ritual_connection(item->'connection',item->>'type') then raise exception 'Invalid ritual connection' using errcode='22023';end if;
   legend:=nullif(item->'categories','null'::jsonb);
   if (item->>'type'='category')<>(legend is not null) or not muse_private.valid_ritual_categories(legend) then raise exception 'Invalid ritual categories' using errcode='22023';end if;
   if item ? 'emoji' and nullif(item->'emoji','null'::jsonb) is not null and (jsonb_typeof(item->'emoji')<>'string' or char_length(item->>'emoji') not between 1 and 16) then raise exception 'Invalid ritual emoji' using errcode='22023';end if;
   if item ? 'timesPerWeek' and nullif(item->'timesPerWeek','null'::jsonb) is not null and (jsonb_typeof(item->'timesPerWeek')<>'number' or (item->>'timesPerWeek')::numeric not in (1,2,3,4,5,6,7) or item->'recurrence'->>'kind'<>'daily' or item->>'type' in ('weekly-target','category')) then raise exception 'Invalid times per week' using errcode='22023';end if;
   if item->>'type'='category' and item ? 'connection' and nullif(item->'connection','null'::jsonb) is not null then raise exception 'Categorical rituals cannot be connected' using errcode='22023';end if;
   -- A category used in history stays in the legend (it can be renamed or recolored).
   if legend is not null then
    select array_agg(distinct e.category) into used from public.ritual_entries e where e.user_id=uid and e.ritual_id=(item->>'id')::uuid and e.category is not null;
    if used is not null and exists(select 1 from unnest(used) u where not exists(select 1 from jsonb_array_elements(legend) x where x->>'id'=u)) then raise exception 'A category used in history cannot be removed' using errcode='22023';end if;
   end if;
  end loop;
  -- Categorical entries: value 0 (missed) or 1 with a category from that ritual's legend in this same state.
  if jsonb_typeof(p_state->'entries')='array' and exists(
   select 1 from jsonb_array_elements(p_state->'entries') e
   left join lateral (select x from jsonb_array_elements(p_state->'rituals') x where x->>'id'=e->>'ritualId' limit 1) r on true
   where (r.x->>'type'='category' and (
      (e->>'value')::numeric not in (0,1)
      or ((e->>'value')::numeric=1)<>(e ? 'category')
      or (e ? 'category' and not exists(select 1 from jsonb_array_elements(r.x->'categories') c where c->>'id'=e->>'category'))))
    or (coalesce(r.x->>'type','')<>'category' and e ? 'category')) then
   raise exception 'Invalid categorical outcome' using errcode='22023';
  end if;
 end if;
 v:=muse_private.save_rituals(p_expected_revision,p_command_id,p_state);
 if already_saved then return v;end if;
 update public.rituals r set connection=nullif(x.value->'connection','null'::jsonb),updated_at=clock_timestamp() from jsonb_array_elements(p_state->'rituals') x
 where r.user_id=uid and r.id=(x.value->>'id')::uuid and x.value ? 'connection' and r.connection is distinct from nullif(x.value->'connection','null'::jsonb);
 update public.rituals r set categories=nullif(x.value->'categories','null'::jsonb),updated_at=clock_timestamp() from jsonb_array_elements(p_state->'rituals') x
 where r.user_id=uid and r.id=(x.value->>'id')::uuid and r.categories is distinct from nullif(x.value->'categories','null'::jsonb);
 update public.ritual_entries e set category=x.value->>'category',updated_at=clock_timestamp() from jsonb_array_elements(p_state->'entries') x
 where e.user_id=uid and e.ritual_id=(x.value->>'ritualId')::uuid and e.local_date=(x.value->>'date')::date and e.category is distinct from x.value->>'category';
 update public.rituals r set emoji=nullif(x.value->>'emoji',''),updated_at=clock_timestamp() from jsonb_array_elements(p_state->'rituals') x
 where r.user_id=uid and r.id=(x.value->>'id')::uuid and x.value ? 'emoji' and r.emoji is distinct from nullif(x.value->>'emoji','');
 update public.rituals r set times_per_week=(nullif(x.value->'timesPerWeek','null'::jsonb))::text::int,updated_at=clock_timestamp() from jsonb_array_elements(p_state->'rituals') x
 where r.user_id=uid and r.id=(x.value->>'id')::uuid and r.times_per_week is distinct from (nullif(x.value->'timesPerWeek','null'::jsonb))::text::int;
 return v;
end $$;
revoke all on function public.save_rituals(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_rituals(bigint,uuid,jsonb) to authenticated;

create or replace function public.read_rituals() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.ritual_versions_owner where user_id=auth.uid()),0),'state',jsonb_build_object(
 'groups',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'accent',accent,'icon',icon_id,'gradient',gradient,'collapsed',collapsed)) order by position,id) from public.ritual_groups where user_id=auth.uid()),'[]'),
 'rituals',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('categories',categories,'timesPerWeek',times_per_week,'emoji',emoji))||jsonb_build_object('id',id,'name',name,'groupId',group_id,'type',tracking_type,'goal',goal,'unit',unit,'recurrence',case recurrence when 'daily' then jsonb_build_object('kind','daily') when 'weekly' then jsonb_build_object('kind','weekly','weekday',weekdays[1]) else jsonb_build_object('kind','weekdays','weekdays',weekdays) end,'startDate',start_date,'createdAt',created_at,'status',lifecycle_status,'inactivePeriods',coalesce((select jsonb_agg(jsonb_build_object('start',p.starts_on,'end',p.ends_before,'kind',p.kind) order by p.starts_on) from public.ritual_inactive_periods p where p.user_id=rituals.user_id and p.ritual_id=rituals.id),'[]'::jsonb),'connection',connection) order by position,id) from public.rituals where user_id=auth.uid()),'[]'),
 'entries',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',ritual_id::text||'/'||local_date::text,'ritualId',ritual_id,'date',local_date,'value',value,'outcome',case when outcome='missed' then 'missed' end,'category',category,'updatedAt',updated_at))) from public.ritual_entries where user_id=auth.uid()),'[]'),
 'celebratedMilestones','[]'::jsonb,
 'connectionsEnabled',true,
 'categoriesEnabled',true));
end $$;
revoke all on function public.read_rituals() from public,anon;grant execute on function public.read_rituals() to authenticated;
