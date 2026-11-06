-- The Muse Almanac (#53): what Muse has shown each person, so cooldowns, rotation and dismissals agree across devices.
-- Additive. Ids and dates only: never rendered text, never facts from the person's records. Owner-only.
create table public.almanac_impressions (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 entry_id text not null check (entry_id ~ '^ALM-[A-Z]+-[0-9]{3}$'),
 version integer not null check (version between 1 and 10000),
 variant_id text not null check (variant_id ~ '^[a-z]{1,8}$'),
 signal_key text not null check (signal_key ~ '^[a-z]+\.[a-z0-9.-]{1,80}$'),
 surface text not null check (surface ~ '^[a-z-]{2,32}$'),
 shown_on date not null,
 dismissed_at timestamptz,
 created_at timestamptz not null default now(),
 primary key (user_id, entry_id, surface, shown_on)
);
create index almanac_impressions_recent on public.almanac_impressions (user_id, shown_on desc);

alter table public.almanac_impressions enable row level security;
revoke all on public.almanac_impressions from public, anon, authenticated;
grant select, insert, update, delete on public.almanac_impressions to authenticated;
grant select, insert, update, delete on public.almanac_impressions to service_role;
create policy owner_read on public.almanac_impressions for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.almanac_impressions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.almanac_impressions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.almanac_impressions for delete to authenticated using ((select auth.uid()) = user_id);
