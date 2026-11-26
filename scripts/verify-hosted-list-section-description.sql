-- READ-ONLY check for 20270114000100_list_section_description.sql (a short description on a list section).
-- Run on staging first, then production after its push:  supabase db query --linked -f scripts/verify-hosted-list-section-description.sql
-- Changes nothing; returns only schema facts, no personal content.
with col as (
  select c.data_type, c.is_nullable from information_schema.columns c
  where c.table_schema='public' and c.table_name='list_sections' and c.column_name='description'
), checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20270114000100'), '20270114000100'
  union all select 'description column is nullable text', coalesce((select data_type='text' and is_nullable='YES' from col),false), 'list_sections.description'
  union all select 'length check (≤ 200) in place', exists(select 1 from pg_constraint where conrelid='public.list_sections'::regclass and contype='c' and pg_get_constraintdef(oid) like '%description%200%'), 'check constraint'
  union all select 'still owner-only (RLS on)', (select relrowsecurity from pg_class where oid='public.list_sections'::regclass), 'row level security'
  union all select 'no anon access', not has_table_privilege('anon','public.list_sections','select'), 'anon cannot read'
)
select item, ok, detail from checks;
