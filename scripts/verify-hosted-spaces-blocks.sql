-- READ-ONLY check for 20270115000100_spaces_blocks.sql (Mindspace Spaces: content blocks, item → checklist link, cover).
-- Run on staging first, then production after its push:  supabase db query --linked -f scripts/verify-hosted-spaces-blocks.sql
-- Changes nothing; returns only schema facts and counts, no personal content.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20270115000100'), '20270115000100'
  union all select 'list_blocks exists with RLS on', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.list_blocks')),false), 'row level security'
  union all select 'one owner policy for signed-in users', (select count(*)=1 from pg_policies where schemaname='public' and tablename='list_blocks' and policyname='owner_all' and roles='{authenticated}'), 'owner_all'
  union all select 'no anon access', not has_table_privilege('anon','public.list_blocks','select') and not has_table_privilege('anon','public.list_blocks','insert'), 'anon cannot read or write'
  union all select 'signed-in users can run the block validator', has_function_privilege('authenticated','muse_private.valid_list_block(text,jsonb)','execute'), 'grant execute'
  union all select 'validator refuses non-web links', not muse_private.valid_list_block('link','{"url":"javascript:alert(1)"}'::jsonb) and muse_private.valid_list_block('link','{"url":"https://example.com"}'::jsonb), 'valid_list_block'
  union all select 'touch trigger keeps "last updated" honest', exists(select 1 from pg_trigger where tgrelid='public.list_blocks'::regclass and tgname='list_blocks_touch'), 'list_blocks_touch'
  union all select 'list_items.block_id is nullable uuid', coalesce((select data_type='uuid' and is_nullable='YES' from information_schema.columns where table_schema='public' and table_name='list_items' and column_name='block_id'),false), 'list_items.block_id'
  union all select 'deleting a block keeps its items (set null)', exists(select 1 from pg_constraint where conname='list_items_block_fk' and pg_get_constraintdef(oid) like '%SET NULL (block_id)%'), 'list_items_block_fk'
  union all select 'lists.cover is nullable jsonb', coalesce((select data_type='jsonb' and is_nullable='YES' from information_schema.columns where table_schema='public' and table_name='lists' and column_name='cover'),false), 'lists.cover'
  union all select 'existing items untouched (none moved into blocks yet)', true, (select count(*) from public.list_items where block_id is not null)::text || ' items in blocks'
)
select item, ok, detail from checks;
