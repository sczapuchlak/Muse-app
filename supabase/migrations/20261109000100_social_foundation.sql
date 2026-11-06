-- Muse Social foundation (#16). Additive: no existing table or record changes.
-- One social identity per person (reused by Profiles #26 and, later, Stream #27), opt-in discovery,
-- friend requests, mutual friendships and blocking. Every cross-person read goes through security-definer
-- functions that evaluate friendship and blocking at call time, so removing or blocking a friend revokes
-- access immediately. Visitors never see auth identifiers or emails: people are addressed by a separate public id.

create table public.social_identities (
 user_id uuid primary key references auth.users(id) on delete cascade,
 public_id uuid not null unique default gen_random_uuid(),
 username text not null check (username ~ '^[a-z0-9](?:[a-z0-9_.]{1,28})[a-z0-9]$' and username !~ '\.\.'),
 display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
 -- Which bundled Muse illustration the person chose (e.g. 'reading-dragon'). Only the id is stored: no photos or
 -- image data. A custom uploaded avatar can be added later as a separate option without touching friendships.
 avatar_id text not null default 'moon-witch' check (avatar_id ~ '^[a-z][a-z0-9-]{2,47}$'),
 discoverable boolean not null default false,
 participation text not null default 'active' check (participation in ('active','paused')),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 username_changed_at timestamptz not null default clock_timestamp()
);
create unique index social_identities_username on public.social_identities (username);

create table public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references auth.users(id) on delete cascade,
 addressee uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default clock_timestamp(),
 responded_at timestamptz,
 check (requester <> addressee)
);
-- At most one pending request per pair, in either direction.
create unique index friend_requests_one_pending on public.friend_requests (least(requester,addressee), greatest(requester,addressee)) where status = 'pending';
create index friend_requests_addressee on public.friend_requests (addressee, status);

create table public.friendships (
 user_low uuid not null references auth.users(id) on delete cascade,
 user_high uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 primary key (user_low, user_high),
 check (user_low < user_high)
);
create index friendships_high on public.friendships (user_high);

create table public.social_blocks (
 blocker uuid not null references auth.users(id) on delete cascade,
 blocked uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 primary key (blocker, blocked),
 check (blocker <> blocked)
);
create index social_blocks_blocked on public.social_blocks (blocked);

-- Direct table access: owners read and edit their own identity; everything else is function-only.
do $$declare t text;begin foreach t in array array['social_identities','friend_requests','friendships','social_blocks'] loop
 execute format('alter table public.%I enable row level security', t);
 execute format('revoke all on public.%I from public, anon, authenticated', t);
end loop;end $$;
-- Identities are created through social_create_identity (username rules); owners may change their own presentation.
-- Ids, timestamps and username history are protected; usernames change through social_set_username.
grant select on public.social_identities to authenticated;
grant update (display_name, avatar_id, discoverable, participation) on public.social_identities to authenticated;
create policy owner_read on public.social_identities for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_update on public.social_identities for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select on public.social_identities, public.friend_requests, public.friendships, public.social_blocks to service_role;

-- ---- Shared authorization (also used by Profiles and future Stream) ------------------------------------------
create function muse_private.is_blocked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.social_blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
create function muse_private.are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select a is not null and b is not null and a <> b
  and exists(select 1 from public.friendships where user_low = least(a,b) and user_high = greatest(a,b))
  and not muse_private.is_blocked(a, b)
  and exists(select 1 from public.social_identities where user_id = a and participation = 'active')
  and exists(select 1 from public.social_identities where user_id = b and participation = 'active');
$$;
/** May the signed-in person see friends-only content owned by `owner`? Evaluated live on every read. */
create function public.can_view_as_friend(owner uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select owner = auth.uid() or muse_private.are_friends(auth.uid(), owner);
$$;
/** May the signed-in person see `target`'s identity card (name, username, avatar)? Used by Stream (#27) later. */
create function muse_private.can_see_identity(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select target = auth.uid() or (
  not muse_private.is_blocked(auth.uid(), target) and exists(select 1 from public.social_identities i where i.user_id = target and i.participation = 'active') and (
   muse_private.are_friends(auth.uid(), target)
   or exists(select 1 from public.social_identities i where i.user_id = target and i.discoverable)
   or exists(select 1 from public.friend_requests r where r.status = 'pending' and ((r.requester = auth.uid() and r.addressee = target) or (r.addressee = auth.uid() and r.requester = target)))));
$$;
create function muse_private.user_for_public_id(p uuid) returns uuid language sql stable security definer set search_path = '' as $$
 select user_id from public.social_identities where public_id = p;
$$;

create function muse_private.reserved_username(name text) returns boolean language sql immutable set search_path = '' as $$
 select lower(name) = any(array['admin','administrator','muse','musehq','official','support','help','helpdesk','staff','team','moderator','mod','system','root','security','privacy','terms','about','settings','profile','profiles','friends','friend','stream','api','auth','login','logout','signin','signup','register','invite','invites','welcome','me','you','user','users','null','undefined','anonymous','everyone','nobody','www','mail','email','appearance','atelier','showcase','showcases','people','search','home','daily','planner','rituals','wellness','insights','money','notes','mindspace','collections','tarot','dreams','astrology','whimsy']);
$$;

-- ---- Identity commands --------------------------------------------------------------------------------------------
create function public.social_username_status(p_username text) returns text language plpgsql stable security definer set search_path = '' as $$
declare name text := lower(btrim(coalesce(p_username,'')));
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 if name !~ '^[a-z0-9](?:[a-z0-9_.]{1,28})[a-z0-9]$' or name ~ '\.\.' then return 'invalid'; end if;
 if muse_private.reserved_username(name) then return 'reserved'; end if;
 if exists(select 1 from public.social_identities where username = name and user_id <> auth.uid()) then return 'taken'; end if;
 return 'available';
end $$;

create function public.social_set_username(p_username text) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); name text := lower(btrim(coalesce(p_username,''))); state text;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 state := public.social_username_status(name);
 if state <> 'available' then raise exception 'Username %', state using errcode = '22023'; end if;
 update public.social_identities set username = name, username_changed_at = clock_timestamp(), updated_at = clock_timestamp() where user_id = uid and username <> name;
 return name;
end $$;

create function public.social_create_identity(p_username text, p_display_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); name text := lower(btrim(coalesce(p_username,''))); state text; pid uuid;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 select public_id into pid from public.social_identities where user_id = uid; if found then return pid; end if;
 state := public.social_username_status(name);
 if state <> 'available' then raise exception 'Username %', state using errcode = '22023'; end if;
 insert into public.social_identities (user_id, username, display_name) values (uid, name, btrim(p_display_name)) returning public_id into pid;
 return pid;
end $$;

-- Keep update timestamps honest.
create function muse_private.touch_social_identity() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
create trigger social_identities_touch before update on public.social_identities for each row execute function muse_private.touch_social_identity();

-- ---- Card shape returned to other people (no auth ids, no emails) -------------------------------------------------
create function muse_private.identity_card(target uuid) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('id', i.public_id, 'username', i.username, 'displayName', i.display_name, 'avatarId', i.avatar_id)
 from public.social_identities i where i.user_id = target;
$$;

-- ---- Discovery ------------------------------------------------------------------------------------------------------
/** Exact username, or a prefix of at least three characters, among people who chose to be discoverable. */
create function public.social_search(p_query text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); q text := lower(btrim(coalesce(p_query,''))); result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 q := regexp_replace(q, '^@', '');
 if char_length(q) < 3 or q !~ '^[a-z0-9_.]+$' then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(muse_private.identity_card(i.user_id) || jsonb_build_object('relationship', muse_private.relationship(uid, i.user_id)) order by (i.username = q) desc, i.username), '[]'::jsonb) into result
 from (select * from public.social_identities i
  where i.user_id <> uid and i.discoverable and i.participation = 'active' and not muse_private.is_blocked(uid, i.user_id)
   and (i.username = q or i.username like q || '%') order by (i.username = q) desc, i.username limit 20) i;
 return result;
end $$;

create function muse_private.relationship(me uuid, other uuid) returns text language sql stable security definer set search_path = '' as $$
 select case
  when exists(select 1 from public.social_blocks where blocker = me and blocked = other) then 'blocked'
  when exists(select 1 from public.friendships where user_low = least(me,other) and user_high = greatest(me,other)) then 'friends'
  when exists(select 1 from public.friend_requests where status = 'pending' and requester = me and addressee = other) then 'outgoing'
  when exists(select 1 from public.friend_requests where status = 'pending' and requester = other and addressee = me) then 'incoming'
  else 'none' end;
$$;

-- ---- Friend lifecycle -----------------------------------------------------------------------------------------------
create function muse_private.require_identity(uid uuid) returns void language plpgsql stable security definer set search_path = '' as $$
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 if not exists(select 1 from public.social_identities where user_id = uid) then raise exception 'Create your profile first' using errcode = '22023'; end if;
end $$;

create function public.social_send_request(p_target uuid) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := muse_private.user_for_public_id(p_target); incoming uuid;
begin
 perform muse_private.require_identity(uid);
 if target is null or target = uid or muse_private.is_blocked(uid, target) or not exists(select 1 from public.social_identities where user_id = target and participation = 'active') then raise exception 'That person cannot be added' using errcode = '22023'; end if;
 if exists(select 1 from public.friendships where user_low = least(uid,target) and user_high = greatest(uid,target)) then return 'friends'; end if;
 select id into incoming from public.friend_requests where status = 'pending' and requester = target and addressee = uid;
 if found then perform public.social_respond(incoming, true); return 'friends'; end if;
 if exists(select 1 from public.friend_requests where status = 'pending' and requester = uid and addressee = target) then return 'outgoing'; end if;
 -- Requests start from discovery: the person must be discoverable.
 if not exists(select 1 from public.social_identities where user_id = target and discoverable) then raise exception 'That person cannot be added' using errcode = '22023'; end if;
 insert into public.friend_requests (requester, addressee) values (uid, target);
 return 'outgoing';
end $$;

create function public.social_respond(p_request uuid, p_accept boolean) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.friend_requests;
begin
 perform muse_private.require_identity(uid);
 select * into r from public.friend_requests where id = p_request and addressee = uid and status = 'pending' for update;
 if not found then raise exception 'That request is no longer waiting' using errcode = '22023'; end if;
 if p_accept and muse_private.is_blocked(r.requester, uid) then raise exception 'That request is no longer waiting' using errcode = '22023'; end if;
 update public.friend_requests set status = case when p_accept then 'accepted' else 'declined' end, responded_at = clock_timestamp() where id = r.id;
 if p_accept then insert into public.friendships (user_low, user_high) values (least(r.requester,uid), greatest(r.requester,uid)) on conflict do nothing; return 'friends'; end if;
 return 'none';
end $$;

create function public.social_cancel_request(p_target uuid) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := muse_private.user_for_public_id(p_target);
begin
 perform muse_private.require_identity(uid);
 update public.friend_requests set status = 'cancelled', responded_at = clock_timestamp() where status = 'pending' and requester = uid and addressee = target;
end $$;

create function public.social_decline(p_target uuid) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := muse_private.user_for_public_id(p_target);
begin
 perform muse_private.require_identity(uid);
 update public.friend_requests set status = 'declined', responded_at = clock_timestamp() where status = 'pending' and requester = target and addressee = uid;
end $$;

create function public.social_accept(p_target uuid) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := muse_private.user_for_public_id(p_target); rid uuid;
begin
 perform muse_private.require_identity(uid);
 select id into rid from public.friend_requests where status = 'pending' and requester = target and addressee = uid;
 if not found then raise exception 'That request is no longer waiting' using errcode = '22023'; end if;
 return public.social_respond(rid, true);
end $$;

create function public.social_remove_friend(p_target uuid) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := muse_private.user_for_public_id(p_target);
begin
 perform muse_private.require_identity(uid);
 delete from public.friendships where user_low = least(uid,target) and user_high = greatest(uid,target);
end $$;

/** Blocking removes the friendship and any pending requests at once; access ends on the very next read. */
create function public.social_block(p_target uuid) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := muse_private.user_for_public_id(p_target);
begin
 perform muse_private.require_identity(uid);
 if target is null or target = uid then raise exception 'That person cannot be blocked' using errcode = '22023'; end if;
 insert into public.social_blocks (blocker, blocked) values (uid, target) on conflict do nothing;
 delete from public.friendships where user_low = least(uid,target) and user_high = greatest(uid,target);
 update public.friend_requests set status = 'cancelled', responded_at = clock_timestamp() where status = 'pending' and ((requester = uid and addressee = target) or (requester = target and addressee = uid));
end $$;

create function public.social_unblock(p_target uuid) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := muse_private.user_for_public_id(p_target);
begin
 perform muse_private.require_identity(uid);
 delete from public.social_blocks where blocker = uid and blocked = target;
end $$;

/** Everything the Friends page needs, as identity cards only. */
create function public.social_overview() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
 return jsonb_build_object(
  'friends', coalesce((select jsonb_agg(muse_private.identity_card(case when f.user_low = uid then f.user_high else f.user_low end) || jsonb_build_object('since', f.created_at) order by f.created_at desc) from public.friendships f where (f.user_low = uid or f.user_high = uid) and not muse_private.is_blocked(f.user_low, f.user_high)), '[]'::jsonb),
  'incoming', coalesce((select jsonb_agg(muse_private.identity_card(r.requester) || jsonb_build_object('since', r.created_at) order by r.created_at desc) from public.friend_requests r where r.addressee = uid and r.status = 'pending'), '[]'::jsonb),
  'outgoing', coalesce((select jsonb_agg(muse_private.identity_card(r.addressee) || jsonb_build_object('since', r.created_at) order by r.created_at desc) from public.friend_requests r where r.requester = uid and r.status = 'pending'), '[]'::jsonb),
  'blocked', coalesce((select jsonb_agg(muse_private.identity_card(b.blocked) || jsonb_build_object('since', b.created_at) order by b.created_at desc) from public.social_blocks b where b.blocker = uid), '[]'::jsonb));
end $$;

revoke all on function muse_private.is_blocked(uuid,uuid), muse_private.are_friends(uuid,uuid), muse_private.can_see_identity(uuid), muse_private.user_for_public_id(uuid), muse_private.identity_card(uuid), muse_private.relationship(uuid,uuid), muse_private.require_identity(uuid), muse_private.reserved_username(text), muse_private.touch_social_identity() from public, anon, authenticated;
do $$declare f text;begin foreach f in array array['can_view_as_friend(uuid)','social_username_status(text)','social_set_username(text)','social_create_identity(text,text)','social_search(text)','social_send_request(uuid)','social_respond(uuid,boolean)','social_cancel_request(uuid)','social_decline(uuid)','social_accept(uuid)','social_remove_friend(uuid)','social_block(uuid)','social_unblock(uuid)','social_overview()'] loop
 execute format('revoke all on function public.%s from public, anon', f);
 execute format('grant execute on function public.%s to authenticated', f);
end loop;end $$;
