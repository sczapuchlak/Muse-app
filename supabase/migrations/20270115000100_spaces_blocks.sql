-- Mindspace Spaces V1 (Lists evolve into Spaces). Additive only: existing lists, sections, items, schedules and
-- history are untouched and keep their ids.
--
-- A space (a `lists` row) holds sections; a section holds content blocks in order: a checklist, formatted notes, photos,
-- a saved link, a heading, or an information card (a small set of labelled fields from a reusable preset, such as a
-- flight, a stay or a measurement). Checklist items stay in `list_items`; `block_id` says which checklist they belong to.
-- Items written before blocks existed (block_id null) still show, in their section's first checklist, so nothing has
-- to be rewritten. Optional cover photo on the space itself.

create function muse_private.valid_list_block(k text, d jsonb) returns boolean language sql immutable set search_path = '' as $$
 select jsonb_typeof(d) = 'object' and pg_column_size(d) <= 262144 and case k
  when 'link' then coalesce(d->>'url', '') = '' or ((d->>'url') ~* '^https?://[^\s]+$' and char_length(d->>'url') <= 2048)
  when 'note' then d->'doc' is null or (jsonb_typeof(d->'doc') = 'object' and d->'doc'->>'type' = 'doc')
  when 'images' then d->'images' is null or (jsonb_typeof(d->'images') = 'array' and jsonb_array_length(d->'images') <= 40)
  when 'card' then d->'fields' is null or (jsonb_typeof(d->'fields') = 'array' and jsonb_array_length(d->'fields') <= 24)
  when 'heading' then char_length(coalesce(d->>'text', '')) <= 500
  else true end
$$;
revoke all on function muse_private.valid_list_block(text, jsonb) from public, anon;
-- Blocks are written directly by their owner (RLS), so the CHECK validator must be executable by signed-in users.
grant execute on function muse_private.valid_list_block(text, jsonb) to authenticated;

create table public.list_blocks (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 list_id uuid not null,
 section_id uuid,
 kind text not null check (kind in ('checklist', 'note', 'images', 'link', 'heading', 'card')),
 position integer not null default 0 check (position >= 0),
 width text not null default 'full' check (width in ('full', 'half')),
 data jsonb not null default '{}' check (muse_private.valid_list_block(kind, data)),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id),
 foreign key (user_id, list_id) references public.lists (user_id, id) on delete cascade,
 -- Deleting a section keeps its blocks, like its items: they move to the space's top area.
 foreign key (user_id, section_id) references public.list_sections (user_id, id) on delete set null (section_id)
);
create index list_blocks_list on public.list_blocks (list_id, section_id, position);

alter table public.list_blocks enable row level security;
revoke all on public.list_blocks from public, anon;
grant select, insert, update, delete on public.list_blocks to authenticated;
create policy owner_all on public.list_blocks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger list_blocks_touch after insert or update or delete on public.list_blocks for each row execute function muse_private.touch_list();

-- Which checklist an item belongs to. Nullable: older items keep null and show in their section's first checklist.
alter table public.list_items add column block_id uuid;
alter table public.list_items add constraint list_items_block_fk foreign key (user_id, block_id) references public.list_blocks (user_id, id) on delete set null (block_id);
create index list_items_block on public.list_items (block_id) where block_id is not null;

-- An optional cover photo (private storage path + framing), shown in the space's header and library card.
alter table public.lists add column cover jsonb check (cover is null or (jsonb_typeof(cover) = 'object' and pg_column_size(cover) <= 4096));
