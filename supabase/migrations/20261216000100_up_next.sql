-- Books: Up Next (Phase 3). Additive and owner-only.
--
-- Up Next is a suggested reading queue of at most three books: slot 0, 1 or 2 holds a book id, or is simply absent.
-- It stores only which book sits where. A book's reading status, progress and sessions stay on the book; Up Next
-- never creates a second status model. A book can sit in at most one slot. Deleting a book frees its slot.
-- Reading Plan membership is separate and untouched: starting a book leaves its plans exactly as they are.

create table public.up_next_slots (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 slot smallint not null check (slot between 0 and 2),
 book_id uuid not null,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id, slot),
 constraint up_next_one_slot_per_book unique (user_id, book_id),
 constraint up_next_book_owner foreign key (user_id, book_id) references public.whimsy_books (user_id, id) on delete cascade
);
create trigger touch_up_next_slots before update on public.up_next_slots for each row execute function muse_private.touch_collection_record();
alter table public.up_next_slots enable row level security;
revoke all on public.up_next_slots from public, anon, authenticated;
grant select, insert, update, delete on public.up_next_slots to authenticated, service_role;
create policy owner_read on public.up_next_slots for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.up_next_slots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.up_next_slots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.up_next_slots for delete to authenticated using ((select auth.uid()) = user_id);

-- Save the whole queue in one step: element 1 is slot 0, element 2 is slot 1, element 3 is slot 2; null leaves a slot empty.
-- One transaction, so reordering, replacing and removing can never leave a half-saved queue. SECURITY INVOKER: RLS applies.
create function public.save_up_next(p_book_ids uuid[])
returns void
language plpgsql set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); i integer;
begin
 if uid is null then raise exception 'Sign in to choose your next reads' using errcode = '28000'; end if;
 if coalesce(array_length(p_book_ids, 1), 0) <> 3 then raise exception 'Up Next has exactly three slots' using errcode = '22023'; end if;
 if (select count(*) from unnest(p_book_ids) b where b is not null) <> (select count(distinct b) from unnest(p_book_ids) b where b is not null) then
  raise exception 'A book can only be in one Up Next slot' using errcode = '23505';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text || 'up-next', 0));
 delete from public.up_next_slots where user_id = uid;
 for i in 1..3 loop
  if p_book_ids[i] is not null then
   insert into public.up_next_slots (user_id, slot, book_id) values (uid, i - 1, p_book_ids[i]);
  end if;
 end loop;
end $$;
revoke all on function public.save_up_next(uuid[]) from public, anon;
grant execute on function public.save_up_next(uuid[]) to authenticated, service_role;
