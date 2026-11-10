-- #136: lightweight series references share the existing series/member owner.
-- A catalog-only member has no Library book. Existing member IDs and reading records stay untouched.
alter table public.collection_series
 add column catalog_source text check (catalog_source in ('hardcover','wikidata','open-library')),
 add column catalog_id text check (length(catalog_id) <= 120),
 add column catalog_author text not null default '',
 add column catalog_primary_count integer check (catalog_primary_count >= 0),
 add column catalog_total_count integer check (catalog_total_count >= 0),
 add column catalog_refreshed_at timestamptz,
 add constraint series_catalog_identity_pair check ((catalog_source is null) = (catalog_id is null));

alter table public.collection_series_members
 add column catalog_source text check (catalog_source in ('hardcover','wikidata','open-library','manual')),
 add column catalog_id text check (length(catalog_id) <= 120),
 add column catalog_title text check (length(btrim(catalog_title)) between 1 and 500),
 add column catalog_author text not null default '' check (length(catalog_author) <= 300),
 add column catalog_release_date date,
 add column position_known boolean not null default true,
 add column starred boolean not null default false,
 add column hidden boolean not null default false,
 add column manual_override boolean not null default false,
 add constraint series_member_catalog_identity_pair check ((catalog_source is null) = (catalog_id is null));

alter table public.collection_series_members drop constraint collection_series_members_check;
alter table public.collection_series_members add constraint series_member_book_media_or_ghost check (
 (book_id is not null and media_id is null)
 or (media_id is not null and book_id is null)
 or (book_id is null and media_id is null and catalog_title is not null and catalog_id is not null)
);
create unique index series_member_catalog_identity on public.collection_series_members(user_id,series_id,catalog_source,catalog_id) where catalog_id is not null;

create or replace function public.collection_validate_series_member()
returns trigger language plpgsql set search_path = public as $$
declare series_kind text; media_kind text;
begin
 select kind into series_kind from public.collection_series where id=new.series_id and user_id=new.user_id;
 if series_kind is null then raise exception 'Installment requires an owned series'; end if;
 if new.book_id is not null then media_kind:='book';
 elsif new.media_id is not null then select kind into media_kind from public.collection_media_items where id=new.media_id and user_id=new.user_id;
 else media_kind:='book'; end if;
 if series_kind<>'mixed' and series_kind is distinct from media_kind then raise exception 'Installment type must match the series'; end if;
 return new;
end $$;
