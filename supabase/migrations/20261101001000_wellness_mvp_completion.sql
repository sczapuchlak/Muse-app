-- Existing single-list UI only. Quantities already include any user-entered units.
create table public.grocery_sections(user_id uuid not null references auth.users on delete cascade,id text not null check(length(id) between 1 and 80),name text not null check(length(btrim(name)) between 1 and 80),position integer not null check(position>=0),primary key(user_id,id));
create table public.grocery_items(id uuid primary key,user_id uuid not null references auth.users on delete cascade,name text not null check(length(btrim(name)) between 1 and 120),quantity text check(length(quantity)<=60),note text check(length(note)<=250),section_id text not null,complete boolean not null,position integer not null check(position>=0),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),foreign key(user_id,section_id) references public.grocery_sections(user_id,id) deferrable initially deferred);
create index grocery_items_list on public.grocery_items(user_id,section_id,complete,position);
do $$ declare t text;begin foreach t in array array['grocery_sections','grocery_items'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 end loop;end $$;
-- A completion is one explicitly recorded activity/type/date. Preserve unexpected
-- legacy duplicates for investigation rather than guessing which real row to erase.
do $$ begin if exists(select 1 from public.movement_records group by user_id,local_date,type_id having count(*)>1) then raise exception 'Duplicate activity records need review before adding completion uniqueness';end if;end $$;
alter table public.movement_records add constraint movement_records_day_type unique(user_id,local_date,type_id);
create or replace function public.read_wellness() returns jsonb language plpgsql stable security invoker set search_path='' as $$
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
 'grocerySections',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by position,id) from public.grocery_sections where user_id=auth.uid()),'[]'),
 'groceryItems',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'quantity',quantity,'note',note,'sectionId',section_id,'complete',complete,'createdAt',created_at)) order by position,id) from public.grocery_items where user_id=auth.uid()),'[]'),
 'activities',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',local_date,'typeId',type_id,'timeZone',captured_time_zone,'createdAt',created_at)) from public.movement_records where user_id=auth.uid()),'[]')));
end $$;

-- Reuse the tested Wellness save transaction, revision lock and receipt hash.
-- Moving the underlying command out of public prevents older clients bypassing
-- grocery validation. No personal records or existing receipts are rewritten.
alter function public.save_wellness(bigint,uuid,jsonb) set schema muse_private;
revoke all on function muse_private.save_wellness(bigint,uuid,jsonb) from public,anon,authenticated;
create function public.save_wellness(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();k text;item jsonb;v bigint;pos integer;already_saved boolean;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 foreach k in array array['groceryItems','grocerySections'] loop
  if jsonb_typeof(p_state->k) is distinct from 'array' or jsonb_array_length(p_state->k)>5000 then raise exception 'Invalid grocery collection; reload the current client' using errcode='22023';end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_state->k))<>jsonb_array_length(p_state->k) then raise exception 'Duplicate grocery identities' using errcode='22023';end if;
 end loop;
 insert into public.wellness_versions(user_id) values(uid) on conflict do nothing;
 perform 1 from public.wellness_versions where user_id=uid for update;
 select exists(select 1 from public.wellness_commands where user_id=uid and id=p_command_id) into already_saved;
 v:=muse_private.save_wellness(p_expected_revision,p_command_id,p_state);
 -- A repeated receipt must not replay an old grocery snapshot over newer edits.
 if already_saved then return v;end if;
 for item in select value from jsonb_array_elements(p_state->'groceryItems') loop
  if exists(select 1 from public.grocery_items where id=(item->>'id')::uuid and user_id<>uid) then raise exception 'Grocery item unavailable' using errcode='42501';end if;
 end loop;
 -- Undo is a revision-checked restore with the same stable item ID. Direct writes
 -- remain unavailable; stale lists cannot restore over a later owner's revision.
 delete from public.grocery_items where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'groceryItems'));
 pos:=0;
 for item in select value from jsonb_array_elements(p_state->'grocerySections') loop
  insert into public.grocery_sections values(uid,item->>'id',btrim(item->>'name'),pos)
  on conflict(user_id,id) do update set name=excluded.name,position=excluded.position;
  pos:=pos+1;
 end loop;
 -- The current interface cannot delete categories. Do not erase stored definitions
 -- merely because an older snapshot omits them.
 if exists(select 1 from public.grocery_sections where user_id=uid and id not in(select value->>'id' from jsonb_array_elements(p_state->'grocerySections'))) then raise exception 'Stored categories must be preserved' using errcode='22023';end if;
 pos:=0;
 for item in select value from jsonb_array_elements(p_state->'groceryItems') loop
  insert into public.grocery_items(id,user_id,name,quantity,note,section_id,complete,position,created_at)
  values((item->>'id')::uuid,uid,btrim(item->>'name'),nullif(btrim(item->>'quantity'),''),nullif(btrim(item->>'note'),''),item->>'sectionId',(item->>'complete')::boolean,pos,coalesce((item->>'createdAt')::timestamptz,clock_timestamp()))
  on conflict(id) do update set name=excluded.name,quantity=excluded.quantity,note=excluded.note,section_id=excluded.section_id,complete=excluded.complete,position=excluded.position,updated_at=clock_timestamp()
  where public.grocery_items.user_id=uid and (public.grocery_items.name,public.grocery_items.quantity,public.grocery_items.note,public.grocery_items.section_id,public.grocery_items.complete,public.grocery_items.position) is distinct from (excluded.name,excluded.quantity,excluded.note,excluded.section_id,excluded.complete,excluded.position);
  pos:=pos+1;
 end loop;
 return v;
end $$;
revoke all on function public.save_wellness(bigint,uuid,jsonb) from public,anon;grant execute on function public.save_wellness(bigint,uuid,jsonb) to authenticated;
