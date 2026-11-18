-- READ-ONLY check for 20261228000100_journal.sql (Muse Journal V1). Paste into the Supabase SQL Editor (staging first)
-- and Run after applying. It changes nothing and returns only schema facts and row counts: no journal content.
-- Every row should be ok = true.
with tables(name) as (values ('journal_companions'),('journal_companion_versions'),('journal_journals'),('journal_preferences'),('journal_conversations'),('journal_messages'),('journal_message_corrections'),('journal_tags'),('journal_entry_tags'),('journal_analyses'),('journal_bookmarks'),('journal_memories'),('journal_reports'),('journal_links'),('journal_ai_entitlements'),('journal_ai_usage')),
checks(item, ok, detail) as (
  select 'migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261228000100'), '20261228000100'
  union all select 'table '||t.name, to_regclass('public.'||t.name) is not null, '' from tables t
  union all select 'RLS on '||t.name, coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t.name),false), '' from tables t
  union all select 'no anon access to '||t.name, not has_table_privilege('anon','public.'||t.name,'select'), '' from tables t where to_regclass('public.'||t.name) is not null
  union all select 'owner policies on '||t.name, (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.name and p.qual like '%auth.uid()%') >= 1, (select string_agg(policyname,', ') from pg_policies p where p.schemaname='public' and p.tablename=t.name) from tables t
  union all select 'browsers cannot write entitlements', not has_table_privilege('authenticated','public.journal_ai_entitlements','insert') and not has_table_privilege('authenticated','public.journal_ai_entitlements','update'), 'service role only'
  union all select 'browsers cannot write usage', not has_table_privilege('authenticated','public.journal_ai_usage','insert') and not has_table_privilege('authenticated','public.journal_ai_usage','delete'), 'service role only'
  union all select 'messages are never updated directly', not has_table_privilege('authenticated','public.journal_messages','update'), 'corrections go through correct_journal_message'
  union all select 'functions present', to_regprocedure('public.correct_journal_message(uuid,text)') is not null and to_regprocedure('public.merge_journal_tags(uuid,uuid)') is not null and to_regprocedure('public.delete_journal(uuid,uuid,boolean)') is not null and to_regprocedure('public.search_journal(text,integer)') is not null and to_regprocedure('public.journal_days(date)') is not null and to_regprocedure('public.keep_journal_test(uuid,uuid,uuid,text,jsonb,date,text)') is not null, ''
  union all select 'ritual connections accept journal-days', muse_private.valid_ritual_connection('{"metric":"journal-days","since":"2026-11-01"}'::jsonb,'checkbox'), ''
  union all select 'discoveries accept a journal source', pg_get_constraintdef((select oid from pg_constraint where conname='inner_discoveries_source_kind_check')) like '%journal%', ''
  union all select 'AI is off unless granted', (select count(*) from public.journal_ai_entitlements where enabled) <= 1, (select count(*)::text||' account(s) with AI on' from public.journal_ai_entitlements where enabled)
)
select item, ok, detail from checks order by ok, item;
