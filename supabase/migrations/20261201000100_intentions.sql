-- Planner → Intentions (#117): the forward-looking counterpart to Reflections. Additive and owner-only.
-- Intentions never write to other modules. Aspirations, Rituals, Bucket List dreams, Tasks and Agenda events are
-- referenced by id inside the page (with a name snapshot for historical integrity), never copied. Daily Edit's daily
-- intention stays in its own records and is never read or written here.

-- One page per person, period type and period start. Sections (with their content and order) are one versioned
-- document; section content is validated by the app and bounded here.
create table public.intention_pages (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 period text not null check (period in ('week', 'month', 'quarter', 'year')),
 period_start date not null,
 period_end date not null,
 sections jsonb not null default '[]' check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) <= 30 and octet_length(sections::text) <= 200000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 -- Periods line up with Muse's calendar: Monday weeks, calendar months, calendar quarters and calendar years.
 check (case period
  when 'week' then extract(isodow from period_start) = 1 and period_end = period_start + 6
  when 'month' then extract(day from period_start) = 1 and period_end = (period_start + interval '1 month' - interval '1 day')::date
  when 'quarter' then extract(day from period_start) = 1 and extract(month from period_start) in (1, 4, 7, 10) and period_end = (period_start + interval '3 months' - interval '1 day')::date
  when 'year' then extract(month from period_start) = 1 and extract(day from period_start) = 1 and period_end = (period_start + interval '1 year' - interval '1 day')::date
 end),
 unique (user_id, period, period_start)
);
create index intention_pages_owner on public.intention_pages(user_id, period, period_start desc);

create trigger touch_intention_pages before update on public.intention_pages for each row execute function muse_private.touch_collection_record();
alter table public.intention_pages enable row level security;
revoke all on public.intention_pages from public, anon, authenticated;
grant select, insert, update, delete on public.intention_pages to authenticated, service_role;
create policy owner_read on public.intention_pages for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.intention_pages for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.intention_pages for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.intention_pages for delete to authenticated using ((select auth.uid()) = user_id);
