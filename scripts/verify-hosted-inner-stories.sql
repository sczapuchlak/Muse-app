-- READ-ONLY check for 20261223000100_inner_chapters_experiences.sql (#211). Run AFTER applying it (staging first).
-- Returns only schema facts and a count; no titles, words or photos. Every row should be ok = true.
with t(name) as (values ('inner_chapters'),('inner_experiences'),('inner_experience_collections'),('inner_collection_experiences'),
  ('inner_chapter_experiences'),('inner_modules'),('inner_area_links'))
select 'migration recorded' as item, exists(select 1 from supabase_migrations.schema_migrations where version='20261223000100') as ok, '20261223000100' as detail
union all select 'table '||name, to_regclass('public.'||name) is not null, '' from t
union all select 'RLS on '||name, coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.'||name)),false), '' from t
union all select '4 owner policies on '||name, (select count(*) from pg_policies where schemaname='public' and tablename=name and policyname in ('owner_read','owner_insert','owner_update','owner_delete'))=4, '' from t
union all select 'no anon access to '||name, not has_table_privilege('anon','public.'||name,'select'), '' from t
union all select 'one primary chapter index', to_regclass('public.inner_chapters_one_primary') is not null, ''
union all select 'reflections can reference chapters and experiences', (select count(*) from information_schema.columns where table_schema='public' and table_name='inner_reflections' and column_name in ('chapter_id','chapter_title','experience_id','experience_title','images'))=5, ''
union all select 'discovery origin allows experience', exists(select 1 from pg_constraint where conname='inner_discoveries_source_kind_check' and pg_get_constraintdef(oid) like '%experience%'), ''
union all select 'revision triggers', (select count(*) from pg_trigger where tgname in ('touch_inner_chapter','touch_inner_experience','touch_inner_experience_collection','touch_inner_module'))=4, ''
union all select 'record count (chapters)', true, (select count(*)::text from public.inner_chapters);
