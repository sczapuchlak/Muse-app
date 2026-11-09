-- #112 Movement outcomes: what happened to a planned movement on a day.
-- Planned stays a movement_day_types row; Completed stays the existing movement_records row (unchanged, still the only
-- thing that counts as completed movement). This adds Skipped, Rest / Recovery and Sick / Injured as their own small
-- owner-only table. Additive only: nothing existing is rewritten, inferred or backfilled.
--
-- It is keyed to the day (movement_days), not to movement_day_types, because saves replace a day's type rows; an
-- outcome therefore survives saves from older clients that don't know about outcomes. Removing the whole day removes
-- its outcomes.
create table public.movement_day_outcomes(
 user_id uuid not null references auth.users on delete cascade,
 local_date date not null,
 type_id text not null,
 outcome text not null check (outcome in ('skipped','rest','sick')),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(user_id,local_date,type_id),
 foreign key(user_id,local_date) references public.movement_days(user_id,local_date) on delete cascade,
 foreign key(user_id,type_id) references public.movement_types(user_id,id) deferrable initially deferred
);
alter table public.movement_day_outcomes enable row level security;
revoke all on public.movement_day_outcomes from public,anon,authenticated;
grant select on public.movement_day_outcomes to authenticated;
create policy owner_read on public.movement_day_outcomes for select to authenticated using ((select auth.uid())=user_id);

-- Reads add each day's outcomes and `movementOutcomes`, which tells clients the server supports them.
create or replace function public.read_wellness()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
 'movement',coalesce((select jsonb_agg(jsonb_build_object('date',d.local_date,'timeZone',d.captured_time_zone,'typeIds',coalesce((select jsonb_agg(type_id order by type_id) from public.movement_day_types t where t.user_id=d.user_id and t.local_date=d.local_date),'[]'),'outcomes',coalesce((select jsonb_object_agg(o.type_id,o.outcome) from public.movement_day_outcomes o where o.user_id=d.user_id and o.local_date=d.local_date),'{}'::jsonb))) from public.movement_days d where d.user_id=auth.uid()),'[]'),
 'grocerySections',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by position,id) from public.grocery_sections where user_id=auth.uid()),'[]'),
 'groceryItems',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'quantity',quantity,'note',note,'sectionId',section_id,'complete',complete,'createdAt',created_at)) order by position,id) from public.grocery_items where user_id=auth.uid()),'[]'),
 'activities',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'date',local_date,'typeId',type_id,'timeZone',captured_time_zone,'createdAt',created_at,'durationMinutes',duration_minutes))) from public.movement_records where user_id=auth.uid()),'[]'),
 'movementOutcomes',true,
'goals',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'metric',g.metric,'period',g.period,'createdAt',g.created_at,'versions',coalesce((select jsonb_agg(jsonb_build_object('effectiveFrom',v.effective_from,'target',v.target,'unit',v.unit,'direction',v.direction,'status',v.status,'recordedAt',v.recorded_at) order by v.effective_from) from public.wellness_goal_versions v where v.user_id=g.user_id and v.goal_id=g.id),'[]')) order by g.created_at,g.id) from public.wellness_goals g where g.user_id=auth.uid()),'[]')));
end $function$;

-- Saves keep every existing rule and receipt; outcomes are written after them in the same transaction. A day that omits
-- `outcomes` is left untouched, so older clients cannot erase them. An outcome needs the movement to be planned that day.
alter function public.save_wellness(bigint,uuid,jsonb) rename to save_wellness_goals;
alter function public.save_wellness_goals(bigint,uuid,jsonb) set schema muse_private;
revoke all on function muse_private.save_wellness_goals(bigint,uuid,jsonb) from public,anon,authenticated;

create function public.save_wellness(p_expected_revision bigint,p_command_id uuid,p_state jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;already_saved boolean;item jsonb;pair record;d date;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select exists(select 1 from public.wellness_commands where user_id=uid and id=p_command_id) into already_saved;
 if not already_saved and jsonb_typeof(p_state->'movement')='array' then
  for item in select value from jsonb_array_elements(p_state->'movement') loop
   if item ? 'outcomes' then
    if jsonb_typeof(item->'outcomes')<>'object' or (select count(*) from jsonb_object_keys(item->'outcomes'))>50 then raise exception 'Invalid movement outcomes' using errcode='22023';end if;
    for pair in select key,value from jsonb_each(item->'outcomes') loop
     if jsonb_typeof(pair.value)<>'string' or pair.value#>>'{}' not in ('skipped','rest','sick') then raise exception 'Invalid movement outcome' using errcode='22023';end if;
     if jsonb_typeof(item->'typeIds')<>'array' or not (item->'typeIds') ? pair.key then raise exception 'An outcome needs a planned movement' using errcode='22023';end if;
    end loop;
   end if;
  end loop;
 end if;
 v:=muse_private.save_wellness_goals(p_expected_revision,p_command_id,p_state);
 if already_saved then return v;end if;
 if jsonb_typeof(p_state->'movement')='array' then
  for item in select value from jsonb_array_elements(p_state->'movement') loop
   if not item ? 'outcomes' then continue;end if;
   d:=(item->>'date')::date;
   delete from public.movement_day_outcomes o where o.user_id=uid and o.local_date=d and not (item->'outcomes') ? o.type_id;
   insert into public.movement_day_outcomes(user_id,local_date,type_id,outcome)
   select uid,d,key,value#>>'{}' from jsonb_each(item->'outcomes')
   on conflict(user_id,local_date,type_id) do update set outcome=excluded.outcome,updated_at=clock_timestamp() where public.movement_day_outcomes.outcome is distinct from excluded.outcome;
  end loop;
 end if;
 return v;
end $$;
revoke all on function public.save_wellness(bigint,uuid,jsonb) from public,anon;
grant execute on function public.save_wellness(bigint,uuid,jsonb) to authenticated;
