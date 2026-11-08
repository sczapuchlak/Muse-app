-- Google Calendar, phase 1 (#35): read-only connection. Additive.
-- google_connections and google_calendars are owner-readable. The owner can change only calendar visibility.
-- google_tokens has no browser grants at all: only the server, with its secret key, reads or writes it, and the
-- refresh token is stored encrypted (AES-256-GCM, key in server env) so even a database read can't use it.
-- google_events is a cache keyed by (connection, calendar, Google event id), so a sync can never duplicate an event.
create table public.google_connections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 google_sub text not null,
 email text not null default '',
 scopes text[] not null default '{}',
 status text not null default 'active' check (status in ('active', 'needs-reconnect', 'error')),
 last_synced_at timestamptz,
 last_error text check (last_error is null or char_length(last_error) <= 300),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, google_sub)
);
create table public.google_tokens (
 connection_id uuid primary key references public.google_connections on delete cascade,
 refresh_ciphertext text not null,
 access_ciphertext text,
 access_expires_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.google_calendars (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 connection_id uuid not null references public.google_connections on delete cascade,
 calendar_id text not null,
 name text not null default '',
 color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
 access_role text not null default 'reader',
 is_primary boolean not null default false,
 visible boolean not null default true,
 sync_token text,
 updated_at timestamptz not null default now(),
 unique (connection_id, calendar_id)
);
create table public.google_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 connection_id uuid not null references public.google_connections on delete cascade,
 calendar_id text not null,
 event_id text not null,
 etag text,
 title text not null default '',
 location text,
 start_date date not null,
 start_time time,
 end_date date,
 end_time time,
 all_day boolean not null default false,
 time_zone text,
 status text not null default 'confirmed',
 html_link text,
 updated_at timestamptz not null default now(),
 unique (connection_id, calendar_id, event_id)
);
create index google_events_window on public.google_events (user_id, start_date);

alter table public.google_connections enable row level security;
alter table public.google_tokens enable row level security;
alter table public.google_calendars enable row level security;
alter table public.google_events enable row level security;
revoke all on public.google_connections, public.google_tokens, public.google_calendars, public.google_events from public, anon, authenticated;
grant select, insert, update, delete on public.google_connections, public.google_tokens, public.google_calendars, public.google_events to service_role;
grant select on public.google_connections, public.google_events to authenticated;
grant select, update (visible) on public.google_calendars to authenticated;
create policy owner_read on public.google_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_read on public.google_calendars for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_toggle on public.google_calendars for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_read on public.google_events for select to authenticated using ((select auth.uid()) = user_id);
