-- ROLLBACK for 20261106000100_wellness_goals_connected_rituals.sql — NOT a migration; never place in supabase/migrations.
-- Use only if staging validation fails, after taking a backup. It restores the previous functions exactly and DROPS
-- the new columns/tables, which permanently deletes any goals, goal versions, workout categories/durations and ritual
-- connections created after the migration. Existing Wellness, Rituals, hydration, meals and entries are not touched.
-- Ritual entries stored by disconnecting a connected Ritual are ordinary entries and remain.
-- After running, also remove the migration row so the CLI history matches:
--   delete from supabase_migrations.schema_migrations where version='20261106000100';
begin;

-- 1. Saves: drop the wrappers and put the original functions back under their public names and grants.
drop function public.save_rituals(bigint,uuid,jsonb);
alter function muse_private.save_rituals(bigint,uuid,jsonb) set schema public;
revoke all on function public.save_rituals(bigint,uuid,jsonb) from public,anon;
grant execute on function public.save_rituals(bigint,uuid,jsonb) to authenticated;

drop function public.save_wellness(bigint,uuid,jsonb);
alter function muse_private.save_wellness_groceries(bigint,uuid,jsonb) rename to save_wellness_public_restore;
alter function muse_private.save_wellness_public_restore(bigint,uuid,jsonb) set schema public;
alter function public.save_wellness_public_restore(bigint,uuid,jsonb) rename to save_wellness;
revoke all on function public.save_wellness(bigint,uuid,jsonb) from public,anon;
grant execute on function public.save_wellness(bigint,uuid,jsonb) to authenticated;

-- 2. Reads: the exact previous definitions (from 20261101001000 and 20261101001200).
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

create or replace function public.read_rituals() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.ritual_versions_owner where user_id=auth.uid()),0),'state',jsonb_build_object(
 'groups',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'accent',accent,'icon',icon_id,'gradient',gradient,'collapsed',collapsed)) order by position,id) from public.ritual_groups where user_id=auth.uid()),'[]'),
 'rituals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'groupId',group_id,'type',tracking_type,'goal',goal,'unit',unit,'recurrence',case recurrence when 'daily' then jsonb_build_object('kind','daily') when 'weekly' then jsonb_build_object('kind','weekly','weekday',weekdays[1]) else jsonb_build_object('kind','weekdays','weekdays',weekdays) end,'startDate',start_date,'createdAt',created_at,'status',lifecycle_status,'inactivePeriods',coalesce((select jsonb_agg(jsonb_build_object('start',p.starts_on,'end',p.ends_before,'kind',p.kind) order by p.starts_on) from public.ritual_inactive_periods p where p.user_id=rituals.user_id and p.ritual_id=rituals.id),'[]'::jsonb)) order by position,id) from public.rituals where user_id=auth.uid()),'[]'),
 'entries',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',ritual_id::text||'/'||local_date::text,'ritualId',ritual_id,'date',local_date,'value',value,'outcome',case when outcome='missed' then 'missed' end,'updatedAt',updated_at))) from public.ritual_entries where user_id=auth.uid()),'[]'),
 'celebratedMilestones','[]'::jsonb));
end $$;

-- 3. Schema additions.
alter table public.rituals drop column connection;
drop function muse_private.valid_ritual_connection(jsonb,text);
drop table public.wellness_goal_versions;
drop table public.wellness_goals;
alter table public.movement_records drop column duration_minutes;
alter table public.movement_types drop column category;

commit;
