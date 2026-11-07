-- Rituals → Bucket List (#84). Additive and owner-only.
-- One ongoing list per person: `bucket_lists` holds its settings (title, time horizon, the year → color key and the
-- preferred completion treatment); `bucket_entries` holds the dreams. Year colors are stored hex values, so they stay
-- the same across themes and over time. Links to Aspirations are an id (on delete set null), so removing either record
-- never removes the other. Inspiration/Constellations links are ids inside `links`, never copies of the card.
create table public.bucket_lists (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 title text not null default 'Bucket List' check (length(btrim(title)) between 1 and 80),
 horizon_start integer not null check (horizon_start between 1900 and 2200),
 horizon_end integer not null check (horizon_end between 1900 and 2200),
 year_colors jsonb not null default '{}' check (jsonb_typeof(year_colors) = 'object'),
 completion_style text not null default 'highlight' check (completion_style in ('highlight','strike','stamp')),
 show_numbers boolean not null default true,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (horizon_end >= horizon_start and horizon_end - horizon_start <= 100)
);

create table public.bucket_entries (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 -- The permanent display number (like the numbers in a handwritten list). Optional, never reassigned automatically.
 number integer check (number is null or number between 1 and 100000),
 position double precision not null default 0,
 title text not null check (length(btrim(title)) between 1 and 200),
 notes text check (notes is null or length(notes) <= 4000),
 category text check (category is null or length(btrim(category)) between 1 and 40),
 tags text[] not null default '{}' check (cardinality(tags) <= 20),
 icon text check (icon is null or length(icon) between 1 and 16),
 status text not null default 'dreaming' check (status in ('dreaming','planned','in_progress','completed')),
 -- Null means Someday / unscheduled, which is a valid choice.
 target_year integer check (target_year is null or target_year between 1900 and 2200),
 links jsonb not null default '[]' check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 30),
 cover jsonb check (cover is null or jsonb_typeof(cover) = 'object'),
 aspiration_id uuid references public.aspirations on delete set null,
 completed_on date,
 -- The completion story: notes, location, favorite memory, photos (image metadata only; files live in private storage).
 completion jsonb not null default '{}' check (jsonb_typeof(completion) = 'object'),
 -- Earlier completions kept when an entry is reopened: [{completedOn, reopenedOn}].
 history jsonb not null default '[]' check (jsonb_typeof(history) = 'array' and jsonb_array_length(history) <= 50),
 archived_at timestamptz,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((status = 'completed') = (completed_on is not null))
);
create index bucket_entries_owner on public.bucket_entries (user_id, position);
create unique index bucket_entries_number on public.bucket_entries (user_id, number) where number is not null;
create index bucket_entries_aspiration on public.bucket_entries (aspiration_id) where aspiration_id is not null;

-- A linked aspiration must belong to the same person.
create function muse_private.bucket_entry_aspiration_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.aspiration_id is not null and not exists (select 1 from public.aspirations a where a.id = new.aspiration_id and a.user_id = new.user_id) then
  raise exception 'Aspiration unavailable' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.bucket_entry_aspiration_owner() from public, anon, authenticated;
create trigger bucket_entry_aspiration_owner before insert or update of aspiration_id, user_id on public.bucket_entries for each row execute function muse_private.bucket_entry_aspiration_owner();
-- Same revision bump as Collections and Aspirations.
create trigger touch_bucket_list before update on public.bucket_lists for each row execute function muse_private.touch_collection_record();
create trigger touch_bucket_entry before update on public.bucket_entries for each row execute function muse_private.touch_collection_record();

alter table public.bucket_lists enable row level security;
alter table public.bucket_entries enable row level security;
revoke all on public.bucket_lists, public.bucket_entries from public, anon, authenticated;
grant select, insert, update, delete on public.bucket_lists, public.bucket_entries to authenticated, service_role;
create policy owner_read on public.bucket_lists for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.bucket_lists for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.bucket_lists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.bucket_lists for delete to authenticated using ((select auth.uid()) = user_id);
create policy owner_read on public.bucket_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.bucket_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.bucket_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.bucket_entries for delete to authenticated using ((select auth.uid()) = user_id);
