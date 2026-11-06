-- Personal Profiles & Showcase Studio (#26). Additive. Builds on the social foundation (#16).
-- No images are stored: avatars are illustrated Muse characters and banners are gradient presets.
-- Owners edit their own rows directly (owner-only RLS). Other people never read these tables: they get a
-- friend-facing view from profile_view(), which checks friendship and blocking on every call and returns only
-- published content and owner-approved display fields. Private source records are never referenced by visitors.

create table public.muse_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tagline text not null default '' check (char_length(tagline) <= 120),
 bio text not null default '' check (char_length(bio) <= 600),
 banner_gradient text not null default 'midnight-prism' check (banner_gradient ~ '^[a-z0-9-]{2,40}$'),
 profile_theme text not null check (profile_theme ~ '^[a-z0-9-]{1,40}$'),
 sections jsonb not null default '[{"id":"about","hidden":false},{"id":"badges","hidden":false},{"id":"showcases","hidden":false}]'::jsonb check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) <= 10),
 badges text[] not null default '{}' check (cardinality(badges) <= 6 and array_to_string(badges, ',') ~ '^[a-z0-9,-]*$'),
 visibility text not null default 'private' check (visibility in ('private','friends')),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);

create table public.showcases (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 80),
 description text not null default '' check (char_length(description) <= 280),
 icon text not null default 'sparkle' check (icon ~ '^[a-z][a-z-]{1,30}$'),
 gradient text not null default 'nebula-kiss' check (gradient ~ '^[a-z0-9-]{2,40}$'),
 layout text not null default 'gallery' check (layout in ('gallery','shelf','spotlight','cards','mixed')),
 visibility text not null default 'draft' check (visibility in ('draft','private','friends')),
 position integer not null default 0,
 published_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique (user_id, id)
);
create index showcases_owner on public.showcases (user_id, position);

/** Only these keys, with bounded text, can ever be shown to a visitor. Adapters choose; the database enforces. */
create function muse_private.valid_showcase_display(d jsonb) returns boolean language sql immutable set search_path = '' as $$
 -- coalesce: a missing field must fail the check (a NULL would let a CHECK constraint pass).
 select coalesce(jsonb_typeof(d) = 'object'
  and pg_column_size(d) <= 4000
  and not exists (select 1 from jsonb_object_keys(d) k where k not in ('kind','title','subtitle','image','meta','rating','progress','status','glyph','date'))
  and jsonb_typeof(d->'title') = 'string' and char_length(d->>'title') between 1 and 200
  and (d->'subtitle' is null or (jsonb_typeof(d->'subtitle') = 'string' and char_length(d->>'subtitle') <= 200))
  and (d->'image' is null or (jsonb_typeof(d->'image') = 'string' and char_length(d->>'image') <= 500 and (d->>'image') ~ '^(https://[^\s"''<>]{3,}|/[a-z0-9/_.-]{1,200})$'))
  and (d->'meta' is null or (jsonb_typeof(d->'meta') = 'array' and jsonb_array_length(d->'meta') <= 4 and not exists (select 1 from jsonb_array_elements(d->'meta') m where jsonb_typeof(m) <> 'string' or char_length(m #>> '{}') > 80)))
  and (d->'rating' is null or (jsonb_typeof(d->'rating') = 'number' and (d->>'rating')::numeric between 0 and 5))
  and (d->'progress' is null or (jsonb_typeof(d->'progress') = 'number' and (d->>'progress')::numeric between 0 and 100))
  and (d->'status' is null or (jsonb_typeof(d->'status') = 'string' and char_length(d->>'status') <= 40))
  and (d->'glyph' is null or (jsonb_typeof(d->'glyph') = 'string' and (d->>'glyph') ~ '^[a-z][a-z-]{1,30}$'))
  and (d->'date' is null or (jsonb_typeof(d->'date') = 'string' and (d->>'date') ~ '^\d{4}-\d{2}-\d{2}$'))
  and (d->'kind' is null or (jsonb_typeof(d->'kind') = 'string' and (d->>'kind') ~ '^[a-z-]{2,30}$')), false);
$$;

create table public.showcase_items (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 showcase_id uuid not null,
 source_kind text not null check (source_kind in ('book','media','curated','tarot-card','dream-symbol','ritual','side-quest','victory')),
 source_id text check (source_id is null or char_length(source_id) <= 200),
 display jsonb not null check (muse_private.valid_showcase_display(display)),
 approved text[] not null default '{}' check (cardinality(approved) <= 10),
 note text not null default '' check (char_length(note) <= 280),
 position integer not null default 0,
 source_state text not null default 'ok' check (source_state in ('ok','missing')),
 snapshot_at timestamptz not null default clock_timestamp(),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 foreign key (user_id, showcase_id) references public.showcases (user_id, id) on delete cascade
);
create index showcase_items_showcase on public.showcase_items (showcase_id, position);

-- A generous ceiling per person.
create function muse_private.limit_showcases() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (select count(*) from public.showcases where user_id = new.user_id) >= 60 then raise exception 'You can have up to 60 Showcases.' using errcode = '54000'; end if;
 return new;
end $$;
create function muse_private.limit_showcase_items() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (select count(*) from public.showcase_items where showcase_id = new.showcase_id) >= 48 then raise exception 'A Showcase holds up to 48 items.' using errcode = '54000'; end if;
 return new;
end $$;
create trigger showcases_limit before insert on public.showcases for each row execute function muse_private.limit_showcases();
create trigger showcase_items_limit before insert on public.showcase_items for each row execute function muse_private.limit_showcase_items();
create function muse_private.touch_profile_row() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
create trigger muse_profiles_touch before update on public.muse_profiles for each row execute function muse_private.touch_profile_row();
create trigger showcases_touch before update on public.showcases for each row execute function muse_private.touch_profile_row();
create trigger showcase_items_touch before update on public.showcase_items for each row execute function muse_private.touch_profile_row();

do $$declare t text;begin foreach t in array array['muse_profiles','showcases','showcase_items'] loop
 execute format('alter table public.%I enable row level security', t);
 execute format('revoke all on public.%I from public, anon, authenticated', t);
 execute format('grant select, insert, update, delete on public.%I to authenticated', t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
 execute format('grant select on public.%I to service_role', t);
end loop;end $$;

-- ---- Deleted sources are revoked by the database, immediately ------------------------------------------------------
-- A Showcase item points at one of the owner's records. If that record is deleted, friends must stop seeing the item
-- at once, without waiting for the owner to open Muse. Two layers: profile_view() checks the source still exists on
-- every read, and delete triggers on each source table mark the item missing (so the owner sees it flagged too).
-- Tarot cards and dream symbols come from Muse's built-in library and cannot be deleted; victories have no source.
create function muse_private.showcase_source_exists(owner uuid, kind text, source text) returns boolean language sql stable security definer set search_path = '' as $$
 select case kind
  when 'book' then exists (select 1 from public.whimsy_books where user_id = owner and id::text = source)
  when 'media' then exists (select 1 from public.collection_media_items where user_id = owner and id::text = source)
  when 'curated' then exists (select 1 from public.collection_curated where user_id = owner and id::text = source)
  when 'ritual' then exists (select 1 from public.rituals where user_id = owner and id::text = source)
  when 'side-quest' then exists (select 1 from public.whimsy_quest_completions where user_id = owner and id::text = source)
  else true end;
$$;
create function muse_private.showcase_source_deleted() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 update public.showcase_items set source_state = 'missing' where user_id = old.user_id and source_kind = tg_argv[0] and source_id = old.id::text and source_state <> 'missing';
 return old;
end $$;
create trigger showcase_source_deleted after delete on public.whimsy_books for each row execute function muse_private.showcase_source_deleted('book');
create trigger showcase_source_deleted after delete on public.collection_media_items for each row execute function muse_private.showcase_source_deleted('media');
create trigger showcase_source_deleted after delete on public.collection_curated for each row execute function muse_private.showcase_source_deleted('curated');
create trigger showcase_source_deleted after delete on public.rituals for each row execute function muse_private.showcase_source_deleted('ritual');
create trigger showcase_source_deleted after delete on public.whimsy_quest_completions for each row execute function muse_private.showcase_source_deleted('side-quest');
revoke all on function muse_private.showcase_source_exists(uuid,text,text), muse_private.showcase_source_deleted() from public, anon, authenticated;

-- ---- What a friend sees ---------------------------------------------------------------------------------------------
/**
 * The friend-facing profile. Returns null unless the caller is the owner or a current, unblocked friend AND the
 * owner shares the profile with friends. Even for the owner it returns only what friends would see, which is what
 * "Preview as a friend" shows. Drafts, private Showcases and items whose source is gone (checked live) are never included.
 */
create function public.profile_view(p_profile uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare owner uuid := muse_private.user_for_public_id(p_profile); p public.muse_profiles;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 if owner is null or not public.can_view_as_friend(owner) then return null; end if;
 select * into p from public.muse_profiles where user_id = owner;
 if not found or (p.visibility <> 'friends' and owner <> auth.uid()) then return null; end if;
 return jsonb_build_object(
  'identity', muse_private.identity_card(owner),
  'visibility', p.visibility,
  'profile', jsonb_build_object('tagline', p.tagline, 'bio', p.bio, 'bannerGradient', p.banner_gradient, 'theme', p.profile_theme, 'sections', p.sections, 'badges', to_jsonb(p.badges)),
  'showcases', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'description', s.description, 'icon', s.icon, 'gradient', s.gradient, 'layout', s.layout,
     'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.source_kind, 'display', i.display, 'note', i.note) order by i.position, i.created_at) from public.showcase_items i where i.showcase_id = s.id and i.source_state = 'ok' and muse_private.showcase_source_exists(owner, i.source_kind, i.source_id)), '[]'::jsonb))
    order by s.position, s.created_at) from public.showcases s where s.user_id = owner and s.visibility = 'friends'), '[]'::jsonb));
end $$;

/** Resolves a username for a profile link without revealing whether someone you cannot see exists. */
create function public.profile_lookup(p_username text) returns uuid language sql stable security definer set search_path = '' as $$
 select i.public_id from public.social_identities i
 where i.username = lower(btrim(p_username)) and public.can_view_as_friend(i.user_id)
  and (i.user_id = auth.uid() or exists (select 1 from public.muse_profiles p where p.user_id = i.user_id and p.visibility = 'friends'));
$$;

revoke all on function muse_private.valid_showcase_display(jsonb) from public, anon;
grant execute on function muse_private.valid_showcase_display(jsonb) to authenticated;
revoke all on function muse_private.limit_showcases(), muse_private.limit_showcase_items(), muse_private.touch_profile_row() from public, anon, authenticated;
do $$declare f text;begin foreach f in array array['profile_view(uuid)','profile_lookup(text)'] loop
 execute format('revoke all on function public.%s from public, anon', f);
 execute format('grant execute on function public.%s to authenticated', f);
end loop;end $$;
