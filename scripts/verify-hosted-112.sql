-- READ-ONLY check for #112: 20261202000100_movement_outcomes.sql and 20261202000200_future_log_links.sql.
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-112.sql
-- It changes nothing and returns only schema facts: no personal content. After the push every row is ok = true.
with checks(item, ok, detail) as (
  select 'applied: movement outcomes migration', exists(select 1 from supabase_migrations.schema_migrations where version='20261202000100'), '20261202000100'
  union all select 'applied: future log links migration', exists(select 1 from supabase_migrations.schema_migrations where version='20261202000200'), '20261202000200'
  union all select 'table movement_day_outcomes', to_regclass('public.movement_day_outcomes') is not null, 'public.movement_day_outcomes'
  union all select 'outcomes: row level security', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.movement_day_outcomes')), false), 'relrowsecurity'
  union all select 'outcomes: owner read policy only', (select count(*) from pg_policies where schemaname='public' and tablename='movement_day_outcomes')=1 and exists(select 1 from pg_policies where schemaname='public' and tablename='movement_day_outcomes' and policyname='owner_read' and roles=array['authenticated']::name[]), 'writes only through save_wellness'
  union all select 'outcomes: no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='movement_day_outcomes' and grantee in ('anon','PUBLIC')), 'anon/PUBLIC have none'
  union all select 'outcomes: authenticated select only', (select array_agg(privilege_type::text order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='movement_day_outcomes' and grantee='authenticated')=array['SELECT'], 'SELECT'
  union all select 'outcomes: values check', exists(select 1 from pg_constraint where conrelid=to_regclass('public.movement_day_outcomes') and contype='c' and pg_get_constraintdef(oid) like '%skipped%rest%sick%'), 'skipped/rest/sick'
  union all select 'save_wellness wraps the previous save', to_regprocedure('muse_private.save_wellness_goals(bigint,uuid,jsonb)') is not null and to_regprocedure('public.save_wellness(bigint,uuid,jsonb)') is not null, 'muse_private.save_wellness_goals'
  union all select 'inner save not callable by clients', not has_function_privilege('authenticated','muse_private.save_wellness_goals(bigint,uuid,jsonb)','execute'), 'revoked'
  union all select 'read_wellness reports outcomes', pg_get_functiondef('public.read_wellness'::regproc) like '%movementOutcomes%', 'movementOutcomes flag'
  union all select 'future log: source columns', (select count(*) from information_schema.columns where table_schema='public' and table_name='future_log_entries' and column_name in ('source_kind','source_id'))=2, 'source_kind, source_id'
  union all select 'future log: one reference per record', exists(select 1 from pg_indexes where schemaname='public' and indexname='future_log_entries_one_reference'), 'partial unique index'
  union all select 'future log: references have no done state', exists(select 1 from pg_constraint where conrelid=to_regclass('public.future_log_entries') and conname='future_log_entries_reference_not_done'), 'check'
)
select item, ok, detail from checks order by ok, item;
