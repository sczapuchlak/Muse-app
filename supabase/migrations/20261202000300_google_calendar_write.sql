-- Google Calendar phase 3 (#112): two-way editing and background sync. Additive.
--
-- 1. The event cache keeps a Google event's description and, for one occurrence of a repeating event, its series id.
alter table public.google_events
 add column description text check (description is null or char_length(description) <= 8000),
 add column recurring_event_id text check (recurring_event_id is null or char_length(recurring_event_id) <= 1024);

-- 2. "Also add to Google": a Muse event's copy in a Google calendar. The Muse event stays the authoritative record;
--    this row only remembers where its copy lives (the Google id is derived from the Muse id, so retries can't
--    duplicate it), the etag last written, and the copy's state. Deleting the Muse event removes the link only;
--    deleting the Google copy is a separate, confirmed action. Like the other Google tables, only the server writes;
--    the owner can read.
create table public.google_event_links (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 muse_event_id uuid not null unique references public.planner_events on delete cascade,
 connection_id uuid not null references public.google_connections on delete cascade,
 calendar_id text not null check (char_length(calendar_id) between 1 and 1024),
 google_event_id text not null check (google_event_id ~ '^[a-v0-9]{5,1024}$'),
 etag text,
 state text not null default 'pending' check (state in ('pending', 'synced', 'error', 'conflict', 'missing')),
 last_error text check (last_error is null or char_length(last_error) <= 300),
 pushed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (connection_id, calendar_id, google_event_id)
);
create index google_event_links_owner on public.google_event_links (user_id);
alter table public.google_event_links enable row level security;
revoke all on public.google_event_links from public, anon, authenticated;
grant select, insert, update, delete on public.google_event_links to service_role;
grant select on public.google_event_links to authenticated;
create policy owner_read on public.google_event_links for select to authenticated using ((select auth.uid()) = user_id);

-- 3. Background sync. Each background run stamps the connection, so Settings can say whether it's actually running.
alter table public.google_connections add column last_background_sync_at timestamptz;
-- pg_cron runs every 30 minutes and, through pg_net, asks Muse's /api/google/cron route to sync.
--    The URL and the shared secret live in Supabase Vault (`google_sync_url`, `google_sync_secret`), set once per
--    environment. Until both exist the job does nothing, so this migration is safe everywhere.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function muse_private.request_google_sync() returns void language plpgsql security definer set search_path = '' as $$
declare target text; secret text;
begin
 select decrypted_secret into target from vault.decrypted_secrets where name = 'google_sync_url' limit 1;
 select decrypted_secret into secret from vault.decrypted_secrets where name = 'google_sync_secret' limit 1;
 if target is null or secret is null or target !~ '^https?://' then return; end if;
 perform net.http_post(url := target, body := '{}'::jsonb,
  headers := jsonb_build_object('authorization', 'Bearer ' || secret, 'content-type', 'application/json'), timeout_milliseconds := 55000);
end $$;
revoke all on function muse_private.request_google_sync() from public, anon, authenticated;
select cron.schedule('muse-google-sync', '*/30 * * * *', 'select muse_private.request_google_sync()');
