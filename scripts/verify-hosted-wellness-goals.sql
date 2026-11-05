-- READ-ONLY check for 20261106000100_wellness_goals_connected_rituals.sql. Paste into the Supabase SQL Editor (staging
-- first) and Run BEFORE and AFTER applying the migration. It changes nothing and returns only schema facts and counts:
-- no names, notes, amounts or other personal content.
--   Before: every "prerequisite"/"safe to apply" row should be ok = true; "applied" rows are false.
--   After:  every row should be ok = true, and the record counts must equal the "before" counts.

with checks(item, ok, detail) as (
  -- Prerequisites the migration builds on.
  select 'prerequisite: wellness pass A', exists(select 1 from supabase_migrations.schema_migrations where version='20261101000900'), 'tables + original save_wellness'
  union all select 'prerequisite: wellness MVP completion', exists(select 1 from supabase_migrations.schema_migrations where version='20261101001000'), 'grocery wrapper + muse_private.save_wellness'
  union all select 'prerequisite: rituals MVP', exists(select 1 from supabase_migrations.schema_migrations where version='20261101001100'), 'save_rituals'
  union all select 'prerequisite: ritual lifecycle', exists(select 1 from supabase_migrations.schema_migrations where version='20261101001200'), 'read_rituals with inactive periods'
  union all select 'prerequisite: latest prior migration (paged reads)', exists(select 1 from supabase_migrations.schema_migrations where version='20261105000100'), 'history is current'
  union all select 'prerequisite: inner wellness save in muse_private', to_regprocedure('muse_private.save_wellness(bigint,uuid,jsonb)') is not null, 'called by the wrapper'
  union all select 'prerequisite: profile timezones set', not exists(select 1 from public.profiles where time_zone is null), 'saves require a timezone'
  -- Applied state (false before, true after).
  union all select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261106000100'), '20261106000100'
  union all select 'applied: goal tables', to_regclass('public.wellness_goals') is not null and to_regclass('public.wellness_goal_versions') is not null, 'wellness_goals, wellness_goal_versions'
  union all select 'applied: movement category + duration columns', exists(select 1 from information_schema.columns where table_schema='public' and table_name='movement_types' and column_name='category') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='movement_records' and column_name='duration_minutes'), 'nullable, no backfill'
  union all select 'applied: ritual connection column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='rituals' and column_name='connection'), 'nullable jsonb'
  union all select 'applied: wrapped saves', to_regprocedure('muse_private.save_wellness_groceries(bigint,uuid,jsonb)') is not null and to_regprocedure('muse_private.save_rituals(bigint,uuid,jsonb)') is not null, 'originals moved to muse_private'
  -- Security (meaningful after applying).
  union all select 'security: new tables have RLS', coalesce((select bool_and(relrowsecurity) from pg_class where oid in (to_regclass('public.wellness_goals'),to_regclass('public.wellness_goal_versions'))),false), 'owner-read policy only'
  union all select 'security: no direct writes for clients', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name in ('wellness_goals','wellness_goal_versions') and grantee in ('anon','authenticated') and privilege_type<>'SELECT'), 'writes only via save_wellness'
  union all select 'security: anon cannot read goal tables', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name in ('wellness_goals','wellness_goal_versions') and grantee='anon'), ''
  union all select 'security: authenticated can call public saves', has_function_privilege('authenticated','public.save_wellness(bigint,uuid,jsonb)','execute') and has_function_privilege('authenticated','public.save_rituals(bigint,uuid,jsonb)','execute'), ''
  union all select 'security: anon cannot call public saves', not has_function_privilege('anon','public.save_wellness(bigint,uuid,jsonb)','execute') and not has_function_privilege('anon','public.save_rituals(bigint,uuid,jsonb)','execute'), ''
  union all select 'security: clients cannot call muse_private originals', to_regprocedure('muse_private.save_wellness_groceries(bigint,uuid,jsonb)') is null or (not has_function_privilege('authenticated','muse_private.save_wellness_groceries(bigint,uuid,jsonb)','execute') and not has_function_privilege('authenticated','muse_private.save_rituals(bigint,uuid,jsonb)','execute')), ''
  -- Additive: nothing was backfilled or inferred.
  union all select 'additive: no ritual connected by the migration', not exists(select 1 from information_schema.columns where table_schema='public' and table_name='rituals' and column_name='connection') or (select count(*) from public.rituals where connection is not null)=0 or exists(select 1 from public.wellness_goals), 'connections only come from people'
)
select item, ok, detail from checks
union all
-- Record counts: copy these before applying and compare after. They must not change.
select 'count: rituals', true, (select count(*)::text from public.rituals)
union all select 'count: ritual entries', true, (select count(*)::text from public.ritual_entries)
union all select 'count: movement types', true, (select count(*)::text from public.movement_types)
union all select 'count: movement records', true, (select count(*)::text from public.movement_records)
union all select 'count: hydration days', true, (select count(*)::text from public.hydration_days)
union all select 'count: meal assignments', true, (select count(*)::text from public.meal_assignments)
union all select 'count: wellness revisions', true, (select coalesce(sum(revision),0)::text from public.wellness_versions)
union all select 'count: ritual revisions', true, (select coalesce(sum(revision),0)::text from public.ritual_versions_owner);
