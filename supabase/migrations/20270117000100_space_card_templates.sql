-- Mindspace Spaces (Nov 26): reusable information-card templates ("My templates"), usable in any section of any space.
-- Additive: one new owner-only table. A template holds a card's structure only (preset, icon, field definitions and
-- order, display mode and preview fields), never values. Cards made from it keep their own snapshot of the fields, so
-- editing or deleting a template never changes or deletes an existing card.
create table public.list_card_templates (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 80),
 preset text not null default 'info' check (preset in ('flight','transit','stay','place','reservation','shopping','gift','measurement','info')),
 icon text check (icon is null or icon ~ '^[a-z-]{1,24}$'),
 fields jsonb not null default '[]' check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) <= 24 and pg_column_size(fields) <= 16384),
 display jsonb not null default '{}' check (jsonb_typeof(display) = 'object' and pg_column_size(display) <= 2048),
 position integer not null default 0 check (position >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index list_card_templates_owner on public.list_card_templates (user_id, position);
alter table public.list_card_templates enable row level security;
revoke all on public.list_card_templates from public, anon;
grant select, insert, update, delete on public.list_card_templates to authenticated;
create policy owner_all on public.list_card_templates for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
