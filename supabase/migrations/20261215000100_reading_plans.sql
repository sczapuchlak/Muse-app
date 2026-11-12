-- Books: Reading Plans (Phase 2). Additive and owner-only.
--
-- A plan is not a table of its own. It is the ordered set of rows sharing (period_kind, period):
--   * period_kind 'month' with period 'YYYY-MM', or 'year' with period 'YYYY'.
-- One book may appear once per period, in any number of monthly plans and in a yearly plan at the same time.
-- Membership is the only thing stored here: a book's reading status, rating, dates and sessions stay on the book
-- and its sessions, so plans always show the book's real status and changing plans never touches reading history.
-- Deleting a book removes it from every plan (the book is the authoritative record). Nothing rolls over by itself.
-- Phase 3 (Up Next / Reading Roulette) reads these rows to pick from the current month, the year, or the Library.

create table public.reading_plan_entries (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 id uuid not null default gen_random_uuid(),
 period_kind text not null check (period_kind in ('month', 'year')),
 period text not null,
 book_id uuid not null,
 position integer not null check (position >= 0),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, id),
 constraint reading_plan_period_shape check (
  (period_kind = 'month' and period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
  or (period_kind = 'year' and period ~ '^[0-9]{4}$')),
 constraint reading_plan_one_book_per_period unique (user_id, period_kind, period, book_id),
 constraint reading_plan_book_owner foreign key (user_id, book_id) references public.whimsy_books (user_id, id) on delete cascade
);
create index reading_plan_entries_period on public.reading_plan_entries (user_id, period_kind, period, position);
create index reading_plan_entries_book on public.reading_plan_entries (user_id, book_id);

create trigger touch_reading_plan_entries before update on public.reading_plan_entries for each row execute function muse_private.touch_collection_record();
alter table public.reading_plan_entries enable row level security;
revoke all on public.reading_plan_entries from public, anon, authenticated;
grant select, insert, update, delete on public.reading_plan_entries to authenticated, service_role;
create policy owner_read on public.reading_plan_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.reading_plan_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.reading_plan_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.reading_plan_entries for delete to authenticated using ((select auth.uid()) = user_id);

-- Append books to a plan in the order given, skipping any already in it. SECURITY INVOKER: row level security applies.
create function public.add_reading_plan_books(p_kind text, p_period text, p_book_ids uuid[])
returns setof public.reading_plan_entries
language plpgsql set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); next_position integer;
begin
 if uid is null then raise exception 'Sign in to plan your reading' using errcode = '28000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text || p_kind || p_period, 0));
 select coalesce(max(position) + 1, 0) into next_position from public.reading_plan_entries where user_id = uid and period_kind = p_kind and period = p_period;
 return query
  with fresh as (
   select b.book_id, b.ord from unnest(p_book_ids) with ordinality as b(book_id, ord)
   where not exists (select 1 from public.reading_plan_entries e where e.user_id = uid and e.period_kind = p_kind and e.period = p_period and e.book_id = b.book_id)
   and exists (select 1 from public.whimsy_books w where w.user_id = uid and w.id = b.book_id)
  ), numbered as (select book_id, next_position + (row_number() over (order by ord) - 1)::integer as pos from fresh)
  insert into public.reading_plan_entries (user_id, period_kind, period, book_id, position)
  select uid, p_kind, p_period, book_id, pos from numbered returning *;
end $$;

-- Save a plan's manual order: the given books take positions 0..n-1 in that order (books not listed keep their place after them).
create function public.reorder_reading_plan(p_kind text, p_period text, p_book_ids uuid[])
returns void
language plpgsql set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Sign in to plan your reading' using errcode = '28000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text || p_kind || p_period, 0));
 with listed as (select book_id, (ord - 1)::integer as pos from unnest(p_book_ids) with ordinality as b(book_id, ord)),
 rest as (select e.book_id, (select count(*) from listed)::integer + (row_number() over (order by e.position, e.created_at) - 1)::integer as pos
          from public.reading_plan_entries e where e.user_id = uid and e.period_kind = p_kind and e.period = p_period and e.book_id <> all (p_book_ids)),
 target as (select * from listed union all select * from rest)
 update public.reading_plan_entries e set position = t.pos
 from target t where e.user_id = uid and e.period_kind = p_kind and e.period = p_period and e.book_id = t.book_id and e.position is distinct from t.pos;
end $$;

-- Move one book from a period to another: it joins the end of the target (if not already there) and leaves the source.
create function public.move_reading_plan_book(p_kind text, p_from text, p_to text, p_book_id uuid)
returns void
language plpgsql set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Sign in to plan your reading' using errcode = '28000'; end if;
 if p_from = p_to then return; end if;
 perform public.add_reading_plan_books(p_kind, p_to, array[p_book_id]);
 delete from public.reading_plan_entries where user_id = uid and period_kind = p_kind and period = p_from and book_id = p_book_id;
end $$;

revoke all on function public.add_reading_plan_books(text, text, uuid[]), public.reorder_reading_plan(text, text, uuid[]), public.move_reading_plan_book(text, text, text, uuid) from public, anon;
grant execute on function public.add_reading_plan_books(text, text, uuid[]), public.reorder_reading_plan(text, text, uuid[]), public.move_reading_plan_book(text, text, text, uuid) to authenticated, service_role;
