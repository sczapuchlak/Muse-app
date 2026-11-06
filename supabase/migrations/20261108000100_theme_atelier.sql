-- Theme Atelier. Additive: two owner-only tables, no existing table or record is changed.
-- atelier_themes: a person's remixes and drafts (official themes stay in code and are never stored or modified).
-- appearance_preferences: the theme a person has applied, synced across their signed-in devices.
-- Definitions are validated again in the app before any value reaches CSS; the database bounds size and shape.

create table public.atelier_themes (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 60),
 base_theme text not null check (base_theme ~ '^[a-z0-9-]{1,40}$'),
 status text not null check (status in ('draft','saved')),
 schema_version integer not null check (schema_version = 1),
 definition jsonb not null check (jsonb_typeof(definition) = 'object' and pg_column_size(definition) <= 65536),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create index atelier_themes_owner_recent on public.atelier_themes(user_id, updated_at desc);

create table public.appearance_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 theme text not null check (theme ~ '^[a-z0-9-]{1,40}$'),
 material text not null check (material in ('crystal','frosted')),
 atelier_theme_id uuid,
 atelier_theme jsonb check (atelier_theme is null or (jsonb_typeof(atelier_theme) = 'object' and pg_column_size(atelier_theme) <= 65536)),
 updated_at timestamptz not null
);

-- A generous ceiling keeps one account from storing unbounded theme data.
create function muse_private.limit_atelier_themes() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (select count(*) from public.atelier_themes where user_id = new.user_id) >= 200 then
  raise exception 'Theme Atelier holds up to 200 themes. Delete one to save another.' using errcode = '54000';
 end if;
 return new;
end $$;
revoke all on function muse_private.limit_atelier_themes() from public, anon, authenticated;
create trigger atelier_themes_limit before insert on public.atelier_themes for each row execute function muse_private.limit_atelier_themes();

create function muse_private.touch_atelier_theme() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); new.created_at := old.created_at; new.user_id := old.user_id; return new; end $$;
revoke all on function muse_private.touch_atelier_theme() from public, anon, authenticated;
create trigger atelier_themes_touch before update on public.atelier_themes for each row execute function muse_private.touch_atelier_theme();

do $$declare t text;begin foreach t in array array['atelier_themes','appearance_preferences'] loop
 execute format('alter table public.%I enable row level security', t);
 execute format('revoke all on public.%I from anon, authenticated', t);
 execute format('grant select, insert, update on public.%I to authenticated', t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
end loop;end $$;
grant delete on public.atelier_themes to authenticated;
create policy owner_delete on public.atelier_themes for delete to authenticated using ((select auth.uid()) = user_id);
grant select on public.atelier_themes, public.appearance_preferences to service_role;
