-- Aspirations (#54): the longer-term goals that live beside Habits in Rituals. Additive and owner-only.
-- An aspiration owns its own target, milestones and journal. Connected progress (reading, tasks, movement…) is read
-- from the authoritative module at display time and never copied here; links to habits and tasks are ids only, so
-- removing a link or an aspiration never touches the linked records.
create table public.aspirations (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check (length(btrim(title)) between 1 and 120),
 description text check (description is null or length(description) <= 2000),
 motivation text check (motivation is null or length(motivation) <= 1000),
 category text not null default 'Personal' check (length(btrim(category)) between 1 and 40),
 icon text check (icon is null or length(icon) between 1 and 16),
 accent text check (accent is null or accent in ('primary','secondary','pop','warm','info') or accent ~ '^#[0-9a-fA-F]{6}$'),
 start_date date not null,
 target_date date check (target_date is null or target_date >= start_date),
 timeframe text not null default 'custom' check (timeframe in ('month','quarter','year','custom','someday')),
 status text not null default 'active' check (status in ('planned','active','paused','completed','archived')),
 progress_kind text not null check (progress_kind in ('numeric','manual','milestones','binary','connected')),
 target numeric check (target is null or (target > 0 and target <= 1000000000)),
 unit text check (unit is null or length(unit) <= 24),
 connection jsonb check (connection is null or (jsonb_typeof(connection) = 'object' and connection->>'kind' in ('metric','reading-challenge'))),
 milestones jsonb not null default '[]' check (jsonb_typeof(milestones) = 'array' and jsonb_array_length(milestones) <= 100),
 ritual_ids text[] not null default '{}' check (cardinality(ritual_ids) <= 30),
 task_ids text[] not null default '{}' check (cardinality(task_ids) <= 100),
 reflection text check (reflection is null or length(reflection) <= 4000),
 completed_on date,
 celebrated text[] not null default '{}' check (cardinality(celebrated) <= 200),
 position integer not null default 0,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (progress_kind <> 'numeric' or target is not null),
 check (progress_kind <> 'connected' or connection is not null),
 check (status <> 'completed' or completed_on is not null),
 check (completed_on is null or status in ('completed','archived'))
);
create index aspirations_owner on public.aspirations (user_id, status, position);

-- The progress journal: dated updates are added, never rewritten, so history is preserved.
create table public.aspiration_updates (
 id uuid primary key,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 aspiration_id uuid not null references public.aspirations on delete cascade,
 recorded_on date not null,
 value numeric check (value is null or (value >= 0 and value <= 1000000000)),
 note text check (note is null or length(note) <= 1000),
 milestone_id text check (milestone_id is null or length(milestone_id) <= 64),
 created_at timestamptz not null default now(),
 check (value is not null or note is not null or milestone_id is not null)
);
create index aspiration_updates_owner on public.aspiration_updates (user_id, aspiration_id, recorded_on);

-- An update must belong to an aspiration owned by the same person.
create function muse_private.aspiration_update_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.aspirations a where a.id = new.aspiration_id and a.user_id = new.user_id) then
  raise exception 'Aspiration unavailable' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.aspiration_update_owner() from public, anon, authenticated;
create trigger aspiration_update_owner before insert on public.aspiration_updates for each row execute function muse_private.aspiration_update_owner();
-- Same revision bump as Collections records.
create trigger touch_aspiration before update on public.aspirations for each row execute function muse_private.touch_collection_record();

alter table public.aspirations enable row level security;
alter table public.aspiration_updates enable row level security;
revoke all on public.aspirations, public.aspiration_updates from public, anon, authenticated;
grant select, insert, update, delete on public.aspirations to authenticated, service_role;
grant select, insert, delete on public.aspiration_updates to authenticated;
grant select, insert, update, delete on public.aspiration_updates to service_role;
create policy owner_read on public.aspirations for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.aspirations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.aspirations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.aspirations for delete to authenticated using ((select auth.uid()) = user_id);
create policy owner_read on public.aspiration_updates for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.aspiration_updates for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_delete on public.aspiration_updates for delete to authenticated using ((select auth.uid()) = user_id);
