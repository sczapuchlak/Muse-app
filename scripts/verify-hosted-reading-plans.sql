-- READ-ONLY check for 20261215000100_reading_plans.sql (Books Phase 2). Run on staging first, before and after the push:
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-reading-plans.sql
-- Changes nothing; returns only schema facts, no personal content.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261215000100'), '20261215000100'
  union all select 'applied: reading_plan_entries', to_regclass('public.reading_plan_entries') is not null, 'public.reading_plan_entries'
  union all select 'row level security on', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.reading_plan_entries')), false), 'relrowsecurity'
  union all select 'four owner policies', (select count(*) from pg_policies where schemaname='public' and tablename='reading_plan_entries' and policyname like 'owner_%')=4, 'owner_read/insert/update/delete'
  union all select 'policies are for authenticated only', not exists(select 1 from pg_policies where schemaname='public' and tablename='reading_plan_entries' and not ('authenticated'=any(roles))), 'roles'
  union all select 'no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='reading_plan_entries' and grantee='anon'), 'grants'
  union all select 'one book once per period', exists(select 1 from pg_constraint where conrelid=to_regclass('public.reading_plan_entries') and conname='reading_plan_one_book_per_period'), 'unique'
  union all select 'period shape checked', exists(select 1 from pg_constraint where conrelid=to_regclass('public.reading_plan_entries') and conname='reading_plan_period_shape'), 'check'
  union all select 'books are the owner of entries', exists(select 1 from pg_constraint where conrelid=to_regclass('public.reading_plan_entries') and conname='reading_plan_book_owner' and confdeltype='c'), 'fk on delete cascade'
  union all select 'functions exist and are SECURITY INVOKER', (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('add_reading_plan_books','reorder_reading_plan','move_reading_plan_book') and not prosecdef)=3, '3 functions'
  union all select 'functions not callable by anon', not exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name in ('add_reading_plan_books','reorder_reading_plan','move_reading_plan_book') and grantee in ('anon','PUBLIC')), 'execute grants'
)
select item, ok, detail from checks;
