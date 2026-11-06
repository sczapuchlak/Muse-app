-- The creator mark: a one-of-one gold sparkle ring around the Muse creator's avatar, seen everywhere her avatar
-- appears (sidebar, profile, Stream, friends). Additive. The flag is not in the owner-updatable column grant, so
-- nobody can give it to themselves from the app; it is set once, deliberately, by the Muse team (service role).
alter table public.social_identities add column creator boolean not null default false;
-- One of one: at most a single identity can carry the mark.
create unique index social_identities_one_creator on public.social_identities ((true)) where creator;

-- Identity cards (what other people receive) now say whether this is the creator. Still no auth ids or emails.
create or replace function muse_private.identity_card(target uuid) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('id', i.public_id, 'username', i.username, 'displayName', i.display_name, 'avatarId', i.avatar_id, 'creator', i.creator)
 from public.social_identities i where i.user_id = target;
$$;
