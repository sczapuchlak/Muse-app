-- Creator-exclusive banners (Supernova Haze, Disco Cosmos): only the identity carrying the creator mark may choose
-- them. Additive; enforced by the database so no client can select them for anyone else.
create function muse_private.guard_creator_banners() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.banner_gradient in ('supernova-haze','disco-cosmos')
  and not exists (select 1 from public.social_identities where user_id = new.user_id and creator) then
  raise exception 'That banner is reserved for the Muse creator' using errcode = '42501';
 end if;
 return new;
end $$;
create trigger guard_creator_banners before insert or update of banner_gradient on public.muse_profiles
 for each row execute function muse_private.guard_creator_banners();
revoke all on function muse_private.guard_creator_banners() from public, anon, authenticated;
