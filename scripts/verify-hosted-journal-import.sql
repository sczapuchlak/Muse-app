-- READ-ONLY check for 20270109000100_journal_history_import.sql (Journal history import + entity-aware recall).
-- Run on Staging first (`supabase db query --linked -f`), then Production after approval. It changes nothing and returns
-- only schema facts and counts: no journal content. Every row should be ok = true.
with tables(name) as (values ('journal_import_batches'),('journal_import_sources')),
checks(item, ok, detail) as (
  select 'migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20270109000100'), '20270109000100'
  union all select 'table '||t.name, to_regclass('public.'||t.name) is not null, '' from tables t
  union all select 'RLS on '||t.name, coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t.name),false), '' from tables t
  union all select 'no anon access to '||t.name, not has_table_privilege('anon','public.'||t.name,'select'), '' from tables t where to_regclass('public.'||t.name) is not null
  union all select 'owner policies on '||t.name, (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.name and coalesce(p.qual,p.with_check) like '%auth.uid()%') >= 3, (select string_agg(policyname,', ') from pg_policies p where p.schemaname='public' and p.tablename=t.name) from tables t
  union all select 'import provenance is never edited in place', not has_table_privilege('authenticated','public.journal_import_sources','update'), 'read, add, delete only'
  union all select 'functions present', to_regprocedure('public.import_journal_entry(uuid,text,text,text,uuid,jsonb,jsonb)') is not null and to_regprocedure('public.undo_journal_import(uuid)') is not null and to_regprocedure('public.journal_tag_history(uuid[],uuid[],date,integer)') is not null and to_regprocedure('public.journal_enrichment_candidates()') is not null, ''
  union all select 'functions run as the caller (RLS applies)', not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('import_journal_entry','undo_journal_import','journal_tag_history','journal_enrichment_candidates') and p.prosecdef), 'security invoker'
  union all select 'anon cannot call the import', not has_function_privilege('anon','public.import_journal_entry(uuid,text,text,text,uuid,jsonb,jsonb)','execute'), ''
  union all select 'entries may come from an import', pg_get_constraintdef((select oid from pg_constraint where conname='journal_conversations_origin_check')) like '%import%', ''
  union all select 'imported titles and summaries keep their source', pg_get_constraintdef((select oid from pg_constraint where conname='journal_conversations_summary_source_check')) like '%import%' and pg_get_constraintdef((select oid from pg_constraint where conname='journal_conversations_title_source_check')) like '%import%', ''
  union all select 'existing entries untouched', (select count(*) from public.journal_conversations where origin='import') = (select count(*) from public.journal_import_sources where conversation_id is not null), (select count(*)::text||' imported entries' from public.journal_conversations where origin='import')
)
select item, ok, detail from checks order by ok, item;
