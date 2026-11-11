-- READ-ONLY check for 20261212000100_custom_feelings.sql (#130). Run on staging first, before and after the push:
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-custom-feelings.sql
-- It changes nothing and returns only schema facts: no personal content.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261212000100'), '20261212000100'
  union all select 'applied: table custom_feelings', to_regclass('public.custom_feelings') is not null, 'public.custom_feelings'
  union all select 'row level security enabled', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.custom_feelings')), false), 'relrowsecurity'
  union all select 'four owner policies', (select count(*) from pg_policies where schemaname='public' and tablename='custom_feelings' and policyname in ('owner_read','owner_insert','owner_update','owner_delete')) = 4, 'owner_read / insert / update / delete'
  union all select 'policies are for authenticated only', not exists(select 1 from pg_policies where schemaname='public' and tablename='custom_feelings' and not (roles @> array['authenticated']::name[])), 'authenticated'
  union all select 'no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='custom_feelings' and grantee in ('anon','PUBLIC')), 'anon / PUBLIC'
  union all select 'case-insensitive unique name', exists(select 1 from pg_indexes where schemaname='public' and tablename='custom_feelings' and indexname='custom_feelings_one_name'), 'custom_feelings_one_name'
  union all select 'check-ins hold a feelings snapshot', exists(select 1 from information_schema.columns where table_schema='public' and table_name='mood_checkins' and column_name='feelings'), 'mood_checkins.feelings'
  union all select 'no foreign key from history to custom feelings', not exists(select 1 from pg_constraint where confrelid=to_regclass('public.custom_feelings') and contype='f'), 'history never depends on the library'
  union all select 'save command takes the snapshot', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_mood_checkin' and pg_get_function_identity_arguments(p.oid) like '%p_feelings jsonb%'), 'save_mood_checkin(..., p_feelings)'
  union all select 'old save signature removed', not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_mood_checkin' and pg_get_function_identity_arguments(p.oid) not like '%p_feelings%'), 'single save command'
  union all select 'expanded vocabulary present', (select count(*) from public.emotion_catalog where id in ('emotion-lazy','emotion-numb','emotion-nostalgic','emotion-bittersweet','emotion-competitive','emotion-intense')) = 6, '6 words'
)
select item, ok, detail from checks;
