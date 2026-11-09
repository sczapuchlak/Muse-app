-- READ-ONLY check for 20261202000300_google_calendar_write.sql (#112, Google Calendar phase 3).
--   supabase db query --linked --project-ref <ref> -f scripts/verify-hosted-google-write.sql
-- Returns schema facts only (no personal content, no secrets). After the push every row is ok = true, except
-- "background sync configured", which turns true once the two Vault secrets from GOOGLE_CALENDAR_PLAN step 4 exist.
with checks(item, ok, detail) as (
  select 'applied: migration recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20261202000300'), '20261202000300'
  union all select 'links table', to_regclass('public.google_event_links') is not null, 'public.google_event_links'
  union all select 'links: row level security', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.google_event_links')), false), 'relrowsecurity'
  union all select 'links: owner read only', (select count(*) from pg_policies where schemaname='public' and tablename='google_event_links')=1, 'owner_read'
  union all select 'links: browser can only read', (select array_agg(privilege_type::text order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='google_event_links' and grantee='authenticated')=array['SELECT'], 'SELECT'
  union all select 'links: no anon access', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='google_event_links' and grantee in ('anon','PUBLIC')), 'none'
  union all select 'links: one copy per Muse event', exists(select 1 from pg_constraint where conrelid=to_regclass('public.google_event_links') and contype='u' and pg_get_constraintdef(oid) like '%muse_event_id%'), 'unique'
  union all select 'tokens still have no browser grants', not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='google_tokens' and grantee in ('anon','authenticated','PUBLIC')), 'google_tokens'
  union all select 'event cache: description + series columns', (select count(*) from information_schema.columns where table_schema='public' and table_name='google_events' and column_name in ('description','recurring_event_id'))=2, 'google_events'
  union all select 'connections: background stamp', exists(select 1 from information_schema.columns where table_schema='public' and table_name='google_connections' and column_name='last_background_sync_at'), 'last_background_sync_at'
  union all select 'pg_cron and pg_net enabled', (select count(*) from pg_extension where extname in ('pg_cron','pg_net'))=2, 'extensions'
  union all select 'sync job scheduled every 30 minutes', exists(select 1 from cron.job where jobname='muse-google-sync' and schedule='*/30 * * * *'), 'muse-google-sync'
  union all select 'sync function not callable by clients', not has_function_privilege('authenticated','muse_private.request_google_sync()','execute'), 'revoked'
  union all select 'background sync configured (Vault)', (select count(*) from vault.secrets where name in ('google_sync_url','google_sync_secret'))=2, 'set in GOOGLE_CALENDAR_PLAN step 4'
)
select item, ok, detail from checks order by ok, item;
