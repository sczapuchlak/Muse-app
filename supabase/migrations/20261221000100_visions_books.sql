-- Visions (#187 follow-up): a Vision is a freeform board or a Book.
--
-- A Book keeps its cover (preset + customization) in `cover` and up to eight ordered content pages in `pages`; each
-- page is an ordinary board canvas (its own background and elements) at the book's page size (`size`/`canvas_*`).
-- Books leave `elements` empty. Existing rows are boards and are unchanged (format defaults to 'board').
--
-- The storage guard (`asset_paths`) now also collects image paths from `pages` and `cover`, so photos on any page
-- and a cover image are protected from deletion exactly like a board's, and must still be the owner's own files.

alter table public.vision_boards
 add column format text not null default 'board' check (format in ('board', 'book')),
 add column pages jsonb,
 add column cover jsonb,
 add constraint vision_boards_pages_check check (
  pages is null or (jsonb_typeof(pages) = 'array' and jsonb_array_length(pages) between 1 and 8 and octet_length(pages::text) <= 4000000)),
 add constraint vision_boards_cover_check check (cover is null or (jsonb_typeof(cover) = 'object' and octet_length(cover::text) <= 8000)),
 add constraint vision_boards_book_pages_check check ((format = 'book') = (pages is not null));

create or replace function muse_private.vision_board_asset_paths() returns trigger
language plpgsql set search_path = '' as $$
begin
 new.asset_paths := coalesce((
  select array_agg(distinct p order by p)
  from (
   select v #>> '{}' as p from jsonb_path_query(new.elements, 'strict $.**.path') v where jsonb_typeof(v) = 'string'
   union all select v #>> '{}' from jsonb_path_query(new.elements, 'strict $.**.thumbnailPath') v where jsonb_typeof(v) = 'string'
   union all select v #>> '{}' from jsonb_path_query(new.background, 'strict $.**.path') v where jsonb_typeof(v) = 'string'
   union all select v #>> '{}' from jsonb_path_query(new.background, 'strict $.**.thumbnailPath') v where jsonb_typeof(v) = 'string'
   union all select v #>> '{}' from jsonb_path_query(coalesce(new.pages, '[]'), 'strict $.**.path') v where jsonb_typeof(v) = 'string'
   union all select v #>> '{}' from jsonb_path_query(coalesce(new.pages, '[]'), 'strict $.**.thumbnailPath') v where jsonb_typeof(v) = 'string'
   union all select v #>> '{}' from jsonb_path_query(coalesce(new.cover, '{}'), 'strict $.**.path') v where jsonb_typeof(v) = 'string'
   union all select v #>> '{}' from jsonb_path_query(coalesce(new.cover, '{}'), 'strict $.**.thumbnailPath') v where jsonb_typeof(v) = 'string'
  ) found), '{}');
 if exists (select 1 from unnest(new.asset_paths) p where split_part(p, '/', 1) <> new.user_id::text) then
  raise exception 'Board images must be your own' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.vision_board_asset_paths() from public, anon, authenticated;

drop trigger vision_board_assets on public.vision_boards;
create trigger vision_board_assets before insert or update of elements, background, pages, cover on public.vision_boards for each row execute function muse_private.vision_board_asset_paths();
