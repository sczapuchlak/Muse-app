-- Habit trackers (#85): categorical habits, e.g. workout type or rest day. Additive.
-- A categorical habit has a legend (`rituals.categories`: [{id,label,color}]); each logged day stores the chosen
-- category id (`ritual_entries.category`) with value 1. Missed (value 0) and Clear keep their usual meaning. Nothing is
-- inferred: a category is never derived from other records or turned into a binary completion.
-- Same pattern as Connected Rituals: the core save function is unchanged; the public wrapper validates and writes the
-- new fields after it.

alter table public.rituals drop constraint rituals_tracking_type_check;
alter table public.rituals add constraint rituals_tracking_type_check check (tracking_type in ('checkbox','numeric','duration','weekly-target','category'));

create function muse_private.valid_ritual_categories(c jsonb) returns boolean language sql immutable set search_path='' as $$
 select c is null or (
  jsonb_typeof(c)='array' and jsonb_array_length(c) between 1 and 12
  and (select count(distinct x->>'id') from jsonb_array_elements(c) x)=jsonb_array_length(c)
  and not exists(select 1 from jsonb_array_elements(c) x where jsonb_typeof(x)<>'object'
   or coalesce(x->>'id','') !~ '^[A-Za-z0-9-]{1,40}$'
   or length(btrim(coalesce(x->>'label',''))) not between 1 and 40
   or coalesce(x->>'color','') !~ '^#[0-9a-fA-F]{6}$'))
$$;
revoke all on function muse_private.valid_ritual_categories(jsonb) from public,anon,authenticated;

alter table public.rituals add column categories jsonb check (muse_private.valid_ritual_categories(categories));
-- (The wrapper enforces 'categorical ⇔ has a legend'; a table check can't, because the core inserts before the legend is written.)
alter table public.ritual_entries add column category text check (category is null or category ~ '^[A-Za-z0-9-]{1,40}$');

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
 return v;
end $$;
revoke all on function public.save_rituals(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_rituals(bigint,uuid,jsonb) to authenticated;

create or replace function public.read_rituals() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.ritual_versions_owner where user_id=auth.uid()),0),'state',jsonb_build_object(
 'groups',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'accent',accent,'icon',icon_id,'gradient',gradient,'collapsed',collapsed)) order by position,id) from public.ritual_groups where user_id=auth.uid()),'[]'),
 'rituals',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('categories',categories))||jsonb_build_object('id',id,'name',name,'groupId',group_id,'type',tracking_type,'goal',goal,'unit',unit,'recurrence',case recurrence when 'daily' then jsonb_build_object('kind','daily') when 'weekly' then jsonb_build_object('kind','weekly','weekday',weekdays[1]) else jsonb_build_object('kind','weekdays','weekdays',weekdays) end,'startDate',start_date,'createdAt',created_at,'status',lifecycle_status,'inactivePeriods',coalesce((select jsonb_agg(jsonb_build_object('start',p.starts_on,'end',p.ends_before,'kind',p.kind) order by p.starts_on) from public.ritual_inactive_periods p where p.user_id=rituals.user_id and p.ritual_id=rituals.id),'[]'::jsonb),'connection',connection) order by position,id) from public.rituals where user_id=auth.uid()),'[]'),
 'entries',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',ritual_id::text||'/'||local_date::text,'ritualId',ritual_id,'date',local_date,'value',value,'outcome',case when outcome='missed' then 'missed' end,'category',category,'updatedAt',updated_at))) from public.ritual_entries where user_id=auth.uid()),'[]'),
 'celebratedMilestones','[]'::jsonb,
 'connectionsEnabled',true,
 'categoriesEnabled',true));
end $$;
revoke all on function public.read_rituals() from public,anon;grant execute on function public.read_rituals() to authenticated;
