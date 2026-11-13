-- Vision Boards 2.0 (#187): flexible canvas size, and image paths found anywhere in a board.
--
-- 1. A board can be a preset ('landscape', 'portrait', 'square') or 'custom' with its own dimensions in board units.
--    Canvas size is independent of zoom: adding space never scales or moves the art (the app shifts coordinates).
-- 2. Images can now appear in more places than a photo's `image`/`cutout`: pattern fills on shapes, borders, sticker
--    outlines and the board background. `asset_paths` (which guards storage deletes) must include every one, so the
--    trigger now collects every `path`/`thumbnailPath` string at any depth of `elements` and `background`, and runs
--    when either changes. Existing boards only use photo paths, which the new query finds identically: no backfill.

alter table public.vision_boards drop constraint vision_boards_size_check;
alter table public.vision_boards
 add column canvas_w integer,
 add column canvas_h integer,
 add constraint vision_boards_size_check check (size in ('landscape', 'portrait', 'square', 'custom')),
 add constraint vision_boards_canvas_check check (
  case when size = 'custom'
   then coalesce(canvas_w between 400 and 8000 and canvas_h between 400 and 8000, false)
   else canvas_w is null and canvas_h is null
  end);

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
  ) found), '{}');
 if exists (select 1 from unnest(new.asset_paths) p where split_part(p, '/', 1) <> new.user_id::text) then
  raise exception 'Board images must be your own' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.vision_board_asset_paths() from public, anon, authenticated;

drop trigger vision_board_assets on public.vision_boards;
create trigger vision_board_assets before insert or update of elements, background on public.vision_boards for each row execute function muse_private.vision_board_asset_paths();
