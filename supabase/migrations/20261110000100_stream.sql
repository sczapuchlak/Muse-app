-- Stream of Consciousness (#27). Additive: no existing table or record changes.
-- A private-first, chronological friends feed built on the Social Foundation (#16): identities, friendships and
-- blocking are reused, never duplicated. Every read and write goes through security-definer functions that evaluate
-- the current friendship, blocking, audience and source state at call time, so unfriending, blocking, unpublishing
-- or deleting a source record revokes access immediately. Activity posts reference a real saved Muse record and keep
-- only the privacy-safe snapshot the author approved at publish time (validated like Showcase items); the snapshot
-- never updates on its own and deleting a post never touches its source. New posts default to Only Me.
-- Each post has one contextual primary reaction (React, Send Love, Share Joy, Cheer or Celebrate) chosen by its kind;
-- viewers either give it or not. Authors can switch comments off per post and remove comments; anyone who can see a
-- post can report it. Hiding Stream from navigation is a separate per-account preference that never touches posts.

-- ---- Tables ---------------------------------------------------------------------------------------------------------
create table public.stream_posts (
 id uuid primary key,
 author uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('status','activity')),
 body text not null default '' check (char_length(body) <= 1000),
 decoration text check (decoration is null or decoration in ('magical','in-my-feelings','choosing-chaos','hermit-era','thriving')),
 category text check (category is null or category in ('reading','watching','feeling','dreaming','celebrating','tarot','side-quests','rituals','fortunes','astrology','money')),
 source_kind text check (source_kind is null or source_kind in ('book','media','mood','dream','tarot-reading','ritual','side-quest','fortune','astrology','money-milestone')),
 source_id text check (source_id is null or char_length(source_id) <= 200),
 display jsonb,
 spoiler boolean not null default false,
 primary_reaction text not null default 'react' check (primary_reaction in ('react','love','joy','cheer','celebrate')),
 comments_enabled boolean not null default true,
 audience text not null default 'private' check (audience in ('private','friends','selected')),
 source_state text not null default 'ok' check (source_state in ('ok','missing')),
 created_at timestamptz not null default clock_timestamp(),
 edited_at timestamptz,
 -- A status is words; an activity is a reference to one real record plus its approved snapshot.
 check ((kind = 'status' and char_length(btrim(body)) >= 1 and source_kind is null and source_id is null and display is null and category is null)
     or (kind = 'activity' and source_kind is not null and source_id is not null and display is not null and category is not null)),
 -- Each shortcut accepts only the record types that belong to it.
 check (kind = 'status' or (category, source_kind) in (('reading','book'),('watching','media'),('feeling','mood'),('dreaming','dream'),
  ('celebrating','book'),('celebrating','ritual'),('celebrating','side-quest'),('tarot','tarot-reading'),('side-quests','side-quest'),('rituals','ritual'),
  ('fortunes','fortune'),('astrology','astrology'),('money','money-milestone'),('celebrating','money-milestone'))),
 -- The one reaction suits the moment: moods choose Send Love, Share Joy or a neutral React; habit milestones Cheer;
 -- celebrations and money milestones Celebrate; everything else React.
 check (case when category = 'feeling' then primary_reaction in ('react','love','joy') when category = 'rituals' then primary_reaction = 'cheer'
  when category in ('celebrating','money') then primary_reaction = 'celebrate' else primary_reaction = 'react' end)
);
create index stream_posts_feed on public.stream_posts (created_at desc, id desc);
create index stream_posts_author on public.stream_posts (author, created_at desc);
create index stream_posts_source on public.stream_posts (author, source_kind, source_id);

-- Selected-friends audiences keep exactly the people chosen at publish time.
create table public.stream_post_members (
 post_id uuid not null references public.stream_posts(id) on delete cascade,
 member uuid not null references auth.users(id) on delete cascade,
 primary key (post_id, member)
);
create index stream_post_members_member on public.stream_post_members (member);

create table public.stream_reactions (
 post_id uuid not null references public.stream_posts(id) on delete cascade,
 reactor uuid not null references auth.users(id) on delete cascade,
 reaction text not null check (reaction in ('react','love','joy','cheer','celebrate')),
 created_at timestamptz not null default clock_timestamp(),
 -- One reaction per person per post: it can be changed or removed, never stacked.
 primary key (post_id, reactor)
);

create table public.stream_comments (
 id uuid primary key,
 post_id uuid not null references public.stream_posts(id) on delete cascade,
 author uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default clock_timestamp(),
 edited_at timestamptz
);
create index stream_comments_post on public.stream_comments (post_id, created_at);

create table public.stream_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient uuid not null references auth.users(id) on delete cascade,
 actor uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('reaction','comment','friend-request','friend-accepted')),
 post_id uuid references public.stream_posts(id) on delete cascade,
 comment_id uuid references public.stream_comments(id) on delete cascade,
 reaction text check (reaction is null or reaction in ('react','love','joy','cheer','celebrate')),
 created_at timestamptz not null default clock_timestamp(),
 read_at timestamptz,
 check (recipient <> actor)
);
create index stream_notifications_recipient on public.stream_notifications (recipient, created_at desc);
-- One reaction notification per person and post: changing a reaction updates it rather than stacking more.
create unique index stream_notifications_one_reaction on public.stream_notifications (recipient, actor, post_id) where kind = 'reaction';

-- Per-account Stream preferences: in-app notification categories and whether Stream appears in navigation.
-- Hiding Stream is not unpublishing and not pausing social participation; posts and friendships are untouched.
create table public.stream_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 show_in_navigation boolean not null default true,
 notify_reactions boolean not null default true,
 notify_comments boolean not null default true,
 notify_friend_requests boolean not null default true,
 notify_friend_accepted boolean not null default true,
 updated_at timestamptz not null default clock_timestamp()
);

-- Reports go to the Muse team (service role) only; reporters never see each other or a queue.
create table public.stream_reports (
 id uuid primary key default gen_random_uuid(),
 reporter uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.stream_posts(id) on delete cascade,
 comment_id uuid references public.stream_comments(id) on delete cascade,
 reason text not null check (reason in ('unkind','spam','private-info','other')),
 note text not null default '' check (char_length(note) <= 500),
 created_at timestamptz not null default clock_timestamp()
);
create unique index stream_reports_once on public.stream_reports (reporter, post_id, coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Function-only access: nobody reads or writes these tables directly.
do $$declare t text;begin foreach t in array array['stream_posts','stream_post_members','stream_reactions','stream_comments','stream_notifications','stream_preferences','stream_reports'] loop
 execute format('alter table public.%I enable row level security', t);
 execute format('revoke all on public.%I from public, anon, authenticated', t);
 execute format('grant select on public.%I to service_role', t);
end loop;end $$;

-- ---- Validation and sources ---------------------------------------------------------------------------------------
/** Stream snapshots: the Showcase allow-list plus one short, author-chosen excerpt. */
create function muse_private.valid_stream_display(d jsonb) returns boolean language sql immutable set search_path = '' as $$
 select coalesce(muse_private.valid_showcase_display(d - 'excerpt')
  and (d->'excerpt' is null or (jsonb_typeof(d->'excerpt') = 'string' and char_length(d->>'excerpt') between 1 and 280)), false);
$$;
alter table public.stream_posts add constraint stream_posts_display check (display is null or muse_private.valid_stream_display(display));
-- Money milestones have a dedicated shape: a fixed headline and an optional date. Never names, amounts, balances,
-- limits, APR, account or card details, or transactions.
alter table public.stream_posts add constraint stream_posts_money_shape check (source_kind is distinct from 'money-milestone' or (
 (display - array['kind','title','glyph','date']) = '{}'::jsonb
 and display->>'title' in ('Paid off a credit card','Paid a bill on time')));

create function muse_private.stream_source_exists(owner uuid, kind text, source text) returns boolean language sql stable security definer set search_path = '' as $$
 select case kind
  when 'mood' then exists (select 1 from public.mood_checkins where user_id = owner and id::text = source)
  when 'dream' then exists (select 1 from public.whimsy_dream_entries where user_id = owner and id::text = source)
  when 'tarot-reading' then exists (select 1 from public.whimsy_tarot_readings where user_id = owner and id::text = source)
  when 'fortune' then exists (select 1 from public.whimsy_saved_discoveries where user_id = owner and id::text = source)
  when 'astrology' then exists (select 1 from public.astrology_natal_charts where user_id = owner and id::text = source)
  when 'money-milestone' then exists (select 1 from public.bills where user_id = owner and id::text = source and paid)
   or exists (select 1 from public.cards where user_id = owner and id::text = source)
  else muse_private.showcase_source_exists(owner, kind, source) end;
$$;

create function muse_private.stream_source_deleted() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 update public.stream_posts set source_state = 'missing' where author = old.user_id and source_kind = tg_argv[0] and source_id = old.id::text;
 return old;
end $$;
create trigger stream_source_deleted after delete on public.whimsy_books for each row execute function muse_private.stream_source_deleted('book');
create trigger stream_source_deleted after delete on public.collection_media_items for each row execute function muse_private.stream_source_deleted('media');
create trigger stream_source_deleted after delete on public.mood_checkins for each row execute function muse_private.stream_source_deleted('mood');
create trigger stream_source_deleted after delete on public.whimsy_dream_entries for each row execute function muse_private.stream_source_deleted('dream');
create trigger stream_source_deleted after delete on public.whimsy_tarot_readings for each row execute function muse_private.stream_source_deleted('tarot-reading');
create trigger stream_source_deleted after delete on public.rituals for each row execute function muse_private.stream_source_deleted('ritual');
create trigger stream_source_deleted after delete on public.whimsy_quest_completions for each row execute function muse_private.stream_source_deleted('side-quest');
create trigger stream_source_deleted after delete on public.whimsy_saved_discoveries for each row execute function muse_private.stream_source_deleted('fortune');
create trigger stream_source_deleted after delete on public.astrology_natal_charts for each row execute function muse_private.stream_source_deleted('astrology');
create trigger stream_source_deleted after delete on public.bills for each row execute function muse_private.stream_source_deleted('money-milestone');
create trigger stream_source_deleted after delete on public.cards for each row execute function muse_private.stream_source_deleted('money-milestone');

-- ---- Authorization --------------------------------------------------------------------------------------------------
/** May `viewer` see post `p` right now? Authors always; others only while every condition holds. */
create function muse_private.can_see_post(viewer uuid, p public.stream_posts) returns boolean language sql stable security definer set search_path = '' as $$
 select viewer is not null and (p.author = viewer or (
  p.audience <> 'private' and p.source_state = 'ok'
  and muse_private.are_friends(viewer, p.author)
  and (p.audience = 'friends' or exists (select 1 from public.stream_post_members m where m.post_id = p.id and m.member = viewer))
  and (p.kind = 'status' or muse_private.stream_source_exists(p.author, p.source_kind, p.source_id))));
$$;

create function muse_private.require_stream(uid uuid) returns void language plpgsql stable security definer set search_path = '' as $$
begin
 perform muse_private.require_identity(uid);
 if not exists (select 1 from public.social_identities where user_id = uid and participation = 'active') then
  raise exception 'Social features are paused for your account' using errcode = '22023'; end if;
end $$;

create function muse_private.wants_notification(recipient uuid, kind text) returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce((select case kind when 'reaction' then n.notify_reactions when 'comment' then n.notify_comments
   when 'friend-request' then n.notify_friend_requests when 'friend-accepted' then n.notify_friend_accepted end
  from public.stream_preferences n where n.user_id = recipient), true);
$$;

-- ---- Post shape returned to readers (author card, snapshot, reactions, comment count; never auth ids) -----------
create function muse_private.post_json(viewer uuid, p public.stream_posts) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'id', p.id, 'author', muse_private.identity_card(p.author), 'mine', p.author = viewer,
  'kind', p.kind, 'body', p.body, 'decoration', p.decoration, 'category', p.category, 'sourceKind', p.source_kind,
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
$$;

-- ---- Feed ------------------------------------------------------------------------------------------------------------
/** Newest first, strictly chronological, only what the caller may see right now. Keyset pages of up to 30. */
create function public.stream_feed(p_before timestamptz default null, p_before_id uuid default null, p_category text default null, p_limit integer default 20, p_author uuid default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); result jsonb; author_filter uuid := muse_private.user_for_public_id(p_author);
begin
 perform muse_private.require_stream(uid);
 -- A profile's recent posts: only that author's posts the caller may see (an unknown id simply shows nothing).
 if p_author is not null and author_filter is null then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(muse_private.post_json(uid, p) order by p.created_at desc, p.id desc), '[]'::jsonb) into result from (
  select * from public.stream_posts p
  where (p_before is null or (p.created_at, p.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   -- Filters: All (null), Reading & Watching, Life Updates, Whimsy, Celebrations.
   and (p_category is null
    or (p_category = 'reading-watching' and p.category in ('reading','watching'))
    or (p_category = 'life' and (p.kind = 'status' or p.category = 'feeling'))
    or (p_category = 'whimsy' and p.category in ('dreaming','tarot','side-quests','fortunes','astrology'))
    or (p_category = 'celebrations' and p.category in ('celebrating','rituals','money')))
   and (author_filter is null or p.author = author_filter)
   and muse_private.can_see_post(uid, p)
  order by p.created_at desc, p.id desc limit greatest(1, least(coalesce(p_limit, 20), 30))) p;
 return result;
end $$;

/** One post, rechecked live (used when opening a notification or a shared link). Unavailable reads as not found. */
create function public.stream_post(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); post public.stream_posts;
begin
 perform muse_private.require_stream(uid);
 select * into post from public.stream_posts where id = p_id;
 if not found or not muse_private.can_see_post(uid, post) then return null; end if;
 return muse_private.post_json(uid, post);
end $$;

-- ---- Publishing ------------------------------------------------------------------------------------------------------
/** Replaces a selected-friends list with exactly the current friends chosen; other audiences keep no list. */
create function muse_private.set_post_members(uid uuid, post public.stream_posts, members uuid[]) returns void language plpgsql security definer set search_path = '' as $$
declare member uuid; picked uuid;
begin
 delete from public.stream_post_members where post_id = post.id;
 if post.audience <> 'selected' then return; end if;
 if coalesce(cardinality(members), 0) = 0 then raise exception 'Choose at least one friend' using errcode = '22023'; end if;
 if cardinality(members) > 200 then raise exception 'Too many people selected' using errcode = '22023'; end if;
 foreach member in array members loop
  picked := muse_private.user_for_public_id(member);
  if picked is null or not muse_private.are_friends(uid, picked) then raise exception 'Only current friends can be selected' using errcode = '22023'; end if;
  insert into public.stream_post_members (post_id, member) values (post.id, picked) on conflict do nothing;
 end loop;
end $$;

/** Idempotent on the client-chosen id, so a double tap or a retry never posts twice. */
create function public.stream_publish(p_id uuid, p_body text, p_decoration text default null, p_category text default null, p_source_kind text default null,
 p_source_id text default null, p_display jsonb default null, p_spoiler boolean default false, p_audience text default 'private', p_members uuid[] default '{}',
 p_primary_reaction text default 'react', p_comments_enabled boolean default true)
 returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); existing public.stream_posts; post public.stream_posts; kind text := case when p_source_kind is null then 'status' else 'activity' end;
begin
 perform muse_private.require_stream(uid);
 select * into existing from public.stream_posts where id = p_id;
 if found then
  if existing.author <> uid then raise exception 'That post cannot be saved' using errcode = '22023'; end if;
  return muse_private.post_json(uid, existing);
 end if;
 if kind = 'activity' and not muse_private.stream_source_exists(uid, p_source_kind, p_source_id) then
  raise exception 'Choose something you have saved in Muse' using errcode = '22023'; end if;
 insert into public.stream_posts (id, author, kind, body, decoration, category, source_kind, source_id, display, spoiler, audience, primary_reaction, comments_enabled)
  values (p_id, uid, kind, coalesce(btrim(p_body), ''), p_decoration, p_category, p_source_kind, p_source_id, p_display, coalesce(p_spoiler, false), coalesce(p_audience, 'private'),
   coalesce(p_primary_reaction, 'react'), coalesce(p_comments_enabled, true))
  returning * into post;
 perform muse_private.set_post_members(uid, post, p_members);
 return muse_private.post_json(uid, post);
end $$;

/** Authors may reword a post, change its flourish, spoiler flag and audience (Unpublish = Only me). The snapshot stays as published. */
create function public.stream_edit(p_id uuid, p_body text, p_decoration text default null, p_spoiler boolean default false, p_audience text default null, p_members uuid[] default null, p_comments_enabled boolean default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); post public.stream_posts;
begin
 perform muse_private.require_identity(uid);
 select * into post from public.stream_posts where id = p_id and author = uid for update;
 if not found then raise exception 'That post is not yours to edit' using errcode = '22023'; end if;
 if post.kind = 'status' and char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'A status needs a few words' using errcode = '22023'; end if;
 update public.stream_posts set body = coalesce(btrim(p_body), ''), decoration = p_decoration, spoiler = coalesce(p_spoiler, false),
  audience = coalesce(p_audience, audience), comments_enabled = coalesce(p_comments_enabled, comments_enabled), edited_at = clock_timestamp() where id = post.id returning * into post;
 -- Keep the explicit list unless the author changes audience or names people again.
 if p_audience is not null or p_members is not null then
  if post.audience = 'selected' and p_members is null then
   if not exists (select 1 from public.stream_post_members where post_id = post.id) then raise exception 'Choose at least one friend' using errcode = '22023'; end if;
  else perform muse_private.set_post_members(uid, post, p_members); end if;
 end if;
 return muse_private.post_json(uid, post);
end $$;

/** Deletes the post, its reactions, comments and notifications. Its source record is never touched. */
create function public.stream_delete(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
 perform muse_private.require_identity(uid);
 delete from public.stream_posts where id = p_id and author = uid;
 if not found then raise exception 'That post is not yours' using errcode = '22023'; end if;
end $$;

-- ---- Reactions -------------------------------------------------------------------------------------------------------
/** Give (true) or take back (false) the post's one contextual reaction. Never duplicated. */
create function public.stream_react(p_post uuid, p_on boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); post public.stream_posts;
begin
 perform muse_private.require_stream(uid);
 select * into post from public.stream_posts where id = p_post;
 if not found or not muse_private.can_see_post(uid, post) then raise exception 'That post is not available' using errcode = '22023'; end if;
 if p_on then
  insert into public.stream_reactions (post_id, reactor, reaction) values (post.id, uid, post.primary_reaction) on conflict (post_id, reactor) do nothing;
  if found and post.author <> uid and muse_private.wants_notification(post.author, 'reaction') then
   insert into public.stream_notifications (recipient, actor, kind, post_id, reaction) values (post.author, uid, 'reaction', post.id, post.primary_reaction)
    on conflict (recipient, actor, post_id) where kind = 'reaction' do nothing;
  end if;
 else
  delete from public.stream_reactions where post_id = post.id and reactor = uid;
  delete from public.stream_notifications where kind = 'reaction' and actor = uid and post_id = post.id;
 end if;
 return muse_private.post_json(uid, post);
end $$;

-- ---- Comments --------------------------------------------------------------------------------------------------------
create function muse_private.comment_json(viewer uuid, c public.stream_comments, post_author uuid) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('id', c.id, 'author', muse_private.identity_card(c.author), 'body', c.body, 'createdAt', c.created_at, 'editedAt', c.edited_at,
  'mine', c.author = viewer, 'canRemove', c.author = viewer or post_author = viewer);
$$;

create function public.stream_comments(p_post uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); post public.stream_posts; result jsonb;
begin
 perform muse_private.require_stream(uid);
 select * into post from public.stream_posts where id = p_post;
 if not found or not muse_private.can_see_post(uid, post) then raise exception 'That post is not available' using errcode = '22023'; end if;
 select coalesce(jsonb_agg(muse_private.comment_json(uid, c, post.author) order by c.created_at, c.id), '[]'::jsonb) into result
  from public.stream_comments c where c.post_id = post.id and not muse_private.is_blocked(uid, c.author) and muse_private.can_see_post(c.author, post);
 return result;
end $$;

/** Idempotent on the client-chosen comment id. */
create function public.stream_comment(p_post uuid, p_id uuid, p_body text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); post public.stream_posts; c public.stream_comments;
begin
 perform muse_private.require_stream(uid);
 select * into post from public.stream_posts where id = p_post;
 if not found or not muse_private.can_see_post(uid, post) then raise exception 'That post is not available' using errcode = '22023'; end if;
 if not post.comments_enabled then raise exception 'Comments are off for this post' using errcode = '22023'; end if;
 select * into c from public.stream_comments where id = p_id;
 if found then
  if c.author <> uid or c.post_id <> post.id then raise exception 'That comment cannot be saved' using errcode = '22023'; end if;
  return muse_private.comment_json(uid, c, post.author);
 end if;
 insert into public.stream_comments (id, post_id, author, body) values (p_id, post.id, uid, btrim(p_body)) returning * into c;
 if post.author <> uid and muse_private.wants_notification(post.author, 'comment') then
  insert into public.stream_notifications (recipient, actor, kind, post_id, comment_id) values (post.author, uid, 'comment', post.id, c.id);
 end if;
 return muse_private.comment_json(uid, c, post.author);
end $$;

create function public.stream_edit_comment(p_id uuid, p_body text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.stream_comments; post public.stream_posts;
begin
 perform muse_private.require_stream(uid);
 select * into c from public.stream_comments where id = p_id and author = uid;
 if not found then raise exception 'That comment is not yours' using errcode = '22023'; end if;
 select * into post from public.stream_posts where id = c.post_id;
 if not muse_private.can_see_post(uid, post) then raise exception 'That post is not available' using errcode = '22023'; end if;
 update public.stream_comments set body = btrim(p_body), edited_at = clock_timestamp() where id = c.id returning * into c;
 return muse_private.comment_json(uid, c, post.author);
end $$;

/** Report a post or one of its comments to the Muse team. Only people who can see the post may report it; once each. */
create function public.stream_report(p_post uuid, p_comment uuid default null, p_reason text default 'other', p_note text default '') returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); post public.stream_posts;
begin
 perform muse_private.require_stream(uid);
 select * into post from public.stream_posts where id = p_post;
 if not found or not muse_private.can_see_post(uid, post) or post.author = uid then raise exception 'That post is not available' using errcode = '22023'; end if;
 if p_comment is not null and not exists (select 1 from public.stream_comments where id = p_comment and post_id = post.id) then raise exception 'That comment is not available' using errcode = '22023'; end if;
 insert into public.stream_reports (reporter, post_id, comment_id, reason, note) values (uid, post.id, p_comment, p_reason, left(coalesce(btrim(p_note), ''), 500)) on conflict do nothing;
end $$;

/** A comment's author, or the post's author, may remove it. */
create function public.stream_delete_comment(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
 perform muse_private.require_identity(uid);
 delete from public.stream_comments c using public.stream_posts p
  where c.id = p_id and p.id = c.post_id and (c.author = uid or p.author = uid);
 if not found then raise exception 'That comment cannot be removed' using errcode = '22023'; end if;
end $$;

-- ---- Notifications ---------------------------------------------------------------------------------------------------
-- Friend requests and acceptances notify through the existing request lifecycle (no new discovery or friendship logic).
create function muse_private.notify_friend_request() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op = 'INSERT' and new.status = 'pending' and muse_private.wants_notification(new.addressee, 'friend-request') then
  insert into public.stream_notifications (recipient, actor, kind) values (new.addressee, new.requester, 'friend-request');
 elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' and muse_private.wants_notification(new.requester, 'friend-accepted') then
  insert into public.stream_notifications (recipient, actor, kind) values (new.requester, new.addressee, 'friend-accepted');
 end if;
 return new;
end $$;
create trigger notify_friend_request after insert or update of status on public.friend_requests for each row execute function muse_private.notify_friend_request();

/** The caller's notifications, filtered live: blocked people, hidden posts and switched-off kinds never appear. */
create function public.stream_notifications(p_limit integer default 30) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); result jsonb;
begin
 perform muse_private.require_identity(uid);
 select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'actor', muse_private.identity_card(n.actor), 'postId', n.post_id, 'reaction', n.reaction,
   'excerpt', case when n.post_id is null then null when p.spoiler then 'Spoiler-protected post' else left(coalesce(nullif(p.body, ''), p.display->>'title', ''), 80) end,
   'createdAt', n.created_at, 'read', n.read_at is not null) order by n.created_at desc), '[]'::jsonb) into result
 from (select * from public.stream_notifications x where x.recipient = uid
   and not muse_private.is_blocked(uid, x.actor)
   and muse_private.wants_notification(uid, x.kind)
   order by x.created_at desc limit greatest(1, least(coalesce(p_limit, 30), 100))) n
 left join public.stream_posts p on p.id = n.post_id
 where n.post_id is null or muse_private.can_see_post(n.actor, p);
 return result;
end $$;

create function public.stream_mark_notifications_read() returns void language plpgsql security definer set search_path = '' as $$
begin
 perform muse_private.require_identity(auth.uid());
 update public.stream_notifications set read_at = clock_timestamp() where recipient = auth.uid() and read_at is null;
end $$;

create function public.stream_preferences() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n public.stream_preferences;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 select * into n from public.stream_preferences where user_id = uid;
 return jsonb_build_object('showInNavigation', coalesce(n.show_in_navigation, true), 'reactions', coalesce(n.notify_reactions, true), 'comments', coalesce(n.notify_comments, true),
  'friendRequests', coalesce(n.notify_friend_requests, true), 'friendAccepted', coalesce(n.notify_friend_accepted, true));
end $$;

create function public.set_stream_preferences(p_show_in_navigation boolean, p_reactions boolean, p_comments boolean, p_friend_requests boolean, p_friend_accepted boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 insert into public.stream_preferences (user_id, show_in_navigation, notify_reactions, notify_comments, notify_friend_requests, notify_friend_accepted)
  values (uid, p_show_in_navigation, p_reactions, p_comments, p_friend_requests, p_friend_accepted)
  on conflict (user_id) do update set show_in_navigation = excluded.show_in_navigation, notify_reactions = excluded.notify_reactions, notify_comments = excluded.notify_comments,
   notify_friend_requests = excluded.notify_friend_requests, notify_friend_accepted = excluded.notify_friend_accepted, updated_at = clock_timestamp();
 return public.stream_preferences();
end $$;

-- ---- Grants ----------------------------------------------------------------------------------------------------------
revoke all on function muse_private.stream_source_exists(uuid,text,text), muse_private.stream_source_deleted(), muse_private.can_see_post(uuid,public.stream_posts),
 muse_private.require_stream(uuid), muse_private.wants_notification(uuid,text), muse_private.set_post_members(uuid,public.stream_posts,uuid[]), muse_private.post_json(uuid,public.stream_posts),
 muse_private.comment_json(uuid,public.stream_comments,uuid), muse_private.notify_friend_request() from public, anon, authenticated;
revoke all on function muse_private.valid_stream_display(jsonb) from public, anon;
grant execute on function muse_private.valid_stream_display(jsonb) to authenticated;
do $$declare f text;begin foreach f in array array[
 'stream_feed(timestamptz,uuid,text,integer,uuid)','stream_post(uuid)','stream_publish(uuid,text,text,text,text,text,jsonb,boolean,text,uuid[],text,boolean)','stream_edit(uuid,text,text,boolean,text,uuid[],boolean)',
 'stream_delete(uuid)','stream_react(uuid,boolean)','stream_comments(uuid)','stream_comment(uuid,uuid,text)','stream_report(uuid,uuid,text,text)',
 'stream_edit_comment(uuid,text)','stream_delete_comment(uuid)','stream_notifications(integer)','stream_mark_notifications_read()',
 'stream_preferences()','set_stream_preferences(boolean,boolean,boolean,boolean,boolean)'] loop
 execute format('revoke all on function public.%s from public, anon', f);
 execute format('grant execute on function public.%s to authenticated', f);
end loop;end $$;
