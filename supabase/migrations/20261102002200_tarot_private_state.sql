-- Tarot daily draw is distinct from saved readings. An insert-only unique date protects the first draw.
create table public.whimsy_tarot_daily_draws (
 user_id uuid not null references auth.users(id) on delete cascade,
 activity_date date not null,
 time_zone text not null check(length(time_zone) between 1 and 80),
 deck_id text not null,
 card_id text not null,
 card_version integer not null,
 orientation text not null check(orientation in ('upright','reversed')),
 drawn_at timestamptz not null default clock_timestamp(),
 primary key(user_id,activity_date),
 foreign key(card_id,card_version) references public.whimsy_content_versions(content_id,version)
);
create table public.whimsy_tarot_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 include_reversed boolean not null default false,
 updated_at timestamptz not null default clock_timestamp()
);
create table public.whimsy_tarot_followups (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 reading_id uuid not null,
 text text not null check(length(trim(text)) between 1 and 10000),
 created_at timestamptz not null default clock_timestamp(),
 foreign key(user_id,reading_id) references public.whimsy_tarot_readings(user_id,id) on delete cascade
);
create index whimsy_tarot_followups_reading on public.whimsy_tarot_followups(user_id,reading_id,created_at);
do $$declare t text;begin foreach t in array array['whimsy_tarot_daily_draws','whimsy_tarot_preferences','whimsy_tarot_followups'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 end loop;end $$;
grant update on public.whimsy_tarot_preferences to authenticated;
create policy owner_update on public.whimsy_tarot_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select on public.whimsy_tarot_daily_draws,public.whimsy_tarot_preferences,public.whimsy_tarot_followups to service_role;
