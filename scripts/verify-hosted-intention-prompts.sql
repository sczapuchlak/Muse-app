-- READ-ONLY check for 20261211000200_intention_prompts.sql (#130). Run on staging first, before and after the push:
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-intention-prompts.sql
-- It changes nothing and returns only schema facts: no personal content.
--   Before: "applied" rows are false.  After: every row is ok = true.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261211000200'), '20261211000200'
  union all select 'applied: table intention_prompts', to_regclass('public.intention_prompts') is not null, 'public.intention_prompts'
  union all select 'row level security enabled', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.intention_prompts')), false), 'relrowsecurity'
  union all select 'four owner policies', (select count(*) from pg_policies where schemaname='public' and tablename='intention_prompts' and policyname in ('owner_read','owner_insert','owner_update','owner_delete')) = 4, 'owner_read / insert / update / delete'
  union all select 'policies are for authenticated only', not exists(select 1 from pg_policies where schemaname='public' and tablename='intention_prompts' and not (roles @> array['authenticated']::name[])), 'authenticated'
  union all select 'no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='intention_prompts' and grantee in ('anon','PUBLIC')), 'anon / PUBLIC'
  union all select 'authenticated can read and write', (select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='intention_prompts' and grantee='authenticated' and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')) = 4, 'select, insert, update, delete'
  union all select 'one favorite per library prompt', exists(select 1 from pg_indexes where schemaname='public' and tablename='intention_prompts' and indexname='intention_prompts_one_favorite'), 'intention_prompts_one_favorite'
  union all select 'favorite/custom shape check', exists(select 1 from pg_constraint where conrelid=to_regclass('public.intention_prompts') and contype='c' and pg_get_constraintdef(oid) like '%favorite%' and pg_get_constraintdef(oid) like '%custom%'), 'kind check'
  union all select 'revision trigger', exists(select 1 from pg_trigger where tgrelid=to_regclass('public.intention_prompts') and tgname='touch_intention_prompts'), 'touch_intention_prompts'
)
select item, ok, detail from checks;
