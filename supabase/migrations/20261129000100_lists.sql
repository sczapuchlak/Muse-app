-- Mindspace Lists (#110). Additive: four new owner-only tables; nothing existing changes.
--
-- A list holds sections and items. One-off items keep their completion on the item. A scheduled item keeps ONE
-- record; `list_item_events` stores only what actually happened in a period (completed, skipped or rescheduled), with
-- that period's dates, so history stays meaningful after the schedule changes. Missed periods are derived, never
-- stored, and nothing is generated ahead of time. A period can hold at most one completion and one skip.
-- Templates are lists with `is_template`; using one copies it, so copies never stay connected to their source.

create function muse_private.valid_list_schedule(s jsonb) returns boolean language sql immutable set search_path = '' as $$
 select s is null or (
  jsonb_typeof(s) = 'object'
  and s->>'mode' in ('flexible','preferred','date')
  and (s->>'anchor') ~ '^\d{4}-\d{2}-\d{2}$'
  and (s->>'since') ~ '^\d{4}-\d{2}-\d{2}$'
  and s->'rule' is not null and s->'rule' <> 'null'::jsonb
  and muse_private.valid_recurrence_rule(s->'rule'))
$$;
revoke all on function muse_private.valid_list_schedule(jsonb) from public, anon;

create function muse_private.valid_list_fields(f jsonb) returns boolean language sql immutable set search_path = '' as $$
 select jsonb_typeof(f) = 'array' and jsonb_array_length(f) <= 8 and not exists (
  select 1 from jsonb_array_elements(f) d
  where jsonb_typeof(d) <> 'object'
   or coalesce(d->>'id','') !~ '^[a-z0-9-]{1,40}$'
   or char_length(coalesce(d->>'name','')) not between 1 and 40
   or d->>'type' not in ('text','number','date','select','url','checkbox')
   or (d ? 'options' and (jsonb_typeof(d->'options') <> 'array' or jsonb_array_length(d->'options') > 20)))
$$;
revoke all on function muse_private.valid_list_fields(jsonb) from public, anon;

-- Lists are written directly by their owner (RLS), so the pure validators used in CHECK constraints must be
-- executable by signed-in users (same convention as valid_time_zone).
grant execute on function muse_private.valid_list_schedule(jsonb), muse_private.valid_list_fields(jsonb), muse_private.valid_recurrence_rule(jsonb) to authenticated;

create table public.lists (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 120),
 description text check (description is null or char_length(description) <= 500),
 icon text check (icon is null or char_length(icon) between 1 and 40),
 accent text not null default 'primary' check (accent in ('primary','secondary','pop','warm','info')),
 preset text not null default 'checklist' check (preset in ('checklist','scheduled','project')),
 is_template boolean not null default false,
 pinned boolean not null default false,
 archived_at timestamptz,
 start_date date,
 end_date date check (end_date is null or start_date is null or end_date >= start_date),
 fields jsonb not null default '[]' check (muse_private.valid_list_fields(fields)),
 table_view boolean not null default false,
 show_in_daily boolean not null default false,
 show_in_agenda boolean not null default false,
 aspiration_id uuid,
 position integer not null default 0 check (position >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id)
);
create index lists_owner on public.lists (user_id, archived_at, updated_at desc);

create table public.list_sections (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 list_id uuid not null,
 title text not null check (char_length(btrim(title)) between 1 and 80),
 icon text check (icon is null or char_length(icon) between 1 and 40),
 accent text check (accent is null or accent in ('primary','secondary','pop','warm','info')),
 position integer not null default 0 check (position >= 0),
 collapsed boolean not null default false,
 unique (user_id, id),
 foreign key (user_id, list_id) references public.lists (user_id, id) on delete cascade
);
create index list_sections_list on public.list_sections (list_id, position);

create table public.list_items (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 list_id uuid not null,
 section_id uuid,
 title text not null check (char_length(btrim(title)) between 1 and 300),
 notes text check (notes is null or char_length(notes) <= 4000),
 position integer not null default 0 check (position >= 0),
 priority text check (priority is null or priority in ('low','medium','high')),
 due_date date,
 completed_at timestamptz,
 completed_on date,
 schedule jsonb check (muse_private.valid_list_schedule(schedule)),
 field_values jsonb not null default '{}' check (jsonb_typeof(field_values) = 'object' and pg_column_size(field_values) <= 8192),
 link_kind text check (link_kind is null or link_kind in ('task','aspiration','bucket','media')),
 link_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((link_kind is null) = (link_id is null)),
 check (schedule is null or completed_at is null),
 unique (user_id, id),
 foreign key (user_id, list_id) references public.lists (user_id, id) on delete cascade,
 foreign key (user_id, section_id) references public.list_sections (user_id, id) on delete set null (section_id)
);
create index list_items_list on public.list_items (list_id, section_id, position);
create index list_items_link on public.list_items (user_id, link_kind, link_id) where link_id is not null;

create table public.list_item_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 list_id uuid not null,
 item_id uuid not null,
 kind text not null check (kind in ('completed','skipped','rescheduled')),
 period_start date not null,
 period_end date not null check (period_end >= period_start),
 moved_to date,
 occurred_on date,
 recorded_at timestamptz not null default now(),
 source text not null default 'list' check (source in ('list','task')),
 check ((kind = 'rescheduled') = (moved_to is not null)),
 check (kind <> 'completed' or occurred_on is not null),
 unique (item_id, period_start, kind),
 foreign key (user_id, list_id) references public.lists (user_id, id) on delete cascade,
 foreign key (user_id, item_id) references public.list_items (user_id, id) on delete cascade
);
create index list_item_events_item on public.list_item_events (item_id, period_start desc);

alter table public.lists enable row level security;
alter table public.list_sections enable row level security;
alter table public.list_items enable row level security;
alter table public.list_item_events enable row level security;
revoke all on public.lists, public.list_sections, public.list_items, public.list_item_events from public, anon;
grant select, insert, update, delete on public.lists, public.list_sections, public.list_items, public.list_item_events to authenticated;

create policy owner_all on public.lists for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_all on public.list_sections for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_all on public.list_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_all on public.list_item_events for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Keep the library's "last updated" honest: any change inside a list touches the list.
create function muse_private.touch_list() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 update public.lists set updated_at = now() where id = coalesce(new.list_id, old.list_id) and user_id = coalesce(new.user_id, old.user_id);
 return null;
end $$;
revoke all on function muse_private.touch_list() from public, anon, authenticated;
create trigger list_sections_touch after insert or update or delete on public.list_sections for each row execute function muse_private.touch_list();
create trigger list_items_touch after insert or update or delete on public.list_items for each row execute function muse_private.touch_list();
create trigger list_item_events_touch after insert or update or delete on public.list_item_events for each row execute function muse_private.touch_list();
