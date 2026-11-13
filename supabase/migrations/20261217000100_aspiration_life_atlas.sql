-- Aspirations 2.0 foundation (#82). Existing free-text categories remain untouched;
-- a person can connect an aspiration to their own Reflection life areas explicitly.
alter table public.aspirations add constraint aspirations_owner_id_unique unique (user_id, id);
alter table public.aspirations add column planning_style text
 check (planning_style is null or planning_style in ('achievement','target','practice','exploration'));
alter table public.aspirations add column mantra text check (mantra is null or char_length(mantra) <= 500);
alter table public.aspirations add column cover jsonb check (cover is null or (jsonb_typeof(cover) = 'object' and octet_length(cover::text) <= 3000));
create function muse_private.aspiration_cover_owner() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.cover is not null and (coalesce(new.cover->>'path','') not like new.user_id::text || '/' || new.id::text || '/%' or coalesce(new.cover->>'thumbnailPath','') not like new.user_id::text || '/' || new.id::text || '/%') then
  raise exception 'Cover images must belong to this aspiration' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function muse_private.aspiration_cover_owner() from public, anon, authenticated;
create trigger aspiration_cover_owner before insert or update of cover on public.aspirations for each row execute function muse_private.aspiration_cover_owner();
alter table public.aspirations add column target_period text
 check (target_period is null or (target_period ~ '^[0-9]{4}(-([0][1-9]|1[0-2])|/[0-9]{4})?$' and left(target_period,4) <> '0000' and (position('/' in target_period)=0 or (right(target_period,4) <> '0000' and left(target_period,4) <= right(target_period,4)))));
alter table public.aspirations add constraint aspiration_one_target_precision check (target_date is null or target_period is null);
alter table public.aspirations drop constraint aspirations_timeframe_check;
alter table public.aspirations add constraint aspirations_timeframe_check
 check (timeframe in ('month','quarter','year','custom','someday','ongoing','none'));
alter table public.aspirations drop constraint aspirations_status_check;
alter table public.aspirations add constraint aspirations_status_check
 check (status in ('planned','active','paused','completed','archived','discontinued'));

create table public.aspiration_life_areas (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 aspiration_id uuid not null,
 area_id uuid not null,
 is_primary boolean not null default false,
 created_at timestamptz not null default now(),
 primary key (user_id, aspiration_id, area_id),
 foreign key (user_id, aspiration_id) references public.aspirations (user_id, id) on delete cascade,
 foreign key (user_id, area_id) references public.life_areas (user_id, id) on delete restrict
);
create unique index aspiration_one_primary_area on public.aspiration_life_areas (user_id, aspiration_id) where is_primary;
create index aspiration_life_areas_by_area on public.aspiration_life_areas (user_id, area_id);

create table public.aspiration_books (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 aspiration_id uuid not null,
 book_id uuid,
 book_name text not null check (char_length(btrim(book_name)) between 1 and 500),
 created_at timestamptz not null default now(),
 foreign key (user_id, aspiration_id) references public.aspirations (user_id,id) on delete cascade,
 foreign key (user_id, book_id) references public.whimsy_books (user_id,id) on delete set null (book_id)
);
create unique index aspiration_books_one_link on public.aspiration_books (user_id,aspiration_id,book_id) where book_id is not null;

-- Meaningful changes only; journal notes and milestones remain in their existing homes.
create table public.aspiration_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 aspiration_id uuid not null,
 kind text not null check (kind in ('created','status','target_date','target_period')),
 before_value text,
 after_value text,
 occurred_at timestamptz not null default now(),
 foreign key (user_id, aspiration_id) references public.aspirations (user_id, id) on delete cascade
);
create index aspiration_events_journey on public.aspiration_events (user_id, aspiration_id, occurred_at);
create function muse_private.record_aspiration_event() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
  insert into public.aspiration_events (user_id,aspiration_id,kind) values (new.user_id,new.id,'created');
 else
  if old.status is distinct from new.status then
   insert into public.aspiration_events (user_id,aspiration_id,kind,before_value,after_value) values (new.user_id,new.id,'status',old.status,new.status);
  end if;
  if old.target_date is distinct from new.target_date then
   insert into public.aspiration_events (user_id,aspiration_id,kind,before_value,after_value) values (new.user_id,new.id,'target_date',old.target_date::text,new.target_date::text);
  end if;
  if old.target_period is distinct from new.target_period then
   insert into public.aspiration_events (user_id,aspiration_id,kind,before_value,after_value) values (new.user_id,new.id,'target_period',old.target_period,new.target_period);
  end if;
 end if;
 return new;
end $$;
revoke all on function muse_private.record_aspiration_event() from public, anon, authenticated;
create trigger aspiration_meaningful_events after insert or update on public.aspirations for each row execute function muse_private.record_aspiration_event();

-- Change the primary association atomically; keep the previous area as a secondary.
create function public.set_aspiration_primary_area(p_aspiration_id uuid, p_area_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
 if not exists (select 1 from public.aspirations where id = p_aspiration_id and user_id = (select auth.uid())) then
  raise exception 'Aspiration unavailable' using errcode = '42501';
 end if;
 update public.aspiration_life_areas set is_primary = false
  where user_id = (select auth.uid()) and aspiration_id = p_aspiration_id and is_primary;
 if p_area_id is not null then
  insert into public.aspiration_life_areas (aspiration_id, area_id, is_primary)
   values (p_aspiration_id, p_area_id, true)
   on conflict (user_id, aspiration_id, area_id) do update set is_primary = true;
 end if;
end $$;
revoke all on function public.set_aspiration_primary_area(uuid, uuid) from public, anon;
grant execute on function public.set_aspiration_primary_area(uuid, uuid) to authenticated;

-- A plan is independent of target dates. Snapshots preserve what was chosen even
-- if the live aspiration or area is later renamed or deleted.
alter table public.vision_boards add constraint vision_boards_owner_id_unique unique (user_id,id);
create table public.aspiration_year_plans (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 year integer not null check (year between 1 and 9999),
 theme text not null default '' check (char_length(theme) <= 500),
 vision_board_id uuid,
 vision_board_name text check (vision_board_name is null or char_length(vision_board_name) <= 120),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, year),
 foreign key (user_id, vision_board_id) references public.vision_boards (user_id,id) on delete set null (vision_board_id)
);
create trigger touch_aspiration_year_plan before update on public.aspiration_year_plans for each row execute function muse_private.touch_collection_record();

create table public.aspiration_year_visions (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 year integer not null,
 area_id uuid not null,
 vision text not null default '' check (char_length(vision) <= 2000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, year, area_id),
 foreign key (user_id, year) references public.aspiration_year_plans (user_id, year) on delete cascade,
 foreign key (user_id, area_id) references public.life_areas (user_id, id) on delete restrict
);
create trigger touch_aspiration_year_vision before update on public.aspiration_year_visions for each row execute function muse_private.touch_collection_record();

create table public.aspiration_year_priorities (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 year integer not null,
 aspiration_id uuid,
 aspiration_name text not null check (char_length(btrim(aspiration_name)) between 1 and 120),
 area_id uuid,
 area_name text not null check (char_length(btrim(area_name)) between 1 and 40),
 note text not null default '' check (char_length(note) <= 2000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 removed_at timestamptz,
 foreign key (user_id, year) references public.aspiration_year_plans (user_id, year) on delete cascade,
 foreign key (user_id, aspiration_id) references public.aspirations (user_id, id) on delete set null (aspiration_id),
 foreign key (user_id, area_id) references public.life_areas (user_id, id) on delete set null (area_id)
);
create unique index aspiration_year_priority_active on public.aspiration_year_priorities (user_id, year, aspiration_id) where removed_at is null and aspiration_id is not null;
create index aspiration_year_priorities_plan on public.aspiration_year_priorities (user_id, year);
create trigger touch_aspiration_year_priority before update on public.aspiration_year_priorities for each row execute function muse_private.touch_collection_record();

do $$ declare t text; begin
 foreach t in array array['aspiration_life_areas', 'aspiration_books', 'aspiration_year_plans', 'aspiration_year_visions', 'aspiration_year_priorities'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from public, anon, authenticated', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
 end loop;
end $$;
alter table public.aspiration_events enable row level security;
revoke all on public.aspiration_events from public, anon, authenticated;
grant select on public.aspiration_events to authenticated;
grant select, insert, update, delete on public.aspiration_events to service_role;
create policy owner_read on public.aspiration_events for select to authenticated using ((select auth.uid()) = user_id);
