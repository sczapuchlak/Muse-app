-- READ-ONLY check for 20261201000100_intentions.sql (#117). Run on staging first, before and after the push:
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-intentions.sql
-- It changes nothing and returns only schema facts: no personal content.
--   Before: "applied" rows are false.  After: every row is ok = true.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261201000100'), '20261201000100'
  union all select 'applied: table intention_pages', to_regclass('public.intention_pages') is not null, 'public.intention_pages'
  union all select 'row level security enabled', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.intention_pages')), false), 'relrowsecurity'
  union all select 'four owner policies', (select count(*) from pg_policies where schemaname='public' and tablename='intention_pages' and policyname in ('owner_read','owner_insert','owner_update','owner_delete'))=4, 'owner_read/insert/update/delete'
  union all select 'policies are for authenticated only', not exists(select 1 from pg_policies where schemaname='public' and tablename='intention_pages' and not (roles @> array['authenticated']::name[] and array_length(roles,1)=1)), 'no anon or public policies'
  union all select 'no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='intention_pages' and grantee in ('anon','PUBLIC')), 'anon/PUBLIC have no privileges'
  union all select 'authenticated can read and write', (select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='intention_pages' and grantee='authenticated' and privilege_type in ('SELECT','INSERT','UPDATE','DELETE'))=4, 'select/insert/update/delete'
  union all select 'one page per user, period and start', exists(select 1 from pg_constraint where conrelid=to_regclass('public.intention_pages') and contype='u' and pg_get_constraintdef(oid) like '%user_id, period, period_start%'), 'unique constraint'
  union all select 'period alignment check', exists(select 1 from pg_constraint where conrelid=to_regclass('public.intention_pages') and contype='c' and pg_get_constraintdef(oid) like '%isodow%'), 'Monday weeks, calendar months/quarters/years'
  union all select 'revision trigger', exists(select 1 from pg_trigger where tgrelid=to_regclass('public.intention_pages') and tgname='touch_intention_pages'), 'touch_intention_pages'
)
select item, ok, detail from checks;
