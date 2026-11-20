-- READ-ONLY check for 20270113000100_book_reading_history.sql (Finish Book: historical reading, bulk sessions).
-- Run on staging first, before and after the push:
--   supabase db query --linked -f scripts/verify-hosted-book-reading.sql
-- Changes nothing; returns only schema facts, no personal content.
with fn as (
  select p.oid, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) as body
  from pg_proc p where p.pronamespace='public'::regnamespace and p.proname='save_book_reading'
), checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20270113000100'), '20270113000100'
  union all select 'applied: one save_book_reading', (select count(*) from fn)=1, 'save_book_reading(uuid,jsonb,bigint,uuid,jsonb,jsonb)'
  union all select 'signature as in the file', to_regprocedure('public.save_book_reading(uuid,jsonb,bigint,uuid,jsonb,jsonb)') is not null, 'argument types'
  union all select 'SECURITY DEFINER with a fixed search_path', coalesce((select prosecdef and 'search_path=""'=any(proconfig) from fn), false), 'prosecdef, search_path'
  union all select 'requires a signed-in caller', coalesce((select body like '%auth.uid()%' and body like '%Sign in required%' from fn), false), 'auth.uid()'
  union all select 'reuses the existing book/session validator', coalesce((select body like '%public.save_whimsy_record(%' from fn), false), 'save_whimsy_record'
  union all select 'reuses the existing timer writer', coalesce((select body like '%public.save_reading_timer(%' from fn), false), 'save_reading_timer'
  union all select 'only this book''s sessions and timer', coalesce((select body like '%Every session must belong to this book%' and body like '%belongs to another book%' from fn), false), 'ownership guards'
  union all select 'not callable by anon or PUBLIC', not exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name='save_book_reading' and grantee in ('anon','PUBLIC')), 'execute grants'
  union all select 'callable by authenticated', exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name='save_book_reading' and grantee='authenticated'), 'execute grants'
  union all select 'existing writers unchanged: books allow dnf', coalesce((select pg_get_functiondef('public.save_whimsy_record(text,bigint,uuid,jsonb,boolean)'::regprocedure) like '%''dnf''%'), false), 'save_whimsy_record status list'
)
select item, ok, detail from checks;
