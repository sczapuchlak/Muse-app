-- READ-ONLY check for 20261222000100_inner_compass.sql (#210). Paste into the Supabase SQL Editor (staging first) and
-- Run AFTER applying the migration. It changes nothing and returns only schema facts and counts: no titles, answers,
-- reflections or other personal content. Every row should be ok = true.
with t(name) as (values ('inner_discoveries'),('inner_discovery_versions'),('inner_discovery_links'),('inner_discovery_areas'),
  ('inner_exploration_responses'),('inner_reflections'),('inner_manifestos'),('inner_manifesto_versions'))
select 'migration recorded' as item, exists(select 1 from supabase_migrations.schema_migrations where version='20261222000100') as ok, '20261222000100' as detail
union all select 'table '||name, to_regclass('public.'||name) is not null, '' from t
union all select 'RLS on '||name, coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.'||name)),false), '' from t
union all select '4 owner policies on '||name, (select count(*) from pg_policies where schemaname='public' and tablename=name and policyname in ('owner_read','owner_insert','owner_update','owner_delete'))=4,
  (select string_agg(policyname,', ' order by policyname) from pg_policies where schemaname='public' and tablename=name) from t
union all select 'no anon access to '||name, not has_table_privilege('anon','public.'||name,'select'), '' from t
union all select 'record_inner_evolution: authenticated only', has_function_privilege('authenticated','public.record_inner_evolution(uuid,bigint,text,text,jsonb,text,text,date)','execute')
  and not has_function_privilege('anon','public.record_inner_evolution(uuid,bigint,text,text,jsonb,text,text,date)','execute'), 'security invoker'
union all select 'record_inner_evolution is security invoker', not (select prosecdef from pg_proc where oid=to_regprocedure('public.record_inner_evolution(uuid,bigint,text,text,jsonb,text,text,date)')), ''
union all select 'revision triggers', (select count(*) from pg_trigger where tgname in ('touch_inner_discovery','touch_inner_exploration_response','touch_inner_reflection','touch_inner_manifesto'))=4, ''
union all select 'record count (discoveries)', true, (select count(*)::text from public.inner_discoveries);
