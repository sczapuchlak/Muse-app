-- Envision → Vision Boards (#118). Additive and owner-only.
-- A board owns its composition (background + layered elements) and the image files it uploaded. It never owns the
-- Aspirations or Bucket List dreams an element points at: those are referenced by id with a name snapshot inside the
-- element, never copied, and nothing here writes to another module.

-- One row per board. The composition is one versioned document (like Intentions pages), validated by the app and
-- bounded here. Positions are in board units (fixed canvas size), so a board reopens identically on any screen.
create table public.vision_boards (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 120),
 description text check (description is null or char_length(description) <= 2000),
 theme text check (theme is null or char_length(theme) <= 60),
 period text check (period in ('month', 'quarter', 'year')),
 period_start date,
 size text not null default 'landscape' check (size in ('landscape', 'portrait', 'square')),
 background jsonb not null default '{}' check (jsonb_typeof(background) = 'object' and octet_length(background::text) <= 2000),
 elements jsonb not null default '[]' check (jsonb_typeof(elements) = 'array' and jsonb_array_length(elements) <= 300 and octet_length(elements::text) <= 600000),
 -- Derived from `elements` by trigger (never written by the app): every private image path the board uses.
 asset_paths text[] not null default '{}',
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((period is null) = (period_start is null)),
 -- Periods line up with Intentions: calendar months, calendar quarters and calendar years.
 check (period is null or case period
  when 'month' then extract(day from period_start) = 1
  when 'quarter' then extract(day from period_start) = 1 and extract(month from period_start) in (1, 4, 7, 10)
  when 'year' then extract(month from period_start) = 1 and extract(day from period_start) = 1
 end)
);
create index vision_boards_owner on public.vision_boards(user_id, updated_at desc);
create index vision_boards_assets on public.vision_boards using gin (asset_paths);

-- Collect the image paths an element list uses, and refuse paths outside the owner's own folder.
create function muse_private.vision_board_asset_paths() returns trigger
language plpgsql set search_path = '' as $$
begin
 new.asset_paths := coalesce((
  select array_agg(distinct p order by p)
  from jsonb_array_elements(new.elements) e
  cross join lateral (values (e->'image'->>'path'), (e->'image'->>'thumbnailPath'), (e->'cutout'->>'path'), (e->'cutout'->>'thumbnailPath')) v(p)
  where p is not null), '{}');
 if exists (select 1 from unnest(new.asset_paths) p where split_part(p, '/', 1) <> new.user_id::text) then
  raise exception 'Board images must be your own' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.vision_board_asset_paths() from public, anon, authenticated;

create trigger vision_board_assets before insert or update of elements on public.vision_boards for each row execute function muse_private.vision_board_asset_paths();
create trigger touch_vision_boards before update on public.vision_boards for each row execute function muse_private.touch_collection_record();
alter table public.vision_boards enable row level security;
revoke all on public.vision_boards from public, anon, authenticated;
grant select, insert, update, delete on public.vision_boards to authenticated, service_role;
create policy owner_read on public.vision_boards for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.vision_boards for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.vision_boards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.vision_boards for delete to authenticated using ((select auth.uid()) = user_id);

-- Images reuse the private `constellation-images` bucket under the person's folder (owner id / board id / content
-- hash), like Bucket List photos. Transparent images (cutouts, stickers) need PNG where the browser can't encode
-- WebP (Safari), because JPEG would flatten the transparency. Same folder rules as before.
update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'] where id = 'constellation-images';
drop policy constellation_upload on storage.objects;
create policy constellation_upload on storage.objects for insert to authenticated with check(
 bucket_id = 'constellation-images'
 and (storage.foldername(name))[1] = (select auth.uid())::text
 and array_length(storage.foldername(name), 1) = 2
 and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
 and storage.filename(name) ~ '^[0-9a-f-]{36}(\.thumb)?\.(webp|jpg|png)$');

-- A duplicated board shares its source's files instead of copying them, so a file can only be removed once no
-- board (and no Constellation card) still uses it.
drop policy constellation_image_remove on storage.objects;
create policy constellation_image_remove on storage.objects for delete to authenticated using(
 bucket_id = 'constellation-images'
 and (storage.foldername(name))[1] = (select auth.uid())::text
 and not exists(select 1 from public.constellation_cards c cross join lateral jsonb_array_elements(c.payload->'images') a where c.user_id = auth.uid() and (a->>'path' = name or a->>'thumbnailPath' = name))
 and not exists(select 1 from public.vision_boards b where b.user_id = (select auth.uid()) and b.asset_paths @> array[name]));
