-- Inner Compass, Phase 2: My Chapters & My Experiences (#211).
--
-- Envision → Inner Compass owns everything here; nothing writes to another module.
-- * A Chapter is a meaningful season of life. Chapters may overlap; at most one is the primary current Chapter.
-- * An Experience is the single authoritative record of something lived. It exists on its own; Chapters and
--   Collections only hold references to it (join tables), so unlinking never deletes it and editing it anywhere edits
--   the one record.
-- * A Collection groups Experiences around an interest. It is not a Chapter and has no dates or lifecycle.
-- * Modules are typed, ordered blocks of content belonging to exactly one Chapter or Experience. Their content is
--   validated by the app's module registry (lib/inner-compass/modules.ts); references inside modules to other
--   modules' records (discoveries, Visions, Tarot readings, dreams) are id + name snapshot.
-- * Life Atlas areas stay Reflections' `life_areas`; Chapters and Experiences may point at some of them. Never a score.
-- * Dated reflections reuse Phase 1's `inner_reflections`, which can now also be about a Chapter or an Experience.

create table public.inner_chapters (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 160),
 subtitle text not null default '' check (char_length(subtitle) <= 200),
 word text not null default '' check (char_length(word) <= 60),
 meaning text not null default '' check (char_length(meaning) <= 4000),
 starts_on date,
 ends_on date,
 cover jsonb not null default '{}' check (jsonb_typeof(cover) = 'object' and octet_length(cover::text) <= 4000),
 is_primary boolean not null default false,
 show_on_daily boolean not null default false,
 closing jsonb not null default '{}' check (jsonb_typeof(closing) = 'object' and octet_length(closing::text) <= 40000),
 closed_at timestamptz,
 archived_at timestamptz,
 -- Carry Forward: which Chapter this one grew out of (a reference plus a name snapshot).
 carried_from uuid,
 carried_from_title text check (carried_from_title is null or char_length(carried_from_title) <= 160),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id),
 check (starts_on is null or ends_on is null or ends_on >= starts_on),
 foreign key (user_id, carried_from) references public.inner_chapters (user_id, id) on delete set null (carried_from)
);
create unique index inner_chapters_one_primary on public.inner_chapters (user_id) where is_primary and archived_at is null;
create index inner_chapters_by_start on public.inner_chapters (user_id, starts_on desc nulls last);
create trigger touch_inner_chapter before update on public.inner_chapters for each row execute function muse_private.touch_collection_record();

create table public.inner_experiences (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 200),
 happened_on date,
 description text not null default '' check (char_length(description) <= 8000),
 location text not null default '' check (char_length(location) <= 200),
 people text not null default '' check (char_length(people) <= 500),
 theme text not null default '' check (char_length(theme) <= 80),
 tags text[] not null default '{}' check (cardinality(tags) <= 30 and octet_length(array_to_string(tags, '')) <= 1500),
 cover jsonb not null default '{}' check (jsonb_typeof(cover) = 'object' and octet_length(cover::text) <= 4000),
 photos jsonb not null default '[]' check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 24 and octet_length(photos::text) <= 40000),
 -- An Agenda event or occurrence this Experience came from: a reference with a title and date snapshot, never a copy.
 event jsonb check (event is null or (jsonb_typeof(event) = 'object' and octet_length(event::text) <= 1000)),
 archived_at timestamptz,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id)
);
create index inner_experiences_by_date on public.inner_experiences (user_id, happened_on desc nulls last, created_at desc);
create index inner_experiences_tags on public.inner_experiences using gin (tags);
create trigger touch_inner_experience before update on public.inner_experiences for each row execute function muse_private.touch_collection_record();

create table public.inner_experience_collections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 120),
 description text not null default '' check (char_length(description) <= 2000),
 cover jsonb not null default '{}' check (jsonb_typeof(cover) = 'object' and octet_length(cover::text) <= 4000),
 sort text not null default 'chronological' check (sort in ('chronological', 'manual')),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id)
);
create trigger touch_inner_experience_collection before update on public.inner_experience_collections for each row execute function muse_private.touch_collection_record();

-- Membership only. Removing a row never touches the Experience, the Collection or the Chapter.
create table public.inner_collection_experiences (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 collection_id uuid not null,
 experience_id uuid not null,
 position integer not null default 0 check (position between 0 and 100000),
 created_at timestamptz not null default now(),
 primary key (user_id, collection_id, experience_id),
 foreign key (user_id, collection_id) references public.inner_experience_collections (user_id, id) on delete cascade,
 foreign key (user_id, experience_id) references public.inner_experiences (user_id, id) on delete cascade
);
create index inner_collection_experiences_by_experience on public.inner_collection_experiences (user_id, experience_id);

create table public.inner_chapter_experiences (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 chapter_id uuid not null,
 experience_id uuid not null,
 position integer not null default 0 check (position between 0 and 100000),
 created_at timestamptz not null default now(),
 primary key (user_id, chapter_id, experience_id),
 foreign key (user_id, chapter_id) references public.inner_chapters (user_id, id) on delete cascade,
 foreign key (user_id, experience_id) references public.inner_experiences (user_id, id) on delete cascade
);
create index inner_chapter_experiences_by_experience on public.inner_chapter_experiences (user_id, experience_id);

-- Typed, ordered modules. Exactly one owner: a Chapter or an Experience.
create table public.inner_modules (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 chapter_id uuid,
 experience_id uuid,
 type text not null check (type in ('words','intentions','mantras','embrace','symbols','discoveries','visions','experiences','reflections',
  'notes','photos','exploration','discussion','rituals','materials','tarot','dreams')),
 position integer not null default 0 check (position between 0 and 100000),
 title text not null default '' check (char_length(title) <= 80),
 collapsed boolean not null default false,
 content jsonb not null default '{}' check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (num_nonnulls(chapter_id, experience_id) = 1),
 foreign key (user_id, chapter_id) references public.inner_chapters (user_id, id) on delete cascade,
 foreign key (user_id, experience_id) references public.inner_experiences (user_id, id) on delete cascade
);
create index inner_modules_by_chapter on public.inner_modules (user_id, chapter_id, position) where chapter_id is not null;
create index inner_modules_by_experience on public.inner_modules (user_id, experience_id, position) where experience_id is not null;
create trigger touch_inner_module before update on public.inner_modules for each row execute function muse_private.touch_collection_record();

-- Optional, descriptive Life Atlas associations for Chapters and Experiences. They never change Life Atlas ratings.
create table public.inner_area_links (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 area_id uuid not null,
 chapter_id uuid,
 experience_id uuid,
 created_at timestamptz not null default now(),
 check (num_nonnulls(chapter_id, experience_id) = 1),
 foreign key (user_id, area_id) references public.life_areas (user_id, id) on delete cascade,
 foreign key (user_id, chapter_id) references public.inner_chapters (user_id, id) on delete cascade,
 foreign key (user_id, experience_id) references public.inner_experiences (user_id, id) on delete cascade
);
create unique index inner_area_links_chapter on public.inner_area_links (user_id, chapter_id, area_id) where chapter_id is not null;
create unique index inner_area_links_experience on public.inner_area_links (user_id, experience_id, area_id) where experience_id is not null;
create index inner_area_links_by_area on public.inner_area_links (user_id, area_id);

-- Phase 1 reflections can now be about a Chapter or an Experience (dated, many over time), with optional photos.
alter table public.inner_reflections
 add column chapter_id uuid,
 add column chapter_title text check (chapter_title is null or char_length(chapter_title) <= 160),
 add column experience_id uuid,
 add column experience_title text check (experience_title is null or char_length(experience_title) <= 200),
 add column images jsonb not null default '[]' check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 12 and octet_length(images::text) <= 20000),
 add constraint inner_reflections_chapter_fk foreign key (user_id, chapter_id) references public.inner_chapters (user_id, id) on delete set null (chapter_id),
 add constraint inner_reflections_experience_fk foreign key (user_id, experience_id) references public.inner_experiences (user_id, id) on delete set null (experience_id);
create index inner_reflections_by_chapter on public.inner_reflections (user_id, chapter_id, written_on desc) where chapter_id is not null;
create index inner_reflections_by_experience on public.inner_reflections (user_id, experience_id, written_on desc) where experience_id is not null;

-- A discovery can now be saved from an Experience (its origin kept as a reference plus a name snapshot).
alter table public.inner_discoveries drop constraint inner_discoveries_source_kind_check;
alter table public.inner_discoveries add constraint inner_discoveries_source_kind_check
 check (source_kind is null or source_kind in ('exploration','garden','chapter','experience'));

do $$declare t text;begin foreach t in array array['inner_chapters','inner_experiences','inner_experience_collections','inner_collection_experiences','inner_chapter_experiences','inner_modules','inner_area_links'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated,service_role',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
end loop;end $$;
