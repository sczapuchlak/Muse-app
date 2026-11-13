-- Life Atlas 2.0 (#190): Design My Year ritual, "The Year in Your Own Words", completion keepsakes and related
-- aspirations. Additive and backward compatible: existing aspirations, year plans, priorities, visions and
-- Reading Challenge connections keep their meaning. Nothing is backfilled or reassigned.

-- The year plan stays the one home for a year's own words. `theme` (existing) is the word or mantra.
alter table public.aspiration_year_plans
 add column feelings text[] not null default '{}'
  check (cardinality(feelings) <= 5 and octet_length(array_to_string(feelings, '')) <= 400),
 add column focus text not null default '' check (char_length(focus) <= 500),
 add column extraordinary text not null default '' check (char_length(extraordinary) <= 2000),
 -- Where the guided ritual was last left ('imagine', a life area id, 'declare'); aspirations themselves are saved
 -- as they are written, so a draft never holds a second copy of anything.
 add column ritual_step text check (ritual_step is null or char_length(ritual_step) <= 64),
 add column ritual_started_at timestamptz,
 add column ritual_completed_at timestamptz,
 -- Set when the person brings the year to life or chooses to build the Atlas themselves.
 add column established_at timestamptz;

-- A year priority may now be chosen before its aspiration has a life area. The snapshot stays optional, not invented.
alter table public.aspiration_year_priorities alter column area_name drop not null;

-- Completion: optional reflections, and an optional keepsake photo stored like the cover (private, owner-scoped).
alter table public.aspirations
 add column show_progress boolean not null default true,
 add column completion jsonb check (completion is null or (jsonb_typeof(completion) = 'object' and octet_length(completion::text) <= 8000)),
 add column keepsake jsonb check (keepsake is null or (jsonb_typeof(keepsake) = 'object' and octet_length(keepsake::text) <= 3000));

create or replace function muse_private.aspiration_cover_owner() returns trigger language plpgsql set search_path = '' as $$
declare prefix text := new.user_id::text || '/' || new.id::text || '/%';
begin
 if new.cover is not null and (coalesce(new.cover->>'path','') not like prefix or coalesce(new.cover->>'thumbnailPath','') not like prefix) then
  raise exception 'Cover images must belong to this aspiration' using errcode = '42501';
 end if;
 if new.keepsake is not null and (coalesce(new.keepsake->>'path','') not like prefix or coalesce(new.keepsake->>'thumbnailPath','') not like prefix) then
  raise exception 'Keepsake images must belong to this aspiration' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.aspiration_cover_owner() from public, anon, authenticated;
drop trigger aspiration_cover_owner on public.aspirations;
create trigger aspiration_cover_owner before insert or update of cover, keepsake on public.aspirations for each row execute function muse_private.aspiration_cover_owner();

-- Related aspirations: a light, symmetric connection (stored once, smaller id first). No nesting, no copies.
create table public.aspiration_links (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 aspiration_id uuid not null,
 related_id uuid not null,
 created_at timestamptz not null default now(),
 primary key (user_id, aspiration_id, related_id),
 check (aspiration_id < related_id),
 foreign key (user_id, aspiration_id) references public.aspirations (user_id, id) on delete cascade,
 foreign key (user_id, related_id) references public.aspirations (user_id, id) on delete cascade
);
create index aspiration_links_related on public.aspiration_links (user_id, related_id);
alter table public.aspiration_links enable row level security;
revoke all on public.aspiration_links from public, anon, authenticated;
grant select, insert, delete on public.aspiration_links to authenticated;
grant select, insert, update, delete on public.aspiration_links to service_role;
create policy owner_read on public.aspiration_links for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.aspiration_links for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_delete on public.aspiration_links for delete to authenticated using ((select auth.uid()) = user_id);
