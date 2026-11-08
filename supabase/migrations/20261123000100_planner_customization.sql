-- Planner Customization (#87). Additive and backward compatible: existing rows keep working unchanged and older
-- clients ignore the new columns. Marks stay visual metadata; custom section content stays Planner-only.

-- 1. Custom Muse Marks: an optional gradient and an optional meaning. `color` keeps a solid fallback (the first
-- gradient stop) so every client can still draw the Mark.
alter table public.planner_marks
 add column gradient jsonb check (gradient is null or (jsonb_typeof(gradient) = 'object' and octet_length(gradient::text) <= 400)),
 add column meaning text check (char_length(meaning) <= 200);

-- 2. Custom section content per day: Freeform Notes get room to write; Checklist and Simple List sections keep their
-- items here. These items are never tasks and are not read by Tasks, Habits or any other module.
alter table public.planner_day_notes
 drop constraint planner_day_notes_body_check,
 add constraint planner_day_notes_body_check check (char_length(body) <= 5000),
 add column items jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60 and octet_length(items::text) <= 30000);

-- 3. The shared section template may now hold hidden sections too, so it allows a few more (and stays small).
alter table public.planner_agenda_layouts
 drop constraint planner_agenda_layouts_sections_check,
 add constraint planner_agenda_layouts_sections_check check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) between 2 and 24 and octet_length(sections::text) <= 100000);

-- 4. The person's customization library: saved Marks and collections, saved colors and gradients, and Saved
-- Sections (templates). One versioned document per person. Inserting a saved section copies it into the layout, so
-- deleting a template never touches the Planner.
create table public.planner_customizations (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 schema_version smallint not null default 1 check (schema_version between 1 and 100),
 library jsonb not null default '{}' check (jsonb_typeof(library) = 'object' and octet_length(library::text) <= 250000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create trigger touch_planner_customizations before update on public.planner_customizations for each row execute function muse_private.touch_collection_record();
alter table public.planner_customizations enable row level security;
revoke all on public.planner_customizations from public, anon, authenticated;
grant select, insert, update, delete on public.planner_customizations to authenticated, service_role;
create policy owner_read on public.planner_customizations for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.planner_customizations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.planner_customizations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.planner_customizations for delete to authenticated using ((select auth.uid()) = user_id);
