-- READ-ONLY check for 20270117000100_space_card_templates.sql (My card templates).
-- Run: supabase db query --linked -f scripts/verify-hosted-space-card-templates.sql   (production: add --project-ref)
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20270117000100'), '20270117000100'
  union all select 'list_card_templates exists with RLS on', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.list_card_templates')),false), 'row level security'
  union all select 'one owner policy for signed-in users', (select count(*)=1 from pg_policies where schemaname='public' and tablename='list_card_templates' and policyname='owner_all' and roles='{authenticated}'), 'owner_all'
  union all select 'no anon access', not has_table_privilege('anon','public.list_card_templates','select'), 'anon cannot read'
  union all select 'section tiles column still in place', exists(select 1 from information_schema.columns where table_schema='public' and table_name='lists' and column_name='section_tiles'), 'lists.section_tiles'
)
select item, ok, detail from checks;
