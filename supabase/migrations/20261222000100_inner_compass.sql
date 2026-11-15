-- Inner Compass, Phase 1: My Inner World (#210).
--
-- Envision → Inner Compass owns every record here. Nothing in this migration writes to another module.
-- * A discovery is one small statement about oneself in one of six collections. Category-specific optional
--   fields live in `details` (the app is the validator, as for Intentions and Vision Boards).
-- * Ordinary edits update the row (revision-checked). "Record evolution" is a separate, explicit action
--   (record_inner_evolution) that keeps the earlier words in inner_discovery_versions. Archiving keeps history.
-- * Connections are explicit and undirected (one row per pair); nothing is inferred.
-- * Life Areas stay Reflections' `life_areas`; a discovery may point at some of them.
-- * Exploration definitions live in the repo (content/inner-compass); a response stores the stable key plus a
--   title snapshot and each prompt as it was asked, so editing the library never rewrites an answer.
-- * Reflections and Manifesto lines reference discoveries by id with a name snapshot (on delete: set null).
-- * My Chapters (Phase 2) will reference discoveries by (user_id, id) without copying them.

create table public.inner_discoveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 category text not null check (category in ('values','character','beliefs','philosophy','boundaries','patterns')),
 title text not null check (char_length(btrim(title)) between 1 and 300),
 meaning text not null default '' check (char_length(meaning) <= 4000),
 reflection text not null default '' check (char_length(reflection) <= 20000),
 details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 20000),
 tags text[] not null default '{}' check (cardinality(tags) <= 20 and octet_length(array_to_string(tags, '')) <= 1000),
 favorite boolean not null default false,
 significance_date date,
 -- Where it came from (an exploration, the word garden, later a Chapter): a reference plus a name snapshot.
 source_kind text check (source_kind is null or source_kind in ('exploration','garden','chapter')),
 source_id uuid,
 source_label text check (source_label is null or char_length(source_label) <= 200),
 evolved_at timestamptz,
 archived_at timestamptz,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id)
);
create index inner_discoveries_by_category on public.inner_discoveries (user_id, category, created_at desc);
create index inner_discoveries_evolved on public.inner_discoveries (user_id, evolved_at desc) where evolved_at is not null;
create trigger touch_inner_discovery before update on public.inner_discoveries for each row execute function muse_private.touch_collection_record();

-- Meaningful evolution only. Each row keeps the words before and after, the day it changed, and why.
create table public.inner_discovery_versions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 discovery_id uuid not null,
 title text not null check (char_length(title) <= 300),
 meaning text not null default '' check (char_length(meaning) <= 4000),
 details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 20000),
 next_title text not null check (char_length(next_title) <= 300),
 next_meaning text not null default '' check (char_length(next_meaning) <= 4000),
 reason text not null default '' check (char_length(reason) <= 2000),
 reflection text not null default '' check (char_length(reflection) <= 8000),
 evolved_on date not null default current_date,
 created_at timestamptz not null default now(),
 foreign key (user_id, discovery_id) references public.inner_discoveries (user_id, id) on delete cascade
);
create index inner_discovery_versions_timeline on public.inner_discovery_versions (user_id, discovery_id, evolved_on, created_at);

-- An explicit, undirected connection between two of the person's discoveries (stored once, smaller id first).
create table public.inner_discovery_links (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 a_id uuid not null,
 b_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (user_id, a_id, b_id),
 check (a_id < b_id),
 foreign key (user_id, a_id) references public.inner_discoveries (user_id, id) on delete cascade,
 foreign key (user_id, b_id) references public.inner_discoveries (user_id, id) on delete cascade
);
create index inner_discovery_links_b on public.inner_discovery_links (user_id, b_id);

-- Optional association with Life Atlas areas. Not a score: Level 10 ratings stay independent.
create table public.inner_discovery_areas (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 discovery_id uuid not null,
 area_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (user_id, discovery_id, area_id),
 foreign key (user_id, discovery_id) references public.inner_discoveries (user_id, id) on delete cascade,
 foreign key (user_id, area_id) references public.life_areas (user_id, id) on delete cascade
);
create index inner_discovery_areas_by_area on public.inner_discovery_areas (user_id, area_id);

-- One answered exploration. Several responses to the same exploration are allowed (revisiting it later).
create table public.inner_exploration_responses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 exploration_key text not null check (exploration_key ~ '^[a-z0-9-]{1,64}$'),
 exploration_title text not null check (char_length(btrim(exploration_title)) between 1 and 200),
 answers jsonb not null default '[]' check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 12 and octet_length(answers::text) <= 80000),
 reflection text not null default '' check (char_length(reflection) <= 20000),
 completed_on date not null default current_date,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id)
);
create index inner_exploration_responses_by_key on public.inner_exploration_responses (user_id, exploration_key, completed_on desc);
create trigger touch_inner_exploration_response before update on public.inner_exploration_responses for each row execute function muse_private.touch_collection_record();

-- "Reflect on this": a light journal note about a discovery or an exploration. Not a second journal app.
create table public.inner_reflections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 discovery_id uuid,
 discovery_title text check (discovery_title is null or char_length(discovery_title) <= 300),
 response_id uuid,
 body text not null check (char_length(btrim(body)) between 1 and 20000),
 feeling text check (feeling is null or char_length(feeling) <= 40),
 written_on date not null default current_date,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (user_id, discovery_id) references public.inner_discoveries (user_id, id) on delete set null (discovery_id),
 foreign key (user_id, response_id) references public.inner_exploration_responses (user_id, id) on delete set null (response_id)
);
create index inner_reflections_by_discovery on public.inner_reflections (user_id, discovery_id, written_on desc);
create index inner_reflections_by_response on public.inner_reflections (user_id, response_id) where response_id is not null;
create trigger touch_inner_reflection before update on public.inner_reflections for each row execute function muse_private.touch_collection_record();

-- The Personal Manifesto: one living page per person, authored line by line. Lines drawn from discoveries keep
-- the discovery id and the wording the person chose; editing the discovery later never rewrites the manifesto.
create table public.inner_manifestos (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 title text not null default 'My Manifesto' check (char_length(btrim(title)) between 1 and 120),
 blocks jsonb not null default '[]' check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 120 and octet_length(blocks::text) <= 100000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create trigger touch_inner_manifesto before update on public.inner_manifestos for each row execute function muse_private.touch_collection_record();
-- Versions the person chose to keep ("Keep this version"). Autosaved edits don't create one.
create table public.inner_manifesto_versions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check (char_length(title) <= 120),
 blocks jsonb not null check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 120 and octet_length(blocks::text) <= 100000),
 note text not null default '' check (char_length(note) <= 300),
 saved_at timestamptz not null default now(),
 foreign key (user_id) references public.inner_manifestos (user_id) on delete cascade
);
create index inner_manifesto_versions_by_owner on public.inner_manifesto_versions (user_id, saved_at desc);

-- Record a meaningful evolution atomically: the earlier words are copied from the row itself (never from the
-- client), then the discovery takes its new words. A stale revision is refused so two devices can't collide.
create function public.record_inner_evolution(
 p_id uuid, p_revision bigint, p_title text, p_meaning text, p_details jsonb, p_reason text, p_reflection text, p_evolved_on date
) returns setof public.inner_discoveries language plpgsql security invoker set search_path = '' as $$
declare old public.inner_discoveries;
begin
 select * into old from public.inner_discoveries where id = p_id and user_id = (select auth.uid()) for update;
 if not found then raise exception 'Discovery unavailable' using errcode = '42501'; end if;
 if old.revision <> p_revision then
  raise exception 'This changed on another device. Reload to see the latest before saving again.' using errcode = 'P0001';
 end if;
 insert into public.inner_discovery_versions (user_id, discovery_id, title, meaning, details, next_title, next_meaning, reason, reflection, evolved_on)
  values (old.user_id, old.id, old.title, old.meaning, old.details, btrim(p_title), coalesce(p_meaning, ''), coalesce(p_reason, ''), coalesce(p_reflection, ''), coalesce(p_evolved_on, current_date));
 return query update public.inner_discoveries
  set title = btrim(p_title), meaning = coalesce(p_meaning, ''), details = coalesce(p_details, old.details), evolved_at = clock_timestamp()
  where id = old.id and user_id = old.user_id returning *;
end $$;
revoke all on function public.record_inner_evolution(uuid, bigint, text, text, jsonb, text, text, date) from public, anon;
grant execute on function public.record_inner_evolution(uuid, bigint, text, text, jsonb, text, text, date) to authenticated;

-- Owner-only everywhere. No anonymous access, nothing public, nothing on profiles.
do $$declare t text;begin foreach t in array array['inner_discoveries','inner_discovery_versions','inner_discovery_links','inner_discovery_areas','inner_exploration_responses','inner_reflections','inner_manifestos','inner_manifesto_versions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated,service_role',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
end loop;end $$;
