-- Explicit conclusion knowledge and optional season summaries. Existing records are untouched.
alter table public.collection_series add column conclusion_state text not null default 'unknown'
 check (conclusion_state in ('unknown','ongoing','concluded'));
alter table public.collection_media_items add column conclusion_state text not null default 'unknown'
 check (conclusion_state in ('unknown','ongoing','concluded'));
-- An existing manually Completed show is explicit evidence that the user considered it concluded.
update public.collection_media_items set conclusion_state='concluded'
 where kind='tv' and status='completed';

create table public.collection_tv_seasons (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 show_id uuid not null,
 season_number integer not null check (season_number between 0 and 999),
 release_state text not null default 'released' check (release_state in ('released','announced','unknown')),
 total_episodes integer check (total_episodes between 0 and 9999), -- manually known released count, not future season total
 watched_episodes integer not null default 0 check (watched_episodes between 0 and 9999),
 watched boolean not null default false,
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 unique(user_id,show_id,season_number),
 foreign key(user_id,show_id) references public.collection_media_items(user_id,id) on delete cascade,
 check (total_episodes is null or watched_episodes<=total_episodes)
);
create index collection_seasons_show on public.collection_tv_seasons(user_id,show_id,season_number);
alter table public.collection_tv_seasons enable row level security;
revoke all on public.collection_tv_seasons from public,anon,authenticated;
grant select,insert,update,delete on public.collection_tv_seasons to authenticated;
grant select,insert,update,delete on public.collection_tv_seasons to service_role;
create policy owner_read on public.collection_tv_seasons for select to authenticated using ((select auth.uid())=user_id);
create policy owner_insert on public.collection_tv_seasons for insert to authenticated with check ((select auth.uid())=user_id);
create policy owner_update on public.collection_tv_seasons for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy owner_delete on public.collection_tv_seasons for delete to authenticated using ((select auth.uid())=user_id);
create trigger touch_collection before update on public.collection_tv_seasons for each row execute function muse_private.touch_collection_record();
create trigger collection_season_kind before insert or update of show_id,user_id on public.collection_tv_seasons
 for each row execute function public.collection_validate_episode();
