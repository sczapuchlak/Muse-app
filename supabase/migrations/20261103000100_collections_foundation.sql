-- Local Collections foundation. Existing Whimsy book IDs, sessions, goals and timers stay canonical.
create table public.collection_media_items (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 kind text not null check (kind in ('movie','tv','game')),
 title text not null check (length(trim(title)) between 1 and 500),
 creator text not null default '',
 release_date date,
 description text not null default '',
 genres text[] not null default '{}',
 cover_url text,
 status text not null,
 rating smallint check (rating between 1 and 5),
 review text not null default '',
 notes text not null default '',
 favorite boolean not null default false,
 tags text[] not null default '{}',
 started_on date,
 completed_on date,
 runtime_minutes integer check (runtime_minutes between 0 and 100000),
 cast_names text[] not null default '{}',
 developer text not null default '',
 publisher text not null default '',
 platforms text[] not null default '{}',
 platform_played text not null default '',
 progress_percent numeric(5,2) check (progress_percent between 0 and 100),
 playtime_minutes integer check (playtime_minutes between 0 and 100000000),
 provider text,
 provider_id text,
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 check (cover_url is null or cover_url ~ '^https://'),
 check (completed_on is null or started_on is null or completed_on>=started_on),
 check ((kind='movie' and status in ('planned','watching','watched','dnf')) or (kind='tv' and status in ('planned','watching','caught-up','completed','paused','dnf')) or (kind='game' and status in ('backlog','playing','paused','completed','dnf')))
);
create index collection_media_owner_kind on public.collection_media_items(user_id,kind,updated_at desc);

create table public.collection_tv_episodes (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 show_id uuid not null,
 season_number integer not null check (season_number between 0 and 999),
 episode_number integer not null check (episode_number between 1 and 9999),
 title text not null default '',
 synopsis text not null default '',
 air_date date,
 runtime_minutes integer check (runtime_minutes between 0 and 100000),
 release_state text not null default 'unknown' check (release_state in ('released','announced','unknown')),
 special boolean not null default false,
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 unique(user_id,show_id,season_number,episode_number),
 foreign key(user_id,show_id) references public.collection_media_items(user_id,id) on delete cascade
);
create index collection_episodes_show on public.collection_tv_episodes(user_id,show_id,season_number,episode_number);

create table public.collection_activity (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 media_id uuid not null,
 episode_id uuid,
 kind text not null check (kind in ('watch','rewatch','play','replay','episode-watch','episode-rewatch')),
 activity_date date not null,
 duration_minutes integer check (duration_minutes between 0 and 100000),
 platform text not null default '',
 notes text not null default '',
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 foreign key(user_id,media_id) references public.collection_media_items(user_id,id) on delete cascade,
 foreign key(user_id,episode_id) references public.collection_tv_episodes(user_id,id) on delete cascade,
 check ((kind in ('episode-watch','episode-rewatch'))=(episode_id is not null))
);
create index collection_activity_date on public.collection_activity(user_id,activity_date desc);

create table public.collection_series (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 title text not null check (length(trim(title)) between 1 and 500),
 kind text not null check (kind in ('book','movie','tv','game','mixed')),
 description text not null default '',
 cover_url text,
 scope text not null default 'released' check (scope in ('released','announced','selected')),
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 check (cover_url is null or cover_url ~ '^https://')
);
create table public.collection_series_members (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 series_id uuid not null,
 book_id uuid,
 media_id uuid,
 sequence numeric(8,2) not null check (sequence>=0),
 role text not null default 'mainline' check (role in ('mainline','optional','spin-off')),
 release_state text not null default 'released' check (release_state in ('released','announced','unknown')),
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 foreign key(user_id,series_id) references public.collection_series(user_id,id) on delete cascade,
 foreign key(user_id,book_id) references public.whimsy_books(user_id,id) on delete cascade,
 foreign key(user_id,media_id) references public.collection_media_items(user_id,id) on delete cascade,
 check ((book_id is null) <> (media_id is null))
);
create unique index collection_series_one_book on public.collection_series_members(user_id,series_id,book_id) where book_id is not null;
create unique index collection_series_one_media on public.collection_series_members(user_id,series_id,media_id) where media_id is not null;

create table public.collection_curated (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 title text not null check (length(trim(title)) between 1 and 500),
 description text not null default '',
 icon text not null default 'sparkle',
 accent text not null default 'primary' check (accent in ('primary','secondary','pop','warm','info')),
 layout text not null default 'grid' check (layout in ('grid','shelf','list','spotlight')),
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id)
);
create table public.collection_curated_members (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 collection_id uuid not null,
 book_id uuid,
 media_id uuid,
 position integer not null check (position>=0),
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 foreign key(user_id,collection_id) references public.collection_curated(user_id,id) on delete cascade,
 foreign key(user_id,book_id) references public.whimsy_books(user_id,id) on delete cascade,
 foreign key(user_id,media_id) references public.collection_media_items(user_id,id) on delete cascade,
 check ((book_id is null) <> (media_id is null))
);
create unique index collection_curated_one_book on public.collection_curated_members(user_id,collection_id,book_id) where book_id is not null;
create unique index collection_curated_one_media on public.collection_curated_members(user_id,collection_id,media_id) where media_id is not null;

create function muse_private.touch_collection_record() returns trigger language plpgsql set search_path='' as $$begin
 new.revision:=old.revision+1;new.created_at:=old.created_at;new.updated_at:=clock_timestamp();return new;
end $$;
do $$declare t text;begin foreach t in array array['collection_media_items','collection_tv_episodes','collection_activity','collection_series','collection_series_members','collection_curated','collection_curated_members'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create trigger touch_collection before update on public.%I for each row execute function muse_private.touch_collection_record()',t);
 end loop;end $$;
