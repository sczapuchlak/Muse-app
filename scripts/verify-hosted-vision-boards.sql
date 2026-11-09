-- READ-ONLY check for 20261203000100_vision_boards.sql (#118). Run on staging first, before and after the push:
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-vision-boards.sql
-- It changes nothing and returns only schema facts: no personal content.
--   Before: "applied" rows are false.  After: every row is ok = true.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261203000100'), '20261203000100'
  union all select 'applied: table vision_boards', to_regclass('public.vision_boards') is not null, 'public.vision_boards'
  union all select 'row level security enabled', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.vision_boards')), false), 'relrowsecurity'
  union all select 'four owner policies', (select count(*) from pg_policies where schemaname='public' and tablename='vision_boards' and policyname in ('owner_read','owner_insert','owner_update','owner_delete'))=4, 'owner_read/insert/update/delete'
  union all select 'policies are for authenticated only', not exists(select 1 from pg_policies where schemaname='public' and tablename='vision_boards' and not (roles @> array['authenticated']::name[] and array_length(roles,1)=1)), 'no anon or public policies'
  union all select 'no anon grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='vision_boards' and grantee in ('anon','PUBLIC')), 'anon/PUBLIC have no privileges'
  union all select 'authenticated can read and write', (select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='vision_boards' and grantee='authenticated' and privilege_type in ('SELECT','INSERT','UPDATE','DELETE'))=4, 'select/insert/update/delete'
  union all select 'revision trigger', exists(select 1 from pg_trigger where tgrelid=to_regclass('public.vision_boards') and tgname='touch_vision_boards'), 'touch_vision_boards'
  union all select 'asset path trigger', exists(select 1 from pg_trigger where tgrelid=to_regclass('public.vision_boards') and tgname='vision_board_assets'), 'vision_board_assets'
  union all select 'private bucket accepts PNG', coalesce((select allowed_mime_types @> array['image/png'] and not public from storage.buckets where id='constellation-images'), false), 'constellation-images: webp, jpeg, png; private'
  union all select 'upload policy allows .png', coalesce((select with_check like '%png%' from pg_policies where schemaname='storage' and tablename='objects' and policyname='constellation_upload'), false), 'constellation_upload'
  union all select 'remove policy guards board files', coalesce((select qual like '%vision_boards%' and qual like '%constellation_cards%' from pg_policies where schemaname='storage' and tablename='objects' and policyname='constellation_image_remove'), false), 'constellation_image_remove'
)
select item, ok, detail from checks;
