-- UI Cleanup 1 (#98). Additive: albums in Collections, a "listening" Stream category, custom Stream tags and the
-- Mindspace board layout. Nothing existing is removed or rewritten; old posts, items and notes are untouched.

-- 1. Collections: music albums (same table and ownership as movies, TV and games) with up to three favorite tracks.
alter table public.collection_media_items drop constraint collection_media_items_kind_check,
 add constraint collection_media_items_kind_check check (kind = any (array['movie','tv','game','album']));
alter table public.collection_media_items drop constraint collection_media_items_check1,
 add constraint collection_media_items_check1 check (
  (kind = 'movie' and status = any (array['planned','watching','watched','dnf']))
  or (kind = 'tv' and status = any (array['planned','watching','caught-up','completed','paused','dnf']))
  or (kind = 'game' and status = any (array['backlog','playing','paused','completed','dnf']))
  or (kind = 'album' and status = any (array['planned','listening','listened'])));
alter table public.collection_media_items add column favorite_tracks text[] not null default '{}'
 check (cardinality(favorite_tracks) <= 3 and octet_length(array_to_string(favorite_tracks, '')) <= 900);

-- 2. Stream: share an album as "listening" (a media source, like "watching").
alter table public.stream_posts drop constraint stream_posts_category_check,
 add constraint stream_posts_category_check check (category is null or category = any (array['reading','watching','listening','feeling','dreaming','celebrating','tarot','side-quests','rituals','fortunes','astrology','money']));
alter table public.stream_posts drop constraint stream_posts_category_source,
 add constraint stream_posts_category_source check (kind = 'status' or (category, source_kind) in (
  ('reading','book'),('watching','media'),('listening','media'),('feeling','mood'),('dreaming','dream'),('celebrating','book'),('celebrating','ritual'),
  ('celebrating','side-quest'),('tarot','tarot-reading'),('side-quests','side-quest'),('rituals','ritual'),('fortunes','fortune'),
  ('astrology','astrology'),('money','money-milestone'),('celebrating','money-milestone'),('celebrating','aspiration')));

-- 3. Custom Stream tags: the person's own named tags. A post keeps a snapshot of its tag (name, icon, paint), so
-- renaming or deleting a tag never silently changes or strips earlier posts.
create table public.stream_tags (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 24),
 icon text check (icon is null or icon ~ '^[a-z][a-z0-9-]{0,39}$' or char_length(icon) <= 16),
 paint jsonb check (paint is null or (jsonb_typeof(paint) = 'object' and octet_length(paint::text) <= 400)),
 position integer not null default 0,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index stream_tags_owner on public.stream_tags(user_id, position);
alter table public.stream_posts add column tag jsonb check (tag is null or (jsonb_typeof(tag) = 'object' and octet_length(tag::text) <= 600));

-- The author sets or clears their own post's tag snapshot. Validated shape only: name, optional icon and paint.
create function public.stream_set_tag(p_id uuid, p_tag jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); clean jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 if p_tag is not null then
  if jsonb_typeof(p_tag) <> 'object' or char_length(btrim(coalesce(p_tag->>'name', ''))) not between 1 and 24
   or octet_length(p_tag::text) > 600 or (p_tag ? 'paint' and jsonb_typeof(p_tag->'paint') not in ('object', 'null')) then
   raise exception 'Choose a tag with a short name' using errcode = '22023'; end if;
  clean := jsonb_strip_nulls(jsonb_build_object('id', p_tag->>'id', 'name', btrim(p_tag->>'name'), 'icon', left(p_tag->>'icon', 40), 'paint', p_tag->'paint'));
 end if;
 update public.stream_posts set tag = clean where id = p_id and author = uid;
 if not found then raise exception 'Post unavailable' using errcode = '42501'; end if;
end $$;
revoke all on function public.stream_set_tag(uuid, jsonb) from public, anon;
grant execute on function public.stream_set_tag(uuid, jsonb) to authenticated;

-- Readers see the tag snapshot (unchanged otherwise).
CREATE OR REPLACE FUNCTION muse_private.post_json(viewer uuid, p public.stream_posts)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
  'id', p.id, 'author', muse_private.identity_card(p.author), 'mine', p.author = viewer,
  'kind', p.kind, 'body', p.body, 'decoration', p.decoration, 'tag', p.tag, 'category', p.category, 'sourceKind', p.source_kind,
  -- A removed source hides its snapshot even from the author's view of the card; the author sees the notice.
  'display', case when p.source_state = 'ok' and (p.kind = 'status' or muse_private.stream_source_exists(p.author, p.source_kind, p.source_id)) then p.display end,
  'sourceMissing', p.kind = 'activity' and (p.source_state = 'missing' or not muse_private.stream_source_exists(p.author, p.source_kind, p.source_id)),
  'spoiler', p.spoiler, 'createdAt', p.created_at, 'editedAt', p.edited_at,
  'audience', case when p.author = viewer then p.audience end,
  'members', case when p.author = viewer and p.audience = 'selected' then (select coalesce(jsonb_agg(muse_private.identity_card(m.member)), '[]'::jsonb) from public.stream_post_members m where m.post_id = p.id) end,
  'primaryReaction', p.primary_reaction, 'commentsEnabled', p.comments_enabled,
  -- Counts include only people the viewer could see interacting: never blocked people, never former audience.
  'reactionCount', (select count(*) from public.stream_reactions x
    where x.post_id = p.id and not muse_private.is_blocked(viewer, x.reactor) and muse_private.can_see_post(x.reactor, p)),
  'reacted', exists (select 1 from public.stream_reactions x where x.post_id = p.id and x.reactor = viewer),
  'commentCount', (select count(*) from public.stream_comments c where c.post_id = p.id and not muse_private.is_blocked(viewer, c.author) and muse_private.can_see_post(c.author, p)));
$function$;

-- 4. Mindspace board: one layout document per person (card order and sizes, tag colors, board settings). Notes
-- themselves are not changed; a missing or stale entry simply falls back to the default layout.
create table public.notes_board (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 layout jsonb not null default '{}' check (jsonb_typeof(layout) = 'object' and octet_length(layout::text) <= 200000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

do $$ declare t text; begin
 foreach t in array array['stream_tags', 'notes_board'] loop
  execute format('create trigger touch_%s before update on public.%I for each row execute function muse_private.touch_collection_record()', t, t);
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from public, anon, authenticated', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
 end loop;
end $$;
