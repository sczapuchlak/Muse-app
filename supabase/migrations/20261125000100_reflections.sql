-- Planner → Reflections (#99): a modular memory book. Additive and owner-only. Reflections never write to Planner,
-- Daily Edit, Mood, Bookshelf, Collections or Insights; media mentioned in a review is the review's own content.

-- 1. One review per person, period type and period start. The layout and its modules (with their content) are one
-- versioned document; module content is validated by the app and bounded here.
create table public.reflection_reviews (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 period text not null check (period in ('week', 'month', 'year')),
 period_start date not null,
 period_end date not null,
 layout text not null check (layout ~ '^[a-z][a-z0-9-]{1,39}$'),
 modules jsonb not null default '[]' check (jsonb_typeof(modules) = 'array' and jsonb_array_length(modules) <= 40 and octet_length(modules::text) <= 400000),
 status text not null default 'draft' check (status in ('draft', 'complete')),
 title text not null default '' check (char_length(title) <= 120),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (period_end >= period_start and period_end - period_start <= 366),
 unique (user_id, period, period_start)
);
create index reflection_reviews_owner on public.reflection_reviews(user_id, period, period_start desc);

-- 2. Level 10 Life areas: stable ids so a renamed area keeps its history's meaning. Areas are archived, never
-- deleted while ratings point at them.
create table public.life_areas (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 label text not null check (char_length(btrim(label)) between 1 and 40),
 color text not null default '#8050cf' check (color ~ '^#[0-9a-fA-F]{6}$'),
 position integer not null default 0 check (position between 0 and 100),
 archived_at timestamptz,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id),
 -- One area per slot: makes seeding the ten defaults idempotent when two tabs open at once.
 unique (user_id, position)
);

-- 3. Level 10 Life ratings: one per area and period. Weekly, monthly and yearly ratings are independent assessments
-- (never computed from one another), structured for future trends.
create table public.life_ratings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 area_id uuid not null,
 period text not null check (period in ('week', 'month', 'year')),
 period_start date not null,
 period_end date not null,
 rating smallint not null check (rating between 1 and 10),
 note text not null default '' check (char_length(note) <= 500),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (period_end >= period_start and period_end - period_start <= 366),
 unique (user_id, area_id, period, period_start),
 foreign key (user_id, area_id) references public.life_areas (user_id, id) on delete restrict
);
create index life_ratings_trend on public.life_ratings(user_id, area_id, period, period_start);

do $$ declare t text; begin
 foreach t in array array['reflection_reviews', 'life_areas', 'life_ratings'] loop
  execute format('create trigger touch_%s before update on public.%I for each row execute function muse_private.touch_collection_record()', t, t);
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from public, anon, authenticated', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
 end loop;
end $$;
