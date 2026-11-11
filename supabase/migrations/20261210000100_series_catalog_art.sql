-- #136 completion: catalog artwork and facts for installments not (yet) on the reader's shelf, and a
-- separate role for omnibus/box-set editions so they never count toward series progress.
-- Additive only. Existing rows, personal books and reading history are untouched.
alter table public.collection_series_members
 add column catalog_cover_url text check (catalog_cover_url is null or (catalog_cover_url ~ '^https://' and length(catalog_cover_url) <= 1000)),
 add column catalog_cover_color text check (catalog_cover_color is null or catalog_cover_color ~ '^#[0-9a-f]{6}$'),
 add column catalog_pages integer check (catalog_pages is null or catalog_pages between 1 and 99999),
 add column catalog_release_year integer check (catalog_release_year is null or catalog_release_year between 1000 and 3000);

alter table public.collection_series_members drop constraint collection_series_members_role_check;
alter table public.collection_series_members add constraint collection_series_members_role_check
 check (role in ('mainline','optional','spin-off','collection'));

alter table public.collection_series
 add column catalog_completed boolean;
