-- READ-ONLY check for 20261213000100_manual_steps.sql (#130). Run on staging first, before and after the push:
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-manual-steps.sql
-- It changes nothing and returns only schema facts: no personal content.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261213000100'), '20261213000100'
  union all select 'applied: step_days', to_regclass('public.step_days') is not null, 'public.step_days'
  union all select 'applied: step_settings', to_regclass('public.step_settings') is not null, 'public.step_settings'
  union all select 'row level security on both', coalesce((select bool_and(relrowsecurity) from pg_class where oid in (to_regclass('public.step_days'), to_regclass('public.step_settings'))), false), 'relrowsecurity'
  union all select 'four owner policies each', (select count(*) from pg_policies where schemaname='public' and tablename in ('step_days','step_settings') and policyname in ('owner_read','owner_insert','owner_update','owner_delete')) = 8, '2 tables x 4'
  union all select 'policies are for authenticated only', not exists(select 1 from pg_policies where schemaname='public' and tablename in ('step_days','step_settings') and not (roles @> array['authenticated']::name[])), 'authenticated'
  union all select 'no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name in ('step_days','step_settings') and grantee in ('anon','PUBLIC')), 'anon / PUBLIC'
  union all select 'one row per user and date', exists(select 1 from pg_constraint where conrelid=to_regclass('public.step_days') and contype='p' and pg_get_constraintdef(oid) like '%user_id, local_date%'), 'primary key'
  union all select 'step count bounded', exists(select 1 from pg_constraint where conrelid=to_regclass('public.step_days') and contype='c' and pg_get_constraintdef(oid) like '%200000%'), '0..200000'
  union all select 'revision trigger', exists(select 1 from pg_trigger where tgrelid=to_regclass('public.step_days') and tgname='touch_step_days'), 'touch_step_days'
)
select item, ok, detail from checks;
