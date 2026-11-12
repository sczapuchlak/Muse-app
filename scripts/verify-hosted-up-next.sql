-- READ-ONLY check for 20261216000100_up_next.sql (Books Phase 3). Run on staging first, before and after the push:
--   supabase db query --linked -f scripts/verify-hosted-up-next.sql
-- Changes nothing; returns only schema facts, no personal content.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261216000100'), '20261216000100'
  union all select 'applied: up_next_slots', to_regclass('public.up_next_slots') is not null, 'public.up_next_slots'
  union all select 'row level security on', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.up_next_slots')), false), 'relrowsecurity'
  union all select 'four owner policies', (select count(*) from pg_policies where schemaname='public' and tablename='up_next_slots' and policyname like 'owner_%')=4, 'owner_*'
  union all select 'policies are for authenticated only', not exists(select 1 from pg_policies where schemaname='public' and tablename='up_next_slots' and not ('authenticated'=any(roles))), 'roles'
  union all select 'no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='up_next_slots' and grantee='anon'), 'grants'
  union all select 'three slots only', exists(select 1 from pg_constraint where conrelid=to_regclass('public.up_next_slots') and contype='c' and pg_get_constraintdef(oid) like '%slot%'), 'check slot 0..2'
  union all select 'one book in one slot', exists(select 1 from pg_constraint where conrelid=to_regclass('public.up_next_slots') and conname='up_next_one_slot_per_book'), 'unique'
  union all select 'books own their slots', exists(select 1 from pg_constraint where conrelid=to_regclass('public.up_next_slots') and conname='up_next_book_owner' and confdeltype='c'), 'fk on delete cascade'
  union all select 'save function is SECURITY INVOKER', exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='save_up_next' and not prosecdef), 'save_up_next'
  union all select 'save function not callable by anon', not exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name='save_up_next' and grantee in ('anon','PUBLIC')), 'execute grants'
)
select item, ok, detail from checks;
